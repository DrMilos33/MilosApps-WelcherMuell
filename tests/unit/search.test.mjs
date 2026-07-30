import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import {
  damerauLevenshtein,
  isAmbiguous,
  normalizeText,
  searchItems,
  validateItemIntegrity
} from "../../src/search.js";
import { loadCatalogs } from "./fixtures.mjs";

let items;
let sourcesById;

before(async () => {
  const catalogs = await loadCatalogs();
  items = catalogs.items.items;
  sourcesById = new Map(catalogs.sources.sources.map((source) => [source.id, source]));
});

function first(query) {
  return searchItems(items, query, {
    sourcesById,
    asOf: new Date("2026-07-30T00:00:00Z")
  })[0]?.item.id;
}

describe("deutsche Normalisierung", () => {
  test("behandelt Umlaute und ß deterministisch", () => {
    assert.equal(normalizeText("MÜLL & Größen"), "muell groessen");
    assert.equal(normalizeText("Glüh-Birne"), "glueh birne");
  });

  test("erkennt vertauschte Zeichen als einen Tippfehler", () => {
    assert.equal(damerauLevenshtein("Battrie", "Batterie"), 1);
  });
});

describe("Suchqualität", () => {
  const cases = [
    ["Joghurtbecher", "yogurt-cup", "exakter Begriff"],
    ["Jogurtbecher", "yogurt-cup", "amtlich unbeachtete, aber häufige Schreibweise"],
    ["Joghurbecher", "yogurt-cup", "Tippfehler"],
    ["Tetrapak", "beverage-carton", "Marken-/Alltagssynonym"],
    ["Kassenzettel", "receipt", "eindeutiger Restmüllfall"],
    ["Akkus", "battery", "Plural"],
    ["Baterie", "battery", "Tippfehler in Sicherheitsfall"],
    ["elektrische Zahnbürste", "electrical-device", "Umlaut und Mehrwort-Synonym"],
    ["alte Medikamente", "medicine", "natürliche Mehrwortsuche"],
    ["aufgeblähter Handyakku", "damaged-lithium-battery", "gefährlicher Sonderfall"],
    ["LED Birne", "led-lamp", "Lampensynonym"],
    ["Glühbirne", "incandescent-bulb", "Abgrenzung zur LED"],
    ["Pizzakartons", "pizza-box", "Plural"],
    ["Wohin kommt mein alter Toaster?", "electrical-device", "lange Frage"],
    ["Blaue Glasflasche", "blue-glass", "Material und Farbe"],
    ["E Zigaretten", "e-cigarette", "Bindestrichvariation"]
  ];

  for (const [query, expected, label] of cases) {
    test(`${label}: ${query}`, () => assert.equal(first(query), expected));
  }

  test("mehrdeutiges Glas erzwingt eine Auswahl", () => {
    const results = searchItems(items, "Glas", {
      sourcesById,
      asOf: new Date("2026-07-30T00:00:00Z")
    });
    const ids = results.map(({ item }) => item.id);
    assert.ok(ids.includes("glass-container"));
    assert.ok(ids.includes("drinking-glass"));
    assert.ok(ids.includes("window-glass"));
    assert.equal(isAmbiguous(results), true);
  });

  test("generisches Keyword verdrängt keinen exakten Batterie-Treffer", () => {
    const results = searchItems(items, "Batterie", {
      sourcesById,
      asOf: new Date("2026-07-30T00:00:00Z")
    });
    assert.equal(results[0].item.id, "battery");
    assert.equal(isAmbiguous(results), false);
  });

  test("ein einzelnes Zeichen erzeugt keinen geratenen Treffer", () => {
    assert.deepEqual(searchItems(items, "a"), []);
  });

  test("völlig unbekannte Eingaben erzeugen keinen Treffer", () => {
    assert.deepEqual(searchItems(items, "Quantenfluxkompensator"), []);
  });
});

describe("Quellenintegrität", () => {
  test("vollständiger Eintrag bleibt sicher", () => {
    const item = items.find((candidate) => candidate.id === "battery");
    const integrity = validateItemIntegrity(item, sourcesById, new Date("2026-07-30T00:00:00Z"));
    assert.equal(integrity.valid, true);
  });

  test("fehlende Quelle verhindert einen scheinbar sicheren Treffer", () => {
    const item = { ...items[0], sources: ["nicht-vorhanden"] };
    const integrity = validateItemIntegrity(item, sourcesById, new Date("2026-07-30T00:00:00Z"));
    assert.equal(integrity.valid, false);
    assert.match(integrity.issues.join(" "), /fehlt/);
  });

  test("überfällige Quelle wird als fällig erkannt", () => {
    const staleSources = new Map(sourcesById);
    staleSources.set("uba-separation-2026", {
      ...staleSources.get("uba-separation-2026"),
      reviewDue: "2026-01-01"
    });
    const item = items.find((candidate) => candidate.id === "paper");
    const integrity = validateItemIntegrity(item, staleSources, new Date("2026-07-30T00:00:00Z"));
    assert.equal(integrity.valid, false);
    assert.match(integrity.issues.join(" "), /erneuten Prüfung fällig/);
  });
});
