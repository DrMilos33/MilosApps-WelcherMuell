import "../vendor/milosapps-shell/v2/bootstrap.js";
import {
  isAmbiguous,
  isDirectSearchMatch,
  normalizeText,
  searchItems,
  suggestCorrections,
  suggestedAlternatives,
  validateItemIntegrity
} from "./search.js";
import {
  localizeCatalogs,
  normalizeLanguage,
  translate
} from "./i18n.js";
import { mountSessionOnlyShell } from "./shell-session.js";

mountSessionOnlyShell();

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
  resultsSection: document.querySelector("#results-section"),
  resultsTitle: document.querySelector("#results-title"),
  resultKicker: document.querySelector("#result-kicker"),
  reset: document.querySelector("#reset-search"),
  settings: document.querySelector("#settings-panel"),
  openSettings: document.querySelector("#open-settings"),
  closeSettings: document.querySelector("#close-settings"),
  region: document.querySelector("#region-select"),
  enableOffline: document.querySelector("#enable-offline"),
  offlineSettingStatus: document.querySelector("#offline-setting-status"),
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

function updateUrl(itemId = null, replace = false) {
  const url = new URL(window.location.href);
  const language = url.searchParams.get("lang");
  url.search = "";
  if (language === "en") url.searchParams.set("lang", "en");
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
  elements.resultKicker.hidden = false;
  elements.resultsTitle.textContent = title;
  elements.status.textContent = message;
  elements.status.hidden = false;
  elements.results.innerHTML = type === "no-match" ? renderFallbackGuide() : "";
  elements.resultsSection.dataset.view = type;
  elements.reset.hidden = type === "idle";
  elements.resultsSection.hidden = type === "idle";
}

