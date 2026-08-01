import { isAmbiguous, searchItems, validateItemIntegrity } from "./search.js";
import {
  localizeCatalogs,
  normalizeLanguage,
  translate
} from "./i18n.js";
import {
  addSearchToHistory,
  clearLocalData,
  loadLocalState,
  saveRegion,
  setRememberSearches
} from "./storage.js";

const DATA_PATHS = {
  items: new URL("../public/data/waste-items.v1.json", import.meta.url),
  sources: new URL("../public/data/sources.v1.json", import.meta.url),
  regions: new URL("../public/data/regions.v1.json", import.meta.url),
  locale: new URL("../public/data/locales/en.v1.json", import.meta.url)
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
  trust: document.querySelector(".trust-section"),
  trustHint: document.querySelector(".summary-hint"),
  toast: document.querySelector("#toast")
};

const state = {
  language: normalizeLanguage(document.documentElement.lang),
  catalogs: null,
  contentDate: null,
  items: [],
  sources: [],
  sourcesById: new Map(),
  sourcesEditorialUse: "",
  regions: [],
  selectedRegion: "de",
  remember: false,
  history: [],
  currentItemId: null,
  lastQuery: "",
  view: { type: "idle" },
  toastTimer: null
};

const t = (key, values) => translate(state.language, key, values);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return t("dateMissing");
  return new Intl.DateTimeFormat(state.language === "en" ? "en-GB" : "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00Z`));
}

function applyStaticTranslations() {
  document.title = t("documentTitle");
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("metaDescription"));
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-query-key]").forEach((button) => {
    button.textContent = t(button.dataset.queryKey);
  });
  elements.trustHint.textContent = t(elements.trust.open ? "trustHide" : "trustShow");
}

function selectedRegion() {
  return state.regions.find((region) => region.id === state.selectedRegion) ?? state.regions[0];
}

function effectiveRoute(item) {
  const override = selectedRegion()?.routeOverrides?.[item.route.type];
  if (!override) return { ...item.route, note: null, sourceId: null };
  return { ...item.route, ...override };
}

function certaintyFor(item, integrity) {
  const certainty = integrity.valid ? item.certainty : "check-local";
  if (certainty === "confirmed") return { label: t("certaintyConfirmed"), className: "" };
  if (certainty === "caution") return { label: t("certaintyCaution"), className: "caution" };
  return { label: t("certaintyLocal"), className: "local" };
}

function sourceList(item, route) {
  const ids = [...new Set([...(item.sources ?? []), route.sourceId].filter(Boolean))];
  return ids.map((id) => state.sourcesById.get(id)).filter(Boolean);
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
  window.history[replace ? "replaceState" : "pushState"]({ itemId }, "", `${url.pathname}${url.search}`);
}

function updateUrlForNonSpecificResult(options = {}) {
  if (options.updateUrl === false) return;
  updateUrl(null, !new URL(window.location.href).searchParams.has("item"));
}

function emptyState({ title, message, kicker, type = "idle", query = "" }) {
  state.currentItemId = null;
  state.view = { type, query };
  elements.resultKicker.textContent = kicker;
  elements.resultsTitle.textContent = title;
  elements.status.textContent = message;
  elements.status.hidden = false;
  elements.results.innerHTML = "";
  elements.reset.hidden = type === "idle";
}

function renderIdle() {
  emptyState({
    title: t("resultIdleTitle"),
    message: t("resultIdleStatus"),
    kicker: t("resultReady"),
    type: "idle"
  });
}

function localGuidance(item) {
  const region = selectedRegion();
  if (!region) return "";
  const route = effectiveRoute(item);
  const needed = state.selectedRegion !== "de" || item.certainty !== "confirmed" || Boolean(item.localVariation);
  if (!needed) return "";
  const link = region.url
    ? `<a href="${escapeHtml(region.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("localOpen", { name: region.officialName }))}</a>`
    : escapeHtml(t("localFallback"));
  return `<div class="regional-box"><strong>${escapeHtml(region.label)}</strong>${route.note ? `<p>${escapeHtml(route.note)}</p>` : ""}<p>${escapeHtml(item.localVariation)}</p><p>${link}</p></div>`;
}

