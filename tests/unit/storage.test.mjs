import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { languageFromUrl, updateLanguageUrl } from "../../src/shell-session.js";

function fakeBrowser(href) {
  const calls = [];
  return {
    location: { href },
    history: {
      state: { itemId: "rubber-household-item" },
      replaceState(state, title, url) {
        calls.push({ state, title, url });
      }
    },
    calls
  };
}

describe("flüchtige App-Einstellungen", () => {
  test("liest nur die unterstützte Sprache aus der URL", () => {
    assert.equal(languageFromUrl("https://example.test/?lang=en"), "en");
    assert.equal(languageFromUrl("https://example.test/?lang=fr"), "de");
    assert.equal(languageFromUrl("https://example.test/"), "de");
  });

  test("schreibt Englisch in die URL und erhält Ergebnis sowie Fragment", () => {
    const browser = fakeBrowser("https://example.test/?item=rubber-household-item#source");
    assert.equal(updateLanguageUrl("en", browser), "en");
    assert.deepEqual(browser.calls, [{
      state: { itemId: "rubber-household-item" },
      title: "",
      url: "/?item=rubber-household-item&lang=en#source"
    }]);
  });

  test("entfernt den Sprachparameter für Deutsch ohne anderen Zustand zu speichern", () => {
    const browser = fakeBrowser("https://example.test/?lang=en&item=battery#result");
    assert.equal(updateLanguageUrl("de", browser), "de");
    assert.equal(browser.calls[0].url, "/?item=battery#result");
    assert.equal(Object.hasOwn(browser, "localStorage"), false);
    assert.equal(Object.hasOwn(browser, "sessionStorage"), false);
  });
});
