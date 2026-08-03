import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { readFile } from "node:fs/promises";
import { validateItemIntegrity } from "../../src/search.js";
import { loadCatalogs } from "./fixtures.mjs";

let catalogs;
let metadata;

before(async () => {
  catalogs = await loadCatalogs();
  metadata = JSON.parse(await readFile(new URL("../../meta.json", import.meta.url), "utf8"));
});

describe("redaktioneller Datenvertrag", () => {
  test("Versionen und Datenstand sind explizit", () => {
    assert.match(catalogs.items.contentVersion, /^\d{4}\.\d{2}\.\d{2}-\d+$/);
    assert.match(catalogs.items.contentDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(catalogs.items.schemaVersion, 1);
    assert.equal(metadata.contentVersion, catalogs.items.contentVersion);
    assert.equal(metadata.contentDate, catalogs.items.contentDate);
  });

  test("IDs sind eindeutig und Pflichtfelder vollständig", () => {
    const ids = new Set();
    for (const item of catalogs.items.items) {
      assert.ok(!ids.has(item.id), `doppelte Item-ID: ${item.id}`);
      ids.add(item.id);
      for (const field of [
        "name",
        "category",
        "certainty",
        "answer",
        "reason",
        "localVariation",
        "reviewedAt",
        "reviewDue"
      ]) {
        assert.ok(item[field], `${item.id}: ${field} fehlt`);
      }
      assert.ok(item.aliases.length >= 2, `${item.id}: zu wenige Synonyme`);
      assert.ok(item.keywords.length >= 2, `${item.id}: zu wenige Suchwörter`);
      assert.ok(item.steps.length >= 2, `${item.id}: zu wenige Handlungsschritte`);
      assert.ok(item.route.type && item.route.label, `${item.id}: Entsorgungsweg unvollständig`);
    }
  });

  test("häufige kleine Alltagsabfälle sind redaktionell abgedeckt", () => {
    const ids = new Set(catalogs.items.items.map((item) => item.id));
    for (const id of [
      "rubber-household-item",
      "car-tire",
      "vacuum-waste",
      "pet-litter",
      "hygiene-paper",
      "manual-toothbrush",
      "cleaning-sponge",
      "writing-utensils",
      "photos",
      "sports-ball",
      "contact-lenses",
      "plastic-household-item",
      "food-and-wrapper",
      "painting",
      "poster"
    ]) {
      assert.ok(ids.has(id), `${id} fehlt im Alltagsbestand`);
    }
  });

  test("kuratierten Suchalternativen verweisen nur auf vorhandene Einträge", () => {
    const ids = new Set(catalogs.items.items.map((item) => item.id));
    for (const item of catalogs.items.items) {
      for (const alternative of item.guidedAlternatives ?? []) {
        assert.ok(alternative.queries.length > 0, `${item.id}: Suchauslöser fehlt`);
        for (const itemId of alternative.itemIds) {
          assert.ok(ids.has(itemId), `${item.id}: unbekannte Alternative ${itemId}`);
          assert.notEqual(itemId, item.id, `${item.id}: verweist auf sich selbst`);
        }
      }
    }
  });

  test("Suchabsichten sind begrenzt und maschinenlesbar", () => {
    for (const item of catalogs.items.items) {
      for (const rule of item.searchIntents ?? []) {
        assert.ok(rule.all.length > 0, `${item.id}: Suchabsicht ohne Gruppe`);
        assert.ok(rule.all.every((group) => group.length > 0), `${item.id}: leere Suchgruppe`);
        assert.ok(rule.all.flat().every((root) => root.length >= 3), `${item.id}: zu kurze Suchwurzel`);
        assert.ok(rule.score >= 100 && rule.score <= 125, `${item.id}: unsicherer Intent-Score`);
      }
    }
  });

  test("jede Aussage hat zum Inhaltsstand gültige Quellen", () => {
    const sources = new Map(catalogs.sources.sources.map((source) => [source.id, source]));
    for (const item of catalogs.items.items) {
      const integrity = validateItemIntegrity(
        item,
        sources,
        new Date(`${catalogs.items.contentDate}T00:00:00Z`)
      );
      assert.deepEqual(integrity.issues, [], `${item.id}: ${integrity.issues.join("; ")}`);
    }
  });

  test("kritische Sonderfälle sind sichtbar vorsichtig", () => {
    const criticalIds = [
      "battery",
      "damaged-lithium-battery",
      "electrical-device",
      "e-cigarette",
      "led-lamp",
      "medicine",
      "liquid-paint",
      "household-chemicals",
      "used-oil",
      "spray-can",
      "needle"
    ];
    for (const id of criticalIds) {
      const item = catalogs.items.items.find((candidate) => candidate.id === id);
      assert.ok(item, `${id} fehlt`);
      assert.equal(item.certainty, "caution", `${id} muss als Vorsichtsfall markiert sein`);
      assert.ok(item.warning, `${id} braucht einen Warnhinweis`);
    }
  });

  test("kommunale Unterschiede werden nicht zur Deutschland-Regel", () => {
    const munich = catalogs.regions.regions.find((region) => region.id === "munich");
    assert.match(munich.notice, /2026/);
    assert.match(munich.routeOverrides["light-packaging"].label, /Wertstoffinsel/);
    assert.doesNotMatch(
      catalogs.items.items.find((item) => item.id === "yogurt-cup").route.label,
      /München/
    );
  });
});

describe("Quellen- und Lizenzkatalog", () => {
  test("jede Quelle dokumentiert Geltung, Prüfung, Lizenz und Attribution", () => {
    const ids = new Set();
    for (const source of catalogs.sources.sources) {
      assert.ok(!ids.has(source.id), `doppelte Quellen-ID: ${source.id}`);
      ids.add(source.id);
      assert.match(source.url, /^https:\/\//, `${source.id}: keine HTTPS-Quelle`);
      for (const field of ["title", "publisher", "scope", "verifiedAt", "reviewDue", "license", "attribution"]) {
        assert.ok(source[field], `${source.id}: ${field} fehlt`);
      }
    }
  });

  test("nur amtliche oder kommunale Herausgeber sind als Fachquelle erfasst", () => {
    const allowedHosts = new Set([
      "www.umweltbundesamt.de",
      "www.bundesgesundheitsministerium.de",
      "www.bsr.de",
      "www.stadtreinigung.hamburg",
      "files.stadtreinigung.hamburg",
      "www.awm-muenchen.de",
      "www.gesetze-im-internet.de",
      "www.berlin.de",
      "www.stadt-koeln.de"
    ]);
    for (const source of catalogs.sources.sources) {
      assert.ok(allowedHosts.has(new URL(source.url).host), `${source.id}: nicht freigegebener Host`);
    }
  });

  test("Regionsprofile verweisen auf vorhandene amtliche Quellen", () => {
    const sourceIds = new Set(catalogs.sources.sources.map((source) => source.id));
    for (const region of catalogs.regions.regions) {
      assert.ok(region.scope && region.notice && region.officialName);
      assert.ok(sourceIds.has(region.sourceId), `${region.id}: Regionsquelle fehlt`);
      for (const override of Object.values(region.routeOverrides)) {
        assert.ok(sourceIds.has(override.sourceId), `${region.id}: Override-Quelle fehlt`);
      }
    }
  });
});