function integrityWarning(integrity) {
  if (integrity.valid) return "";
  const details = integrity.issueDetails?.length
    ? integrity.issueDetails.map(({ code, ...values }) => t(code, values))
    : integrity.issues;
  return `<div class="warning-box" role="alert"><strong>${escapeHtml(t("integrityTitle"))}</strong><p>${escapeHtml(t("integrityText"))}</p><ul>${details.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul></div>`;
}

function renderSource(source) {
  const sourceDate = source.sourceDate ? t("sourceDate", { date: formatDate(source.sourceDate) }) : "";
  return `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a><small>${escapeHtml(source.publisher)} · ${escapeHtml(source.scope)}</small><small>${escapeHtml(sourceDate)}${escapeHtml(t("sourceReview", { verified: formatDate(source.verifiedAt), reviewDue: formatDate(source.reviewDue) }))}</small><small>${escapeHtml(source.attribution)}</small></li>`;
}

function renderItem(item, integrity = validateItemIntegrity(item, state.sourcesById, new Date())) {
  const route = effectiveRoute(item);
  const certainty = certaintyFor(item, integrity);
  const sources = sourceList(item, route);
  const warning = item.warning ? `<div class="warning-box"><strong>${escapeHtml(t("important"))}</strong><p>${escapeHtml(item.warning)}</p></div>` : "";
  return `
    <article class="result-card" data-item-id="${escapeHtml(item.id)}">
      <div class="result-main">
        <div class="result-copy">
          <div class="result-title-row"><div><p class="section-kicker">${escapeHtml(item.category)}</p><h3 id="item-${escapeHtml(item.id)}" tabindex="-1">${escapeHtml(item.name)}</h3></div><span class="certainty-badge ${escapeHtml(certainty.className)}">${escapeHtml(certainty.label)}</span></div>
          <p class="answer">${escapeHtml(item.answer)}</p>
          <p class="reason"><strong>${escapeHtml(t("why"))}</strong> ${escapeHtml(item.reason)}</p>
          <ol class="steps">${item.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
          ${warning}${integrityWarning(integrity)}${localGuidance(item)}
        </div>
        <div class="result-route"><span class="route-type">${escapeHtml(t("recommendedRoute"))}</span><h3>${escapeHtml(integrity.valid ? route.label : t("localAdvice"))}</h3><p>${escapeHtml(integrity.valid ? t("routeScope") : t("routeStale"))}</p></div>
      </div>
      <div class="result-details">
        <details><summary>${escapeHtml(t("sourcesAndValidity", { count: sources.length }))}</summary><ul class="source-list">${sources.map(renderSource).join("")}</ul><p><strong>${escapeHtml(t("editorialStatus", { reviewed: formatDate(item.reviewedAt), reviewDue: formatDate(item.reviewDue) }))}</strong></p></details>
        <div class="result-actions"><button class="secondary-button" type="button" data-share="${escapeHtml(item.id)}">${escapeHtml(t("shareHint"))}</button><button class="secondary-button" type="button" data-print="${escapeHtml(item.id)}">${escapeHtml(t("print"))}</button></div>
      </div>
    </article>`;
}

function renderOne(item, options = {}) {
  state.currentItemId = item.id;
  state.view = { type: "item", itemId: item.id };
  elements.resultKicker.textContent = t("resultKicker");
  elements.resultsTitle.textContent = t("resultTitle", { name: item.name });
  elements.status.hidden = true;
  elements.reset.hidden = false;
  elements.results.innerHTML = renderItem(item);
  if (options.updateHistory !== false) {
    state.history = addSearchToHistory(state.lastQuery || item.name);
    renderHistory();
  }
  if (options.updateUrl !== false) updateUrl(item.id);
  if (options.focus !== false) elements.resultsTitle.focus();
}

function renderChoices(items, query) {
  state.currentItemId = null;
  state.view = { type: "choices", query, itemIds: items.map((item) => item.id) };
  elements.resultKicker.textContent = t("ambiguousKicker");
  elements.resultsTitle.textContent = t("ambiguousTitle", { query });
  elements.status.hidden = false;
  elements.status.textContent = t("ambiguousMessage");
  elements.reset.hidden = false;
  elements.results.innerHTML = items.slice(0, 6).map((item) => `<article class="result-card compact"><div><p class="section-kicker">${escapeHtml(item.category)}</p><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.answer)}</p></div><button class="secondary-button" type="button" data-select-item="${escapeHtml(item.id)}" aria-label="${escapeHtml(t("selectAria", { name: item.name }))}">${escapeHtml(t("select"))}</button></article>`).join("");
  state.history = addSearchToHistory(query);
  renderHistory();
  elements.resultsTitle.focus();
}

