import { isAmbiguous, searchItems, validateItemIntegrity } from "./search.js";
import {
  addSearchToHistory,
  clearLocalData,
  loadLocalState,
  saveRegion,
  setRememberSearches
} from "./storage.js";

const DATA_PATHS = {
  items: "/public/data/waste-items.v1.json",
  sources: "/public/data/sources.v1.json",
  regions: "/public/data/regions.v1.json"
};

const CERTAINTY = {
  confirmed: { label: "Bundesweit belegt", className: "" },
  "check-local": { label: "Örtlich prüfen", className: "local" },
  caution: { label: "Besondere Vorsicht", className: "caution" }
};

const elements = {
  form: document.querySelector("#search-form"),
  input: document.querySelector("#waste-query"),
  status: document.querySelector("#search-status"),
  results: document.querySelector("#results"),
  resultsTitle: document.querySelector("#results-title"),
  resultKicker: document.querySelector("#result-kicker"),
  reset: document.querySelector("#reset-search"),
  settings: document.querySelector("#settings-panel"),
  openSettings: document.querySelector("#open-settings"),
  closeSettings: document.querySelector("#close-settings"),
  region: document.querySelector("#region-select"),
  remember: document.querySelector("#remember-searches"),
  clearData: document.querySelector("#clear-local-data"),
  historySection: document.querySelector("#history-section"),
  historyList: document.querySelector("#history-list"),
  offline: document.querySelector("#offline-banner"),
  contentDate: document.querySelector("#content-date"),
  aboutDialog: document.querySelector("#about-dialog"),
  aboutContent: document.querySelector("#about-content"),
  showAbout: document.querySelector("#show-about"),
  closeAbout: document.querySelector("#close-about"),
  toast: document.querySelector("#toast")
};

const state = {
  items: [],
  sources: [],
  sourcesById: new Map(),
  regions: [],
  selectedRegion: "de",
  remember: false,
  history: [],
  currentItem: null,
  lastQuery: "",
  toastTimer: null
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "nicht angegeben";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00Z`));
}

function selectedRegion() {
  return state.regions.find((region) => region.id === state.selectedRegion) ?? state.regions[0];
}

function effectiveRoute(item) {
  const region = selectedRegion();
  const override = region?.routeOverrides?.[item.route.type];
  if (!override) return { ...item.route, note: null, sourceId: null };
  return { ...item.route, ...override };
}

function effectiveCertainty(item, integrity) {
  if (!integrity.valid) return CERTAINTY["check-local"];
  return CERTAINTY[item.certainty] ?? CERTAINTY["check-local"];
}

function sourceForId(sourceId) {
  return state.sourcesById.get(sourceId);
}

function sourceList(item, route) {
  const sourceIds = [...new Set([...(item.sources ?? []), route.sourceId].filter(Boolean))];
  return sourceIds.map(sourceForId).filter(Boolean);
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  state.toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 3200);
}

function updateConnectivity() {
  elements.offline.hidden = navigator.onLine;
}

function setSettingsOpen(open) {
  if (open && !elements.settings.open) {
    elements.settings.showModal();
    elements.openSettings.setAttribute("aria-expanded", "true");
    elements.region.focus();
    return;
  }
  if (!open && elements.settings.open) elements.settings.close();
}

function renderRegions() {
  elements.region.innerHTML = state.regions
    .map((region) => `<option value="${escapeHtml(region.id)}">${escapeHtml(region.label)}</option>`)
    .join("");
  elements.region.value = state.selectedRegion;
}

function renderHistory() {
  elements.historySection.hidden = !state.remember || state.history.length === 0;
  elements.historyList.innerHTML = state.history
    .map((query) => `<button type="button" data-history-query="${escapeHtml(query)}">${escapeHtml(query)}</button>`)
    .join("");
}

function updateUrl(itemId = null, replace = false) {
  const url = new URL(window.location.href);
  url.search = "";
  if (itemId) url.searchParams.set("item", itemId);
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({ itemId }, "", `${url.pathname}${url.search}`);
}

function updateUrlForNonSpecificResult(options = {}) {
  if (options.updateUrl === false) return;
  const hadSpecificItem = new URL(window.location.href).searchParams.has("item");
  updateUrl(null, !hadSpecificItem);
}

function emptyState({ title, message, kicker = "Bereit" }) {
  state.currentItem = null;
  elements.resultKicker.textContent = kicker;
  elements.resultsTitle.textContent = title;
  elements.status.textContent = message;
  elements.status.hidden = false;
  elements.results.innerHTML = "";
  elements.reset.hidden = kicker === "Bereit";
}

function localGuidance(item) {
  const region = selectedRegion();
  if (!region) return "";
  const route = effectiveRoute(item);
  const needsLocalBox =
    state.selectedRegion !== "de" ||
    item.certainty !== "confirmed" ||
    Boolean(item.localVariation);
  if (!needsLocalBox) return "";

  const link = region.url
    ? `<a href="${escapeHtml(region.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(region.officialName)} öffnen</a>`
    : "Suche auf der Website deiner Stadt oder deines Landkreises nach „Abfall-ABC“ oder „Abfallberatung“.";
  const overrideNote = route.note ? `<p>${escapeHtml(route.note)}</p>` : "";

  return `
    <div class="regional-box">
      <strong>${escapeHtml(region.label)}</strong>
      ${overrideNote}
      <p>${escapeHtml(item.localVariation)}</p>
      <p>${link}</p>
    </div>
  `;
}