function renderFallbackGuide() {
  const choices = [
    ["fallbackPlastic", "Plastik", "plastic"],
    ["fallbackPackaging", "Kunststoffverpackung", "plastic packaging"],
    ["fallbackMetal", "Metall", "metal"],
    ["fallbackMetalPackaging", "Metallverpackung", "metal packaging"],
    ["fallbackWood", "Holz", "wood"],
    ["fallbackElectrical", "Elektrogerät", "electrical device"],
    ["fallbackPaper", "Papier", "paper"],
    ["fallbackGlass", "Glas", "glass"],
    ["fallbackFood", "Lebensmittelrest", "food leftovers"],
    ["fallbackRubber", "Gummi", "rubber"],
    ["fallbackConstruction", "Bauschutt", "construction rubble"],
    ["fallbackLeather", "Leder", "leather"],
    ["fallbackCork", "Kork", "cork"],
    ["fallbackComposite", "Mischmaterial", "mixed material"]
  ];
  return `
    <section class="fallback-guide" aria-labelledby="fallback-title">
      <div>
        <p class="section-kicker">${escapeHtml(t("fallbackKicker"))}</p>
        <h3 id="fallback-title">${escapeHtml(t("fallbackTitle"))}</h3>
        <p>${escapeHtml(t("fallbackMessage"))}</p>
      </div>
      <div class="fallback-options">
        ${choices.map(([labelKey, queryDe, queryEn]) => `
          <button type="button" data-fallback-query-de="${escapeHtml(queryDe)}" data-fallback-query-en="${escapeHtml(queryEn)}">
            <span>${escapeHtml(t(labelKey))}</span><span aria-hidden="true">→</span>
          </button>`).join("")}
      </div>
    </section>`;
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

function recognizedSubject(item) {
  const normalizedQuery = normalizeText(state.lastQuery);
  const compactQuery = normalizedQuery.replaceAll(" ", "");
  if (item.id === "rubber-household-item" && /^(gummiband|gummibaender|rubberband|rubberbands|elasticband|elasticbands)$/.test(compactQuery)) {
    return t("recognizedRubberBand");
  }
  const mayUseExactLabel = new Set(["plastic-household-item", "food-and-wrapper", "poster"]);
  if (mayUseExactLabel.has(item.id) || (item.id === "electrical-device" && normalizedQuery === "toaster")) {
    const exactLabel = [item.name, ...(item.aliases ?? [])]
      .find((label) => normalizeText(label) === normalizedQuery);
    if (exactLabel) return exactLabel;
  }
  return item.name;
}

function routeIcon(routeType) {
  let paths = '<path d="M4 21h16M6 21V8l6-4 6 4v13M9 13h6M12 10v6"/>';
  if (routeType === "residual") {
    paths = '<path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>';
  } else if (routeType.includes("paper")) {
    paths = '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v5h4M10 13h5M10 17h5"/>';
  } else if (routeType === "organic" || routeType === "food-conditional") {
    paths = '<path d="M19 4C11 4 6 8 6 14c0 3 2 5 5 5 6 0 8-7 8-15Z"/><path d="M5 21c2-6 6-9 11-12"/>';
  } else if (routeType === "container-glass") {
    paths = '<path d="M9 3h6v4l2 3v11H7V10l2-3Z"/><path d="M9 7h6M9 14h6"/>';
  } else if (routeType === "light-packaging") {
    paths = '<path d="m8 5 2-2 2 2M10 3v6M16 9h3l1 3-2 1M19 12l-5 3M8 19H5l-1-3 2-1M5 16l5-3"/>';
  } else if (routeType === "local-check" || routeType.includes("local") || routeType === "non-packaging-plastic") {
    paths = '<path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/>';
  }
  return `<svg class="route-icon" data-result-icon aria-hidden="true" viewBox="0 0 24 24">${paths}</svg>`;
}

const ROUTE_KEYWORDS = [
  { text: "örtliche Wertstoffsammlung", className: "local" },
  { text: "örtliche Verpackungssammlung", className: "local" },
  { text: "örtliche Problemstoffsammlung", className: "local" },
  { text: "örtlichen Entsorgungsweg prüfen", className: "local" },
  { text: "kommunalen Entsorgungsweg prüfen", className: "local" },
  { text: "örtliche Wertstoffregel beachten", className: "local" },
  { text: "örtliche Regel prüfen", className: "local" },
  { text: "local hazardous-waste collection", className: "local" },
  { text: "municipal disposal route", className: "local" },
  { text: "municipal collection point", className: "local" },
  { text: "local packaging collection", className: "local" },
  { text: "local disposal route", className: "local" },
  { text: "local recycling rules", className: "local" },
  { text: "check the local rule", className: "local" },
  { text: "örtlich prüfen", className: "local" },
  { text: "check locally", className: "local" },
  { text: "Besondere Vorsicht", className: "caution" },
  { text: "Take special care", className: "caution" },
  { text: "Schadstoffmobil", className: "caution" },
  { text: "Problemstoff", className: "caution" },
  { text: "hazardous waste", className: "caution" },
  { text: "Restmüll", className: "residual" },
  { text: "residual waste", className: "residual" },
  { text: "Wertstofftonne", className: "collection" },
  { text: "recycling bin", className: "collection" },
  { text: "Wertstoffhof", className: "collection" },
  { text: "recycling centre", className: "collection" },
  { text: "Gelbe Tonne", className: "collection" },
  { text: "Gelber Sack", className: "collection" },
  { text: "Yellow bin", className: "collection" },
  { text: "yellow bag", className: "collection" },
  { text: "Biotonne", className: "collection" },
  { text: "Papiertonne", className: "collection" },
  { text: "Altglascontainer", className: "collection" },
  { text: "Sammelstelle", className: "collection" },
  { text: "Rücknahmestelle", className: "collection" }
].sort((left, right) => right.text.length - left.text.length);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderDestination(destination, certainty) {
  const expression = new RegExp(`(${ROUTE_KEYWORDS.map(({ text }) => escapeRegExp(text)).join("|")})`, "giu");
  const keywordByText = new Map(ROUTE_KEYWORDS.map((entry) => [entry.text.toLocaleLowerCase(), entry]));
  const matchedClasses = new Set();
  const parts = String(destination).split(expression).map((part) => {
    const keyword = keywordByText.get(part.toLocaleLowerCase());
    if (!keyword) return escapeHtml(part);
    matchedClasses.add(keyword.className);
    return `<span class="route-keyword ${keyword.className}">${escapeHtml(part)}</span>`;
  });
  const destinationAlreadySignalsLocal = /örtlich|local/iu.test(String(destination));
  if (certainty.className === "local" && !matchedClasses.has("local") && !destinationAlreadySignalsLocal) {
    parts.push(`<span class="route-keyword local">${escapeHtml(certainty.label)}</span>`);
  } else if (certainty.className === "caution") {
    parts.push(`<span class="route-keyword caution">${escapeHtml(certainty.label)}</span>`);
  }
  return parts.join("");
}

function renderItem(
  item,
  integrity = validateItemIntegrity(item, state.sourcesById, new Date()),
  relatedItems = []
) {
  const route = effectiveRoute(item);
  const certainty = certaintyFor(item, integrity);
  const sources = sourceList(item, route);
  const warning = item.warning ? `<div class="warning-box"><strong>${escapeHtml(t("important"))}</strong><p>${escapeHtml(item.warning)}</p></div>` : "";
  const destination = integrity.valid ? route.label : t("localAdvice");
  const scope = integrity.valid ? t("routeScope") : t("routeStale");
  return `
    <article class="result-card" data-item-id="${escapeHtml(item.id)}">
      <div class="result-immediate" data-route-type="${escapeHtml(route.type)}">
        <div class="result-symbol">${routeIcon(route.type)}</div>
        <div class="result-path">
          <div class="result-path-part">
            <h3 class="result-subject" id="item-${escapeHtml(item.id)}" tabindex="-1">${escapeHtml(recognizedSubject(item))}</h3>
            <span class="result-category">${escapeHtml(item.category)}</span>
          </div>
          <svg class="result-arrow" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h13M14 7l5 5-5 5" /></svg>
          <div class="result-path-part result-path-destination">
            <strong class="result-destination">${renderDestination(destination, certainty)}</strong>
          </div>
        </div>
      </div>
      <div class="result-copy">
        <p class="answer">${escapeHtml(item.answer)}</p>
        ${renderRelated(relatedItems)}
        <section class="result-reason"><h4>${escapeHtml(t("why"))}</h4><p>${escapeHtml(item.reason)}</p></section>
        <section class="result-steps"><h4>${escapeHtml(t("nextSteps"))}</h4><ol class="steps">${item.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol></section>
        <div class="result-details-content">${warning}${integrityWarning(integrity)}${localGuidance(item)}<p class="result-scope">${escapeHtml(scope)}</p></div>
      </div>
      <div class="result-details">
        <details><summary>${escapeHtml(t("sourcesAndValidity", { count: sources.length }))}</summary><ul class="source-list">${sources.map(renderSource).join("")}</ul><p><strong>${escapeHtml(t("editorialStatus", { reviewed: formatDate(item.reviewedAt), reviewDue: formatDate(item.reviewDue) }))}</strong></p></details>
        <div class="result-actions"><milos-share-button data-share-item="${escapeHtml(item.id)}"></milos-share-button><button class="secondary-button" type="button" data-print="${escapeHtml(item.id)}">${escapeHtml(t("print"))}</button></div>
      </div>
    </article>`;
}

function renderRelated(items) {
  if (items.length === 0) return "";
  return `
    <aside class="related-results" aria-labelledby="related-results-title">
      <div class="related-intro">
        <p class="section-kicker">${escapeHtml(t("relatedKicker"))}</p>
        <h3 id="related-results-title">${escapeHtml(t("relatedTitle"))}</h3>
        <p>${escapeHtml(t("relatedMessage"))}</p>
      </div>
      <div class="related-list">
        ${items.map((item) => `
          <button class="related-choice" type="button" data-select-item="${escapeHtml(item.id)}" aria-label="${escapeHtml(t("selectAria", { name: item.name }))}">
            <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.route.label)}</small></span>
            <span aria-hidden="true">→</span>
          </button>`).join("")}
      </div>
    </aside>`;
}