function runSearch(rawQuery, options = {}) {
  const query = String(rawQuery ?? "").trim().slice(0, 120);
  elements.input.value = query;
  state.lastQuery = query;
  if (query.length < 2) {
    emptyState({ title: t("shortTitle"), message: t("shortMessage"), kicker: t("shortKicker"), type: "short", query });
    updateUrlForNonSpecificResult(options);
    elements.resultsTitle.focus();
    return;
  }
  const results = searchItems(state.items, query, { sourcesById: state.sourcesById, asOf: new Date(), limit: 8 });
  if (results.length === 0) {
    emptyState({ title: t("noMatchTitle", { query }), message: t("noMatchMessage"), kicker: t("unclear"), type: "no-match", query });
    state.history = addSearchToHistory(query);
    renderHistory();
    updateUrlForNonSpecificResult(options);
    elements.resultsTitle.focus();
    return;
  }
  if (isAmbiguous(results)) {
    renderChoices(results.map(({ item }) => item), query);
    updateUrlForNonSpecificResult(options);
    return;
  }
  renderOne(results[0].item, options);
}

function resetSearch({ updateUrl: shouldUpdateUrl = true, focus = true } = {}) {
  state.lastQuery = "";
  elements.input.value = "";
  renderIdle();
  if (shouldUpdateUrl) updateUrl(null);
  if (focus) elements.input.focus();
}

async function shareItem(item) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("item", item.id);
  const text = t("shareText", { name: item.name, answer: item.answer, route: effectiveRoute(item).label, date: formatDate(item.reviewedAt) });
  try {
    if (navigator.share) {
      await navigator.share({ title: t("shareTitle", { name: item.name }), text, url: url.toString() });
      showToast(t("shareOpened"));
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    showToast(t("shareCopied"));
  } catch (error) {
    if (error?.name !== "AbortError") showToast(t("shareUnavailable"));
  }
}

function renderAbout() {
  const rightsSources = state.sources.filter((source) => source.id.includes("rights"));
  elements.aboutContent.innerHTML = `<p>${escapeHtml(t("aboutPrivacy"))}</p><h3>${escapeHtml(t("editorialCatalog"))}</h3><p>${escapeHtml(state.sourcesEditorialUse)}</p><p><strong>${escapeHtml(t("previewRights"))}</strong></p><h3>${escapeHtml(t("sourceRights"))}</h3><ul class="source-list">${rightsSources.map(renderSource).join("")}</ul><h3>${escapeHtml(t("limits"))}</h3><p>${escapeHtml(t("limitsText"))}</p>`;
}

function rebuildLocalizedCatalogs() {
  const localized = localizeCatalogs(state.catalogs, state.language);
  state.items = localized.items;
  state.sources = localized.sources;
  state.sourcesById = new Map(state.sources.map((source) => [source.id, source]));
  state.sourcesEditorialUse = localized.sourcesEditorialUse;
  state.regions = localized.regions;
}

function rerenderView() {
  if (state.view.type === "item") {
    const item = state.items.find((candidate) => candidate.id === state.view.itemId);
    if (item) renderOne(item, { updateUrl: false, updateHistory: false, focus: false });
    return;
  }
  if (state.view.type === "choices") {
    const items = state.view.itemIds.map((id) => state.items.find((item) => item.id === id)).filter(Boolean);
    renderChoices(items, state.view.query);
    return;
  }
  if (state.view.type === "short") {
    emptyState({ title: t("shortTitle"), message: t("shortMessage"), kicker: t("shortKicker"), type: "short", query: state.view.query });
    return;
  }
  if (state.view.type === "no-match") {
    emptyState({ title: t("noMatchTitle", { query: state.view.query }), message: t("noMatchMessage"), kicker: t("unclear"), type: "no-match", query: state.view.query });
    return;
  }
  renderIdle();
}