function integrityWarning(integrity) {
  if (integrity.valid) return "";
  return `
    <div class="warning-box" role="alert">
      <strong>Redaktionelle Prüfung fällig</strong>
      <p>Dieser Treffer wird nicht als sichere Tonnenempfehlung ausgegeben. Bitte nutze die verlinkte örtliche Abfallberatung.</p>
      <ul>${integrity.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>
    </div>
  `;
}

function renderSource(source) {
  const sourceDate = source.sourceDate ? `Quellenstand ${formatDate(source.sourceDate)} · ` : "";
  return `
    <li>
      <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(source.title)}
      </a>
      <small>${escapeHtml(source.publisher)} · ${escapeHtml(source.scope)}</small>
      <small>${sourceDate}geprüft ${formatDate(source.verifiedAt)} · nächste Prüfung bis ${formatDate(source.reviewDue)}</small>
      <small>${escapeHtml(source.attribution)}</small>
    </li>
  `;
}

function renderItem(item, integrity = validateItemIntegrity(item, state.sourcesById, new Date())) {
  const route = effectiveRoute(item);
  const certainty = effectiveCertainty(item, integrity);
  const sources = sourceList(item, route);
  const warning = item.warning
    ? `<div class="warning-box"><strong>Wichtig</strong><p>${escapeHtml(item.warning)}</p></div>`
    : "";

  return `
    <article class="result-card" data-item-id="${escapeHtml(item.id)}">
      <div class="result-main">
        <div class="result-copy">
          <div class="result-title-row">
            <div>
              <p class="section-kicker">${escapeHtml(item.category)}</p>
              <h3 id="item-${escapeHtml(item.id)}" tabindex="-1">${escapeHtml(item.name)}</h3>
            </div>
            <span class="certainty-badge ${escapeHtml(certainty.className)}">${escapeHtml(certainty.label)}</span>
          </div>
          <p class="answer">${escapeHtml(item.answer)}</p>
          <p class="reason"><strong>Warum?</strong> ${escapeHtml(item.reason)}</p>
          <ol class="steps">
            ${item.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
          </ol>
          ${warning}
          ${integrityWarning(integrity)}
          ${localGuidance(item)}
        </div>
        <div class="result-route">
          <span class="route-type">Empfohlener Weg</span>
          <h3>${escapeHtml(integrity.valid ? route.label : "Örtliche Abfallberatung")}</h3>
          <p>${escapeHtml(integrity.valid ? "Für private Haushalte im angegebenen Geltungsbereich." : "Bis die Quellen erneut geprüft sind, keine Tonnenangabe übernehmen.")}</p>
        </div>
      </div>
      <div class="result-details">
        <details>
          <summary>Quellen und Gültigkeit (${sources.length})</summary>
          <ul class="source-list">${sources.map(renderSource).join("")}</ul>
          <p><strong>Redaktioneller Stand:</strong> geprüft ${formatDate(item.reviewedAt)}, nächste Prüfung bis ${formatDate(item.reviewDue)}.</p>
        </details>
        <div class="result-actions">
          <button class="secondary-button" type="button" data-share="${escapeHtml(item.id)}">Hinweis teilen</button>
          <button class="secondary-button" type="button" data-print="${escapeHtml(item.id)}">Drucken</button>
        </div>
      </div>
    </article>
  `;
}