function sharePayload(item) {
  const url = new URL(window.location.href);
  const language = url.searchParams.get("lang");
  url.search = "";
  if (language === "en") url.searchParams.set("lang", "en");
  url.searchParams.set("item", item.id);
  const route = effectiveRoute(item);
  const source = sourceList(item, route)[0];
  const summary = t("shareText", {
    name: item.name,
    answer: item.answer,
    route: route.label,
    date: formatDate(item.reviewedAt)
  });
  const attribution = source
    ? t("shareSource", { publisher: source.publisher, title: source.title })
    : "";
  return {
    title: t("shareTitle", { name: item.name }),
    text: [summary, attribution].filter(Boolean).join(" "),
    url: url.toString()
  };
}

function configureShareButtons() {
  elements.results.querySelectorAll("milos-share-button[data-share-item]").forEach((button) => {
    const item = state.items.find((candidate) => candidate.id === button.dataset.shareItem);
    if (item) button.setPayloadProvider(() => sharePayload(item));
  });
}

function renderOne(item, options = {}) {
  const relatedItems = options.relatedItems ?? [];
  state.currentItemId = item.id;
  state.view = {
    type: "item",
    itemId: item.id,
    query: options.query ?? state.lastQuery,
    relatedItemIds: relatedItems.map((relatedItem) => relatedItem.id)
  };
  elements.resultKicker.textContent = t("resultKicker");
  elements.resultKicker.hidden = true;
  elements.resultsTitle.textContent = t("resultTitle");
  elements.status.hidden = true;
  elements.reset.hidden = false;
  elements.resultsSection.hidden = false;
  elements.resultsSection.dataset.view = "item";
  elements.results.innerHTML = renderItem(item, undefined, relatedItems);
  configureShareButtons();
  if (options.updateUrl !== false) updateUrl(item.id);
  if (options.focus !== false) elements.resultsTitle.focus();
}

