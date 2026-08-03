import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { searchItems } from "../../src/search.js";
import {
  UI_MESSAGES,
  localizeCatalogs,
  normalizeLanguage,
  translate
} from "../../src/i18n.js";

const root = new URL("../../", import.meta.url);
const [itemsCatalog, sourcesCatalog, regionsCatalog, englishCatalog, appManifest, shellLock] =
  await Promise.all(
    [
      "public/data/waste-items.v1.json",
      "public/data/sources.v1.json",
      "public/data/regions.v1.json",
      "public/data/locales/en.v1.json",
      "milos-app.json",
      "vendor/milosapps-shell/v2/shell-lock.json"
    ].map(async (path) => JSON.parse(await readFile(new URL(path, root), "utf8")))
  );

test("public-app-shell/v2.0.3 ist lokal vendort und exakt gepinnt", () => {
  assert.equal(appManifest.shellContract.id, "public-app-shell/v2");
  assert.equal(appManifest.shellContract.version, "2.0.3");
  assert.equal(
    appManifest.shellContract.sharedCommit,
    "ed898412306e22c6ae1b10ee8953df29f8acd627"
  );
  assert.equal(appManifest.appKey, "waste-guide");
  assert.equal(appManifest.public, true);
  assert.equal(appManifest.loginRequired, false);
  assert.equal(appManifest.environment, "dev");
  assert.equal(appManifest.productionApproved, false);
  assert.equal(shellLock.contract, "public-app-shell/v2");
  assert.equal(shellLock.version, "2.0.3");
  assert.equal(shellLock.sharedCommit, appManifest.shellContract.sharedCommit);
  assert.equal(shellLock.appKey, "waste-guide");
});

test("Sprachwerte werden für die sichtbare Fachoberfläche sicher normalisiert", () => {
  assert.equal(normalizeLanguage("en"), "en");
  assert.equal(normalizeLanguage("de"), "de");
  assert.equal(normalizeLanguage("fr"), "de");
  assert.equal(translate("en", "searchSubmit"), "Search");
  assert.equal(translate("de", "searchSubmit"), "Suchen");
  assert.deepEqual(Object.keys(UI_MESSAGES.en).sort(), Object.keys(UI_MESSAGES.de).sort());
});

test("jede sichtbare redaktionelle Struktur besitzt eine englische Fassung", () => {
  assert.equal(englishCatalog.language, "en");
  assert.equal(englishCatalog.contentVersion, itemsCatalog.contentVersion);

  for (const item of itemsCatalog.items) {
    const translation = englishCatalog.items[item.id];
    assert.ok(translation, `englischer Eintrag fehlt: ${item.id}`);
    for (const field of [
      "name",
      "aliases",
      "keywords",
      "category",
      "route",
      "answer",
      "reason",
      "steps",
      "localVariation"
    ]) {
      assert.ok(translation[field], `${item.id}.${field} fehlt`);
    }
    assert.equal(
      Array.isArray(translation.steps) && translation.steps.length,
      item.steps.length,
      `${item.id}.steps ist unvollständig`
    );
    if (item.warning) {
      assert.equal(typeof translation.warning, "string", `${item.id}.warning fehlt`);
    }
  }

  for (const source of sourcesCatalog.sources) {
    const translation = englishCatalog.sources[source.id];
    assert.ok(translation, `englische Quelle fehlt: ${source.id}`);
    for (const field of ["title", "publisher", "scope", "attribution"]) {
      assert.equal(typeof translation[field], "string", `${source.id}.${field} fehlt`);
    }
  }

  for (const region of regionsCatalog.regions) {
    const translation = englishCatalog.regions[region.id];
    assert.ok(translation, `englische Region fehlt: ${region.id}`);
    for (const field of ["label", "scope", "officialName", "notice"]) {
      assert.equal(typeof translation[field], "string", `${region.id}.${field} fehlt`);
    }
    for (const [routeType, route] of Object.entries(region.routeOverrides ?? {})) {
      assert.equal(
        typeof translation.routeOverrides?.[routeType]?.label,
        "string",
        `${region.id}.${routeType}.label fehlt`
      );
      if (route.note) {
        assert.equal(
          typeof translation.routeOverrides?.[routeType]?.note,
          "string",
          `${region.id}.${routeType}.note fehlt`
        );
      }
    }
  }
});

test("englische Suche nutzt übersetzte Namen, Synonyme und Hinweise", () => {
  const localized = localizeCatalogs(
    { itemsCatalog, sourcesCatalog, regionsCatalog, localeCatalog: englishCatalog },
    "en"
  );
  const sourcesById = new Map(localized.sources.map((source) => [source.id, source]));

  assert.equal(searchItems(localized.items, "rubber band", { sourcesById })[0].item.id, "rubber-household-item");
  assert.equal(searchItems(localized.items, "car tire", { sourcesById })[0].item.id, "car-tire");
  assert.equal(searchItems(localized.items, "old medicine", { sourcesById })[0].item.id, "medicine");
  assert.equal(searchItems(localized.items, "plastic flower", { sourcesById })[0].item.id, "plastic-household-item");
  assert.equal(searchItems(localized.items, "plastic", { sourcesById })[0].item.id, "plastic-household-item");
  assert.equal(searchItems(localized.items, "oil painting", { sourcesById })[0].item.id, "painting");
  assert.equal(searchItems(localized.items, "chocolate bar", { sourcesById })[0].item.id, "food-and-wrapper");
  assert.equal(localized.regions.find((region) => region.id === "de").label, "Germany — general guidance");
  assert.match(localized.items.find((item) => item.id === "rubber-household-item").warning, /car and motorcycle tires/i);
  assert.equal(translate("en", "allApps"), "All apps");
  assert.equal(translate("de", "allApps"), "Alle Apps");
});