function renderOne(item, options = {}) {
  const integrity = validateItemIntegrity(item, state.sourcesById, new Date());
  state.currentItem = item;
  elements.resultKicker.textContent = "Entsorgungshinweis";
  elements.resultsTitle.textContent = `Ergebnis für „${item.name}“`;
  elements.status.hidden = true;
  elements.reset.hidden = false;
  elements.results.innerHTML = renderItem(item, integrity);

  if (options.updateHistory !== false) {
    state.history = addSearchToHistory(state.lastQuery || item.name);
    renderHistory();
  }
  if (options.updateUrl !== false) updateUrl(item.id);
  if (options.focus !== false) elements.resultsTitle.focus();
}

function renderChoices(results, query) {
  state.currentItem = null;
  elements.resultKicker.textContent = "Mehrdeutige Suche";
  elements.resultsTitle.textContent = `Was meinst du mit „${query}“?`;
  elements.status.hidden = false;
  elements.status.textContent = "Wähle den passenden Gegenstand. Ähnlich klingende Dinge können verschiedene Entsorgungswege haben.";
  elements.reset.hidden = false;
  elements.results.innerHTML = results
    .slice(0, 6)
    .map(({ item }) => `
      <article class="result-card compact">
        <div>
          <p class="section-kicker">${escapeHtml(item.category)}</p>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.answer)}</p>
        </div>
        <button
          class="secondary-button"
          type="button"
          data-select-item="${escapeHtml(item.id)}"
          aria-label="${escapeHtml(`${item.name} auswählen`)}"
        >
          Auswählen
        </button>
      </article>
    `)
    .join("");
  state.history = addSearchToHistory(query);
  renderHistory();
  elements.resultsTitle.focus();
}

function runSearch(rawQuery, options = {}) {
  const query = String(rawQuery ?? "").trim().slice(0, 120);
  elements.input.value = query;
  state.lastQuery = query;

  if (query.length < 2) {
    emptyState({
      title: "Bitte etwas genauer",
      message: "Gib mindestens zwei Zeichen ein, zum Beispiel „Akku“ oder „Glas“.",
      kicker: "Zu kurze Eingabe"
    });
    updateUrlForNonSpecificResult(options);
    elements.resultsTitle.focus();
    return;
  }

  const results = searchItems(state.items, query, {
    sourcesById: state.sourcesById,
    asOf: new Date(),
    limit: 8
  });

  if (results.length === 0) {
    emptyState({
      title: `Kein sicherer Treffer für „${query}“`,
      message: "Bitte beschreibe Material und Funktion genauer. Bis dahin: nicht in eine Tonne raten, sondern im örtlichen Abfall-ABC nachsehen.",
      kicker: "Unklar"
    });
    state.history = addSearchToHistory(query);
    renderHistory();
    updateUrlForNonSpecificResult(options);
    elements.resultsTitle.focus();
    return;
  }

  if (isAmbiguous(results)) {
    renderChoices(results, query);
    updateUrlForNonSpecificResult(options);
    return;
  }

  renderOne(results[0].item, {
    updateUrl: options.updateUrl !== false,
    updateHistory: options.updateHistory !== false,
    focus: options.focus !== false
  });
}

