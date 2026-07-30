export const STORAGE_KEYS = Object.freeze({
  region: "waste-guide:region:v1",
  remember: "waste-guide:remember:v1",
  history: "waste-guide:history:v1"
});

function safely(storage, fallback, operation) {
  try {
    return operation(storage);
  } catch {
    return fallback;
  }
}

export function loadLocalState(storage = globalThis.localStorage) {
  return safely(storage, { region: "de", remember: false, history: [] }, (target) => {
    const remember = target.getItem(STORAGE_KEYS.remember) === "true";
    let history = [];
    if (remember) {
      const parsed = JSON.parse(target.getItem(STORAGE_KEYS.history) ?? "[]");
      if (Array.isArray(parsed)) {
        history = parsed.filter((entry) => typeof entry === "string").slice(0, 5);
      }
    }

    return {
      region: target.getItem(STORAGE_KEYS.region) || "de",
      remember,
      history
    };
  });
}

export function saveRegion(region, storage = globalThis.localStorage) {
  return safely(storage, false, (target) => {
    target.setItem(STORAGE_KEYS.region, String(region));
    return true;
  });
}

export function setRememberSearches(remember, storage = globalThis.localStorage) {
  return safely(storage, false, (target) => {
    target.setItem(STORAGE_KEYS.remember, remember ? "true" : "false");
    if (!remember) target.removeItem(STORAGE_KEYS.history);
    return true;
  });
}

export function addSearchToHistory(query, storage = globalThis.localStorage) {
  const cleaned = String(query ?? "").trim().slice(0, 120);
  if (cleaned.length < 2) return [];

  return safely(storage, [], (target) => {
    if (target.getItem(STORAGE_KEYS.remember) !== "true") return [];
    const current = loadLocalState(target).history;
    const normalized = cleaned.toLocaleLowerCase("de-DE");
    const next = [
      cleaned,
      ...current.filter((entry) => entry.toLocaleLowerCase("de-DE") !== normalized)
    ].slice(0, 5);
    target.setItem(STORAGE_KEYS.history, JSON.stringify(next));
    return next;
  });
}

export function clearLocalData(storage = globalThis.localStorage) {
  return safely(storage, false, (target) => {
    for (const key of Object.values(STORAGE_KEYS)) target.removeItem(key);
    return true;
  });
}