function applyLanguage(language) {
  state.language = normalizeLanguage(language || document.documentElement.lang);
  document.documentElement.lang = state.language;
  applyStaticTranslations();
  if (!state.catalogs) return;
  rebuildLocalizedCatalogs();
  elements.contentDate.textContent = t("contentDate", { date: formatDate(state.contentDate) });
  renderRegions();
  renderHistory();
  renderAbout();
  rerenderView();
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
  document.querySelectorAll("[data-query-key]").forEach((button) => {
    button.addEventListener("click", () => runSearch(button.dataset[state.language === "en" ? "queryEn" : "queryDe"]));
  });
  elements.results.addEventListener("click", (event) => {
    const selected = event.target.closest("[data-select-item]");
    if (selected) {
      const item = state.items.find((candidate) => candidate.id === selected.dataset.selectItem);
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
  elements.openSettings.addEventListener("click", () => setSettingsOpen(true));
  elements.closeSettings.addEventListener("click", () => setSettingsOpen(false));
  elements.settings.addEventListener("close", () => {
    elements.openSettings.setAttribute("aria-expanded", "false");
    elements.openSettings.focus();
  });
  elements.settings.addEventListener("cancel", () => elements.openSettings.setAttribute("aria-expanded", "false"));
  elements.settings.addEventListener("click", (event) => {
    if (event.target === elements.settings) setSettingsOpen(false);
  });
  elements.region.addEventListener("change", () => {
    state.selectedRegion = elements.region.value;
    saveRegion(state.selectedRegion);
    rerenderView();
    showToast(t("regionToast", { region: selectedRegion().label }));
  });
  elements.remember.addEventListener("change", () => {
    state.remember = elements.remember.checked;
    setRememberSearches(state.remember);
    if (!state.remember) state.history = [];
    renderHistory();
    showToast(t(state.remember ? "historyEnabled" : "historyDisabled"));
  });
  elements.clearData.addEventListener("click", () => {
    clearLocalData();
    state.selectedRegion = "de";
    state.remember = false;
    state.history = [];
    elements.remember.checked = false;
    renderRegions();
    renderHistory();
    rerenderView();
    showToast(t("localDataCleared"));
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
  elements.trust.addEventListener("toggle", () => {
    elements.trustHint.textContent = t(elements.trust.open ? "trustHide" : "trustShow");
  });
  window.addEventListener("online", updateConnectivity);
  window.addEventListener("offline", updateConnectivity);
  window.addEventListener("popstate", (event) => {
    const itemId = event.state?.itemId ?? new URL(window.location.href).searchParams.get("item");
    const item = state.items.find((candidate) => candidate.id === itemId);
    if (item) {
      state.lastQuery = item.name;
      renderOne(item, { updateUrl: false, updateHistory: false, focus: false });
    } else {
      resetSearch({ updateUrl: false, focus: false });
    }
  });
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Data could not be loaded: ${url}`);
  return response.json();
}

async function initialize() {
  bindEvents();
  applyLanguage(document.documentElement.lang);
  updateConnectivity();
  try {
    const [itemsCatalog, sourcesCatalog, regionsCatalog, localeCatalog] = await Promise.all(Object.values(DATA_PATHS).map(loadJson));
    state.catalogs = { itemsCatalog, sourcesCatalog, regionsCatalog, localeCatalog };
    state.contentDate = itemsCatalog.contentDate;
    rebuildLocalizedCatalogs();
    const local = loadLocalState();
    state.selectedRegion = state.regions.some((region) => region.id === local.region) ? local.region : "de";
    state.remember = local.remember;
    state.history = local.history;
    elements.remember.checked = state.remember;
    elements.contentDate.textContent = t("contentDate", { date: formatDate(state.contentDate) });
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
      renderIdle();
      window.history.replaceState({ itemId: null }, "", window.location.pathname);
    }
  } catch (error) {
    console.error(error);
    emptyState({ title: t("dataErrorTitle"), message: t("dataErrorMessage"), kicker: t("dataErrorKicker"), type: "error" });
  }

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register(new URL("../sw.js", import.meta.url));
    } catch (error) {
      console.warn("Offline cache could not be enabled.", error);
    }
  }
}

window.addEventListener("milosapps:localechange", (event) => applyLanguage(event.detail?.locale));
void initialize();