function resetSearch({ updateUrl: shouldUpdateUrl = true, focus = true } = {}) {
  state.lastQuery = "";
  elements.input.value = "";
  emptyState({
    title: "Was möchtest du entsorgen?",
    message: "Suche oben nach einem Gegenstand – eine Region ist dafür nicht nötig.",
    kicker: "Bereit"
  });
  if (shouldUpdateUrl) updateUrl(null);
  if (focus) elements.input.focus();
}

async function shareItem(item) {
  const route = effectiveRoute(item);
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("item", item.id);
  const text = `${item.name}: ${item.answer} Empfohlener Weg: ${route.label}. Stand ${formatDate(item.reviewedAt)}.`;
  const shareData = { title: `Welcher Müll? – ${item.name}`, text, url: url.toString() };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      showToast("Teilen geöffnet.");
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    showToast("Hinweis und Link kopiert.");
  } catch (error) {
    if (error?.name !== "AbortError") showToast("Teilen ist gerade nicht verfügbar.");
  }
}

function renderAbout() {
  const rightsSources = state.sources.filter((source) => source.id.includes("rights"));
  elements.aboutContent.innerHTML = `
    <p>Die App funktioniert ohne Konto, Cookies, Standortzugriff oder Nutzerdatenbank. Region und Suchverlauf werden nur nach deiner Auswahl im lokalen Browserspeicher abgelegt und lassen sich vollständig löschen.</p>
    <h3>Redaktioneller Datenbestand</h3>
    <p>${escapeHtml(state.sourcesEditorialUse)}</p>
    <p><strong>Vorschaubild:</strong> eigenes SVG dieses Repositorys; keine Fremdassets, Logos oder Fotografien.</p>
    <h3>Lizenznachweise der Hauptquellen</h3>
    <ul class="source-list">${rightsSources.map(renderSource).join("")}</ul>
    <h3>Grenzen</h3>
    <p>Die App ersetzt keine kommunale Abfallberatung und keinen Notruf. Sie zeigt nur belegte allgemeine Hinweise und ausgewählte, amtlich bestätigte regionale Unterschiede.</p>
  `;
}

