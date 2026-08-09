import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import {
  damerauLevenshtein,
  detectGuidedFlow,
  isAmbiguous,
  isDirectSearchMatch,
  normalizeText,
  searchItems,
  suggestCorrections,
  suggestedAlternatives,
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
    asOf: new Date("2026-08-09T00:00:00Z")
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
    ["Pizzareste", "food-leftovers", "Lebensmittelrest statt Karton"],
    ["Lebensmittelreste", "food-leftovers", "allgemeiner Lebensmittelbegriff"],
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
    ["Spielzeugauto mit Batterie", "electrical-device", "Batterie schlägt Materialroute"],
    ["Plastikflasche", "plastic-packaging", "Material plus Verpackungsform"],
    ["kaputte Plastikgabel", "plastic-household-item", "unbekannter Kunststoffgegenstand über Materialabsicht"],
    ["Batteriespielzeug", "electrical-device", "Elektronikabsicht in einem zusammengesetzten Wort"],
    ["Ölgemälde", "painting", "Gemälde als eigener Gegenstand"],
    ["Ölgemäde", "painting", "Tippfehler im Gemälde"],
    ["Kinderriegel", "food-and-wrapper", "Alltagsname eines Schokoriegels"],
    ["Schokolade", "food-and-wrapper", "Lebensmittel und Hülle getrennt betrachten"],
    ["leere Schokoriegelverpackung", "food-and-wrapper", "zusammengesetzter Produkt- und Verpackungsbegriff"],
    ["Poster", "poster", "eigener Materialcheck statt Elektro-Fehlkorrektur"],
    ["Plakat", "poster", "Alltagsbegriff mit Materialgrenze"],
    ["Postre", "poster", "Tippfehler im Poster"],
    ["Psoter", "poster", "Buchstabendreher am Wortanfang"],
    ["Eisen", "metal-household-item", "allgemeiner Metallbegriff"],
    ["rostige Eisenstange", "metal-household-item", "Material plus Form und Zustand"],
    ["Kupferrohr", "metal-household-item", "Buntmetall als zusammengesetztes Wort"],
    ["Metallverpackung", "metal-packaging", "Material plus Verpackungsfunktion"],
    ["Holzbrett", "wood-household-item", "allgemeiner Holzgegenstand"],
    ["Bauschutt", "mineral-construction-waste", "mineralischer Bauabfall"],
    ["Lederreste", "leather-household-item", "allgemeines Leder"],
    ["Flaschenkorken", "cork-household-item", "allgemeiner Kork"],
    ["Kerzenwachs", "wax-household-item", "allgemeines Wachs"],
    ["Mischmaterial", "composite-household-item", "unbekanntes Verbundmaterial"]
    ,
    ["Olivenöl", "cooking-oil", "Speiseöl"],
    ["Motoröl", "used-oil", "Altöl"],
    ["nasse Farbe", "liquid-paint", "flüssige Farbe wird nicht als trocken geraten"]
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

  test("der reine Materialbegriff Plastik zeigt einen Haupttreffer und nur die passende Alternative", () => {
    const results = searchItems(items, "Plastik", {
      sourcesById,
      asOf: new Date("2026-08-03T00:00:00Z")
    });
    const ids = results.map(({ item }) => item.id);
    assert.equal(results[0].item.id, "plastic-household-item");
    assert.ok(ids.includes("plastic-household-item"));
    assert.ok(!ids.includes("electrical-device"));
    assert.equal(isAmbiguous(results), false);
    assert.deepEqual(
      suggestedAlternatives(items, results[0].item, "Plastik").map((item) => item.id),
      ["plastic-packaging"]
    );
  });

  test("Karten wird als Karton-Tippfehler verstanden, aber nie zum Pizzakarton erweitert", () => {
    const results = searchItems(items, "Karten", {
      sourcesById,
      asOf: new Date("2026-08-03T00:00:00Z")
    });
    assert.equal(results[0].item.id, "cardboard");
    assert.ok(!results.some(({ item }) => item.id === "pizza-box"));
    assert.equal(isAmbiguous(results), false);
  });

  test("eingebettete Teilwörter erzeugen keine sachfremden Flaschen- oder Aschetreffer", () => {
    const ids = searchItems(items, "Plastikflasche", {
      sourcesById,
      asOf: new Date("2026-08-03T00:00:00Z")
    }).map(({ item }) => item.id);
    assert.equal(ids[0], "plastic-packaging");
    assert.ok(!ids.includes("glass-container"));
    assert.ok(!ids.includes("cold-ash"));
  });

  test("ähnlich klingende Alltagswörter erzeugen keine erfundenen Tippfehler-Treffer", () => {
    for (const query of ["Polster", "Raster", "Koster"]) {
      const ids = searchItems(items, query, {
        sourcesById,
        asOf: new Date("2026-08-03T00:00:00Z")
      }).map(({ item }) => item.id);
      assert.deepEqual(ids, [], `${query}: ${ids.join(", ")}`);
      assert.deepEqual(suggestCorrections(items, query), [], `${query}: unerwünschte Korrektur`);
    }
    assert.ok(!searchItems(items, "Poster").some(({ item }) => item.id === "electrical-device"));
  });

  test("Toast bleibt ein Lebensmittel und wird nie zum Toaster erweitert", () => {
    const results = searchItems(items, "Toast", {
      sourcesById,
      asOf: new Date("2026-08-03T00:00:00Z")
    });
    assert.equal(results[0].item.id, "food-leftovers");
    assert.ok(!results.some(({ item }) => item.id === "electrical-device"));
    assert.deepEqual(suggestCorrections(items, "Toast"), []);
  });

  test("breite Begriffe starten eine sichere, mehrstufige Eingrenzung", () => {
    assert.equal(detectGuidedFlow("Öl")?.id, "oil");
    assert.equal(detectGuidedFlow("Was für Werkzeug?")?.id, "tool");
    assert.equal(detectGuidedFlow("Farbe")?.id, "paint");
    assert.equal(detectGuidedFlow("Motoröl"), null);
    assert.equal(detectGuidedFlow("nasse Farbe"), null);
  });

  test("nasse Farbe schließt den Trockentreffer sicher aus", () => {
    const results = searchItems(items, "nasse Farbe");
    assert.equal(results[0]?.item.id, "liquid-paint");
    assert.ok(!results.some(({ item }) => item.id === "dried-paint"));
  });

  test("Sicherheitsmerkmale schlagen eine allgemeine Materialroute", () => {
    const cases = [
      ["elektrisches Metallspielzeug", "electrical-device"],
      ["Holzspielzeug mit Batterie", "electrical-device"]
    ];
    for (const [query, expected] of cases) {
      const results = searchItems(items, query);
      assert.equal(results[0]?.item.id, expected, query);
      assert.ok(!results.some(({ item }) => item.id === "metal-household-item"), query);
      assert.ok(!results.some(({ item }) => item.id === "wood-household-item"), query);
    }
    for (const query of ["Gasflasche aus Stahl", "flüssige Farbe in Metalldose", "Tinte in Metalldose", "Öl in Plastikflasche"]) {
      const results = searchItems(items, query);
      assert.ok(!results.some(({ item }) => item.id === "metal-household-item"), query);
      assert.ok(!results.some(({ item }) => ["metal-packaging", "tin-can", "plastic-packaging"].includes(item.id)), query);
    }
    assert.equal(searchItems(items, "flüssige Farbe in Metalldose")[0]?.item.id, "liquid-paint");
  });

  test("Materialstämme werden nur am Wortanfang und nicht mitten in fremden Wörtern erkannt", () => {
    const carbon = searchItems(items, "unbekannte Carbonplatte");
    assert.equal(carbon[0]?.item.id, "composite-household-item");
    assert.ok(!carbon.some(({ item }) => item.id === "wood-household-item"));
    assert.ok(!searchItems(items, "Asbestplatte").some(({ item }) => item.id === "wood-household-item"));
  });

  test("Material-Tippfehler bleiben bestätigbare Vorschläge", () => {
    for (const [query, expectedId] of [["Eissen", "metal-household-item"], ["Metalll", "metal-household-item"], ["Holtz", "wood-household-item"]]) {
      assert.ok(searchItems(items, query).every((result) => !isDirectSearchMatch(result)), query);
      assert.ok(suggestCorrections(items, query).some(({ item }) => item.id === expectedId), query);
    }
  });

  test("reine Materialbegriffe öffnen den allgemeinen Leitfaden mit belegten Alternativen", () => {
    const results = searchItems(items, "Metall");
    assert.equal(results[0]?.item.id, "metal-household-item");
    assert.equal(isAmbiguous(results), false);
    assert.deepEqual(
      suggestedAlternatives(items, results[0].item, "Metall").map((item) => item.id),
      ["metal-packaging", "electrical-device"]
    );
  });

  test("unsichere Schreibweisen werden als bestätigbare Korrektur statt als Entsorgungsweg angeboten", () => {
    const [correction] = suggestCorrections(items, "Toiaster");
    assert.equal(correction.item.id, "electrical-device");
    assert.equal(correction.term, "Toaster");
    assert.equal(correction.distance, 1);
    assert.ok(searchItems(items, "Toatsr").every((result) => !isDirectSearchMatch(result)));
    assert.deepEqual(
      suggestCorrections(items, "Toatsr").map(({ term }) => term),
      ["Toaster"]
    );
  });

  test("typische Einfügungen, Auslassungen und Vertauschungen bleiben bestätigbar", () => {
    const cases = [
      ["Baterie", "Batterie", "battery"],
      ["Gummibnad", "Gummiband", "rubber-household-item"],
      ["Ölgemäde", "Ölgemälde", "painting"],
      ["Postre", "Poster", "poster"],
      ["Psoter", "Poster", "poster"],
      ["Karten", "Karton", "cardboard"]
    ];
    for (const [query, term, itemId] of cases) {
      assert.ok(searchItems(items, query).every((result) => !isDirectSearchMatch(result)), query);
      const corrections = suggestCorrections(items, query);
      assert.ok(corrections.some((entry) => entry.term === term && entry.item.id === itemId), query);
    }
  });

  test("jeder redaktionelle Name und jedes Synonym bleibt direkt auffindbar", () => {
    for (const item of items) {
      for (const term of [item.name, ...(item.aliases ?? [])]) {
        const result = searchItems(items, term, { limit: 100 });
        assert.ok(
          result.some((entry) => entry.item.id === item.id && isDirectSearchMatch(entry)),
          `${item.id}: ${term}`
        );
      }
    }
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