function renderChoices(items, query) {
  state.currentItemId = null;
  state.view = { type: "choices", query, itemIds: items.map((item) => item.id) };
  elements.resultKicker.textContent = t("ambiguousKicker");
  elements.resultKicker.hidden = false;
  elements.resultsTitle.textContent = t("ambiguousTitle", { query });
  elements.status.hidden = false;
  elements.status.textContent = t("ambiguousMessage");
  elements.reset.hidden = false;
  elements.resultsSection.hidden = false;
  elements.resultsSection.dataset.view = "choices";
  elements.results.innerHTML = items.slice(0, 6).map((item) => `<article class="result-card compact"><div><p class="section-kicker">${escapeHtml(item.category)}</p><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.answer)}</p></div><button class="secondary-button" type="button" data-select-item="${escapeHtml(item.id)}" aria-label="${escapeHtml(t("selectAria", { name: item.name }))}">${escapeHtml(t("select"))}</button></article>`).join("");
  elements.resultsTitle.focus();
}

function renderCorrections(corrections, query) {
  const single = corrections.length === 1;
  state.currentItemId = null;
  state.view = { type: "corrections", query };
  elements.resultKicker.textContent = t("correctionKicker");
  elements.resultKicker.hidden = false;
  elements.resultsTitle.textContent = single
    ? t("correctionTitleSingle", { term: corrections[0].term })
    : t("correctionTitleMultiple");
  elements.status.hidden = false;
  elements.status.textContent = t("correctionMessage");
  elements.reset.hidden = false;
  elements.resultsSection.hidden = false;
  elements.resultsSection.dataset.view = "corrections";
  elements.results.innerHTML = corrections.map((correction) => `
    <article class="result-card compact correction-card">
      <div>
        <p class="section-kicker">${escapeHtml(t("correctionSuggestion"))}</p>
        <h3>${escapeHtml(correction.term)}</h3>
        <p>${escapeHtml(correction.item.category)}</p>
      </div>
      <button class="secondary-button" type="button" data-correction-query="${escapeHtml(correction.term)}">
        ${escapeHtml(t("correctionSelect", { term: correction.term }))}
      </button>
    </article>`).join("");
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
  const directResults = results.filter(isDirectSearchMatch);
  if (directResults.length === 0) {
    const corrections = suggestCorrections(state.items, query, { limit: 4 });
    if (corrections.length > 0) {
      renderCorrections(corrections, query);
      updateUrlForNonSpecificResult(options);
      return;
    }
    emptyState({ title: t("noMatchTitle", { query }), message: t("noMatchMessage"), kicker: t("unclear"), type: "no-match", query });
    updateUrlForNonSpecificResult(options);
    elements.resultsTitle.focus();
    return;
  }
  if (isAmbiguous(directResults)) {
    renderChoices(directResults.map(({ item }) => item), query);
    updateUrlForNonSpecificResult(options);
    return;
  }
  const primaryItem = directResults[0].item;
  renderOne(primaryItem, {
    ...options,
    query,
    relatedItems: suggestedAlternatives(state.items, primaryItem, query)
  });
}

