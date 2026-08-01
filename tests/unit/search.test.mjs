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
    asOf: new Date("2026-08-01T00:00:00Z")
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
    ["E Zigaretten", "e-cigarette", "Bindestrichvariation"],
    ["Gummi", "rubber-household-item", "breiter Materialbegriff"],
    ["GUmmiband", "rubber-household-item", "Gummiband mit gemischter Großschreibung"],
    ["Gummibänder", "rubber-household-item", "Plural eines Gummialltagsgegenstands"],
    ["Gummibnad", "rubber-household-item", "Tippfehler in Gummiband"],
    ["Gummis", "rubber-household-item", "umgangssprachlicher Gummi-Plural"],
    ["Haargummi", "rubber-household-item", "zusammengesetzter Gummigegenstand"],
    ["Radiergummi", "rubber-household-item", "weiterer zusammengesetzter Gummigegenstand"],
    ["Gummiringe", "rubber-household-item", "kleines Gummiteil im Plural"],
    ["Latexhandschuhe", "rubber-household-item", "Materialsynonym für Gummihandschuhe"],
    ["Fahrradreifen", "rubber-household-item", "örtlich zu prüfender Gummigegenstand"],
    ["Autoreifen", "car-tire", "Fahrzeugreifen bleibt vom Restmüllfall getrennt"],
    ["Staubsaugerbeutel", "vacuum-waste", "häufiger Haushaltsrest"],
    ["Katzenstreu", "pet-litter", "Haustierabfall"],
    ["benutztes Taschentuch", "hygiene-paper", "Hygienepapier"],
    ["alte Zahnbürste", "manual-toothbrush", "nicht elektrische Zahnbürste"],
    ["Abwaschschwamm", "cleaning-sponge", "kleiner Reinigungsartikel"],
    ["Kugelschreiber", "writing-utensils", "Schreibartikel"],
    ["alte Fotos", "photos", "Fotomaterial"],
    ["Fußball", "sports-ball", "Sportartikel"],
    ["Kontaktlinsen", "contact-lenses", "kleiner Hygieneartikel"],
    ["Plastikblume", "plastic-household-item", "Kunststoffdeko ohne Verpackungsfunktion"],
    ["Kunstblumen", "plastic-household-item", "gängiges Synonym im Plural"],
    ["Plastik Blume", "plastic-household-item", "getrennte Komposita-Schreibweise"],
    ["Plastikschüssel", "plastic-household-item", "Kunststoff-Haushaltsgegenstand"],
    ["Kleiderbügel aus Plastik", "plastic-household-item", "weiterer Kunststoff-Haushaltsgegenstand"],
    ["Plastikspielzeug", "plastic-household-item", "Spielzeug ohne Elektronik"],
    ["elektronisches Plastikspielzeug", "electrical-device", "Elektronik schlägt Materialroute"],
    ["Spielzeugauto mit Batterie", "electrical-device", "Batterie schlägt Materialroute"]
  ];

  for (const [query, expected, label] of cases) {
    test(`${label}: ${query}`, () => assert.equal(first(query), expected));
  }

  test("mehrdeutiges Glas erzwingt eine Auswahl", () => {
    const results = searchItems(items, "Glas", {
      sourcesById,
      asOf: new Date("2026-08-01T00:00:00Z")
    });
    const ids = results.map(({ item }) => item.id);
    assert.ok(ids.includes("glass-container"));
    assert.ok(ids.includes("drinking-glass"));
    assert.ok(ids.includes("window-glass"));
    assert.equal(isAmbiguous(results), true);
  });

  test("der reine Materialbegriff Plastik trennt Verpackung und Gegenstand", () => {
    const results = searchItems(items, "Plastik", {
      sourcesById,
      asOf: new Date("2026-08-01T00:00:00Z")
    });
    const ids = results.map(({ item }) => item.id);
    assert.ok(ids.includes("plastic-packaging"));
    assert.ok(ids.includes("plastic-household-item"));
    assert.equal(isAmbiguous(results), true);
  });

  test("generisches Keyword verdrängt keinen exakten Batterie-Treffer", () => {
    const results = searchItems(items, "Batterie", {
      sourcesById,
      asOf: new Date("2026-08-01T00:00:00Z")
    });
    assert.equal(results[0].item.id, "battery");
    assert.equal(isAmbiguous(results), false);
  });

  test("Autoreifen wird nie als gewöhnlicher Gummi-Restmülltreffer ausgegeben", () => {
    const results = searchItems(items, "alter Autoreifen", {
      sourcesById,
      asOf: new Date("2026-08-01T00:00:00Z")
    });
    assert.equal(results[0].item.id, "car-tire");
    assert.notEqual(results[0].item.id, "rubber-household-item");
  });

  test("Gummiband-Tippfehler bleibt trotz generischem Gummi-Keyword eindeutig", () => {
    const results = searchItems(items, "Gummibnad", {
      sourcesById,
      asOf: new Date("2026-08-01T00:00:00Z")
    });
    assert.equal(results[0].item.id, "rubber-household-item");
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
    const integrity = validateItemIntegrity(item, sourcesById, new Date("2026-08-01T00:00:00Z"));
    assert.equal(integrity.valid, true);
  });

  test("fehlende Quelle verhindert einen scheinbar sicheren Treffer", () => {
    const item = { ...items[0], sources: ["nicht-vorhanden"] };
    const integrity = validateItemIntegrity(item, sourcesById, new Date("2026-08-01T00:00:00Z"));
    assert.equal(integrity.valid, false);
    assert.match(integrity.issues.join(" "), /fehlt/);
    assert.deepEqual(integrity.issueDetails, [
      { code: "issueSourceMissing", sourceId: "nicht-vorhanden" }
    ]);
  });

  test("überfällige Quelle wird als fällig erkannt", () => {
    const staleSources = new Map(sourcesById);
    staleSources.set("uba-separation-2026", {
      ...staleSources.get("uba-separation-2026"),
      reviewDue: "2026-01-01"
    });
    const item = items.find((candidate) => candidate.id === "paper");
    const integrity = validateItemIntegrity(item, staleSources, new Date("2026-08-01T00:00:00Z"));
    assert.equal(integrity.valid, false);
    assert.match(integrity.issues.join(" "), /erneuten Prüfung fällig/);
    assert.deepEqual(integrity.issueDetails, [
      { code: "issueSourceReviewDue", sourceId: "uba-separation-2026" }
    ]);
  });
});
