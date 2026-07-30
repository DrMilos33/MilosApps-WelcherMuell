import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  STORAGE_KEYS,
  addSearchToHistory,
  clearLocalData,
  loadLocalState,
  saveRegion,
  setRememberSearches
} from "../../src/storage.js";

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.has(key) ? this.#values.get(key) : null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}

describe("lokale, optionale Daten", () => {
  test("speichert standardmäßig keinen Suchverlauf", () => {
    const storage = new MemoryStorage();
    assert.deepEqual(addSearchToHistory("Batterie", storage), []);
    assert.equal(storage.getItem(STORAGE_KEYS.history), null);
  });

  test("merkt auf Wunsch höchstens fünf eindeutige Begriffe", () => {
    const storage = new MemoryStorage();
    setRememberSearches(true, storage);
    for (const query of ["Batterie", "Glas", "Papier", "Akku", "Lampe", "Batterie", "Dose"]) {
      addSearchToHistory(query, storage);
    }
    const state = loadLocalState(storage);
    assert.equal(state.history.length, 5);
    assert.equal(state.history[0], "Dose");
    assert.equal(state.history.filter((query) => query === "Batterie").length, 1);
  });

  test("Ausschalten löscht vorhandenen Verlauf sofort", () => {
    const storage = new MemoryStorage();
    setRememberSearches(true, storage);
    addSearchToHistory("Akku", storage);
    setRememberSearches(false, storage);
    assert.equal(storage.getItem(STORAGE_KEYS.history), null);
    assert.deepEqual(loadLocalState(storage).history, []);
  });

  test("Region ist grob und vollständig löschbar", () => {
    const storage = new MemoryStorage();
    saveRegion("munich", storage);
    setRememberSearches(true, storage);
    addSearchToHistory("Pizzakarton", storage);
    assert.equal(loadLocalState(storage).region, "munich");
    assert.equal(clearLocalData(storage), true);
    assert.deepEqual(loadLocalState(storage), { region: "de", remember: false, history: [] });
  });

  test("gesperrter Browserspeicher lässt die App datensparsam weiterlaufen", () => {
    const denied = {
      getItem() { throw new Error("denied"); },
      setItem() { throw new Error("denied"); },
      removeItem() { throw new Error("denied"); }
    };
    assert.deepEqual(loadLocalState(denied), { region: "de", remember: false, history: [] });
    assert.equal(saveRegion("berlin", denied), false);
    assert.equal(setRememberSearches(true, denied), false);
  });
});