function bindEvents() {
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch(elements.input.value);
  });

  elements.input.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.input.value) {
      event.preventDefault();
      resetSearch();
    }
  });

  document.querySelectorAll("[data-query]").forEach((button) => {
    button.addEventListener("click", () => runSearch(button.dataset.query));
  });

  elements.results.addEventListener("click", (event) => {
    const select = event.target.closest("[data-select-item]");
    if (select) {
      const item = state.items.find((candidate) => candidate.id === select.dataset.selectItem);
      if (item) renderOne(item);
      return;
    }

    const share = event.target.closest("[data-share]");
    if (share) {
      const item = state.items.find((candidate) => candidate.id === share.dataset.share);
      if (item) void shareItem(item);
      return;
    }

    if (event.target.closest("[data-print]")) window.print();
  });

  elements.reset.addEventListener("click", () => resetSearch());
  elements.openSettings.addEventListener("click", () => setSettingsOpen(!elements.settings.open));
  elements.closeSettings.addEventListener("click", () => setSettingsOpen(false));
  elements.settings.addEventListener("close", () => {
    elements.openSettings.setAttribute("aria-expanded", "false");
    elements.openSettings.focus();
  });
  elements.settings.addEventListener("cancel", () => {
    elements.openSettings.setAttribute("aria-expanded", "false");
  });
  elements.settings.addEventListener("click", (event) => {
    if (event.target === elements.settings) setSettingsOpen(false);
  });

  elements.region.addEventListener("change", () => {
    state.selectedRegion = elements.region.value;
    saveRegion(state.selectedRegion);
    if (state.currentItem) renderOne(state.currentItem, { updateUrl: false, updateHistory: false, focus: false });
    showToast(`Region: ${selectedRegion().label}`);
  });

  elements.remember.addEventListener("change", () => {
    state.remember = elements.remember.checked;
    setRememberSearches(state.remember);
    if (!state.remember) state.history = [];
    renderHistory();
    showToast(state.remember ? "Suchverlauf wird nur lokal gespeichert." : "Lokaler Suchverlauf gelöscht.");
  });

  elements.clearData.addEventListener("click", () => {
    clearLocalData();
    state.selectedRegion = "de";
    state.remember = false;
    state.history = [];
    elements.region.value = "de";
    elements.remember.checked = false;
    renderHistory();
    if (state.currentItem) renderOne(state.currentItem, { updateUrl: false, updateHistory: false, focus: false });
    showToast("Alle lokalen Angaben wurden gelöscht.");
  });

  elements.historyList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-history-query]");
    if (button) runSearch(button.dataset.historyQuery);
  });

  elements.showAbout.addEventListener("click", () => elements.aboutDialog.showModal());
  elements.closeAbout.addEventListener("click", () => elements.aboutDialog.close());
  elements.aboutDialog.addEventListener("click", (event) => {
    if (event.target === elements.aboutDialog) elements.aboutDialog.close();
  });

  window.addEventListener("online", updateConnectivity);
  window.addEventListener("offline", updateConnectivity);
  window.addEventListener("popstate", (event) => {
    const itemId = event.state?.itemId ?? new URL(window.location.href).searchParams.get("item");
    if (!itemId) {
      resetSearch({ updateUrl: false, focus: false });
      return;
    }
    const item = state.items.find((candidate) => candidate.id === itemId);
    if (item) {
      state.lastQuery = item.name;
      renderOne(item, { updateUrl: false, updateHistory: false, focus: false });
    }
  });
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Daten konnten nicht geladen werden: ${path}`);
  return response.json();
}

async function initialize() {
  bindEvents();
  updateConnectivity();

  try {
    const [itemsCatalog, sourcesCatalog, regionsCatalog] = await Promise.all([
      loadJson(DATA_PATHS.items),
      loadJson(DATA_PATHS.sources),
      loadJson(DATA_PATHS.regions)
    ]);

    state.items = itemsCatalog.items;
    state.sources = sourcesCatalog.sources;
    state.sourcesById = new Map(state.sources.map((source) => [source.id, source]));
    state.sourcesEditorialUse = sourcesCatalog.editorialUse;
    state.regions = regionsCatalog.regions;

    const local = loadLocalState();
    state.selectedRegion = state.regions.some((region) => region.id === local.region) ? local.region : "de";
    state.remember = local.remember;
    state.history = local.history;
    elements.remember.checked = state.remember;
    elements.contentDate.textContent = `Inhaltsstand ${formatDate(itemsCatalog.contentDate)}`;
    renderRegions();
    renderHistory();
    renderAbout();

    const requestedItem = new URL(window.location.href).searchParams.get("item");
    const item = state.items.find((candidate) => candidate.id === requestedItem);
    if (item) {
      state.lastQuery = item.name;
      renderOne(item, { updateUrl: false, updateHistory: false, focus: false });
      window.history.replaceState({ itemId: item.id }, "", window.location.href);
    } else {
      window.history.replaceState({ itemId: null }, "", window.location.pathname);
    }
  } catch (error) {
    console.error(error);
    emptyState({
      title: "Die redaktionellen Daten fehlen",
      message: "Bitte neu laden. Offline ist die App erst nach dem ersten vollständigen Aufruf verfügbar.",
      kicker: "Ladefehler"
    });
  }

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (error) {
      console.warn("Offline-Cache konnte nicht aktiviert werden.", error);
    }
  }
}

void initialize();