function resetSearch({ updateUrl: shouldUpdateUrl = true, focus = true } = {}) {
  state.lastQuery = "";
  elements.input.value = "";
  renderIdle();
  if (shouldUpdateUrl) updateUrl(null);
  if (focus) elements.input.focus();
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
    const relatedItems = (state.view.relatedItemIds ?? [])
      .map((id) => state.items.find((candidate) => candidate.id === id))
      .filter(Boolean);
    if (item) renderOne(item, {
      updateUrl: false,
      updateHistory: false,
      focus: false,
      query: state.view.query,
      relatedItems
    });
    return;
  }
  if (state.view.type === "choices") {
    const items = state.view.itemIds.map((id) => state.items.find((item) => item.id === id)).filter(Boolean);
    renderChoices(items, state.view.query);
    return;
  }
  if (state.view.type === "corrections") {
    const corrections = suggestCorrections(state.items, state.view.query, { limit: 4 });
    if (corrections.length > 0) renderCorrections(corrections, state.view.query);
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
    const correction = event.target.closest("[data-correction-query]");
    if (correction) {
      runSearch(correction.dataset.correctionQuery);
      return;
    }
    const fallback = event.target.closest("[data-fallback-query-de]");
    if (fallback) {
      runSearch(fallback.dataset[state.language === "en" ? "fallbackQueryEn" : "fallbackQueryDe"]);
      return;
    }
    const selected = event.target.closest("[data-select-item]");
    if (selected) {
      const item = state.items.find((candidate) => candidate.id === selected.dataset.selectItem);
      if (item) renderOne(item);
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
    rerenderView();
    showToast(t("regionToast", { region: selectedRegion().label }));
  });
  elements.enableOffline.addEventListener("click", enableOffline);
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

async function removeLegacyOfflineState() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  const legacy = registrations.filter((registration) => {
    const scriptUrl = registration.active?.scriptURL ?? registration.waiting?.scriptURL ?? registration.installing?.scriptURL ?? "";
    return new URL(scriptUrl, window.location.href).pathname.endsWith("/sw.js");
  });
  if (legacy.length === 0) return;
  await Promise.all(legacy.map((registration) => registration.unregister()));
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("waste-guide-")).map((name) => caches.delete(name)));
  }
}

async function enableOffline() {
  elements.enableOffline.disabled = true;
  elements.offlineSettingStatus.hidden = false;
  elements.offlineSettingStatus.textContent = t("offlineEnabling");
  try {
    if (!("serviceWorker" in navigator)) throw new Error("Service worker unavailable");
    await navigator.serviceWorker.register(new URL("../offline-sw.js", import.meta.url));
    await navigator.serviceWorker.ready;
    elements.enableOffline.textContent = t("offlineReady");
    elements.offlineSettingStatus.textContent = t("offlineReadyHelp");
    showToast(t("offlineReady"));
  } catch (error) {
    console.warn("Offline cache could not be enabled.", error);
    elements.enableOffline.disabled = false;
    elements.offlineSettingStatus.textContent = t("offlineUnavailable");
  }
}

async function initialize() {
  try {
    await removeLegacyOfflineState();
  } catch (error) {
    console.warn("Legacy offline files could not be removed.", error);
  }
  bindEvents();
  applyLanguage(document.documentElement.lang);
  updateConnectivity();
  try {
    const [itemsCatalog, sourcesCatalog, regionsCatalog, localeCatalog] = await Promise.all(Object.values(DATA_PATHS).map(loadJson));
    state.catalogs = { itemsCatalog, sourcesCatalog, regionsCatalog, localeCatalog };
    state.contentDate = itemsCatalog.contentDate;
    rebuildLocalizedCatalogs();
    state.selectedRegion = "de";
    elements.contentDate.textContent = t("contentDate", { date: formatDate(state.contentDate) });
    renderRegions();
    renderAbout();
    const requestedItem = new URL(window.location.href).searchParams.get("item");
    const item = state.items.find((candidate) => candidate.id === requestedItem);
    if (item) {
      state.lastQuery = item.name;
      renderOne(item, { updateUrl: false, updateHistory: false, focus: false });
      window.history.replaceState({ itemId: item.id }, "", window.location.href);
    } else {
      renderIdle();
      updateUrl(null, true);
    }
  } catch (error) {
    console.error(error);
    emptyState({ title: t("dataErrorTitle"), message: t("dataErrorMessage"), kicker: t("dataErrorKicker"), type: "error" });
  }

  globalThis.milosAppEssentials.ready();

}

window.addEventListener("milosapps:localechange", (event) => applyLanguage(event.detail?.locale));
void initialize();
