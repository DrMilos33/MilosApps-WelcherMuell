import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = 4318;
const baseUrl = `http://${host}:${port}`;
const expectedContentVersion = "2026.08.01-1";
const artifacts = new URL("../../test-results/qa/", import.meta.url);
const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = chromeCandidates.find(existsSync);

if (!executablePath) {
  throw new Error("Für den lokalen E2E-Lauf wurde kein Chrome- oder Edge-Browser gefunden.");
}

await mkdir(artifacts, { recursive: true });

let serverOutput = "";

function isExpectedIdentity(health) {
  return (
    health?.appKey === "waste-guide" &&
    health?.environment === "DEV" &&
    health?.contentVersion === expectedContentVersion &&
    health?.productionApproved === false
  );
}

async function inspectExistingServer() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  let response;
  try {
    response = await fetch(`${baseUrl}/healthz`, { signal: controller.signal });
  } catch (error) {
    if (error?.cause?.code === "ECONNREFUSED") return false;
    if (error?.name === "AbortError") {
      throw new Error(`Port ${port} antwortet, aber die App-Identität konnte nicht rechtzeitig geprüft werden.`);
    }
    throw new Error(`Port ${port} konnte nicht sicher als frei bestätigt werden: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }

  let health = null;
  if (response.headers.get("content-type")?.includes("application/json")) {
    try {
      health = await response.json();
    } catch {
      health = null;
    }
  }
  if (response.ok && isExpectedIdentity(health)) return true;
  throw new Error(
    `Port ${port} ist durch einen fremden oder ungültigen Dienst belegt ` +
    `(HTTP ${response.status}, appKey=${health?.appKey ?? "fehlt"}, environment=${health?.environment ?? "fehlt"}).`
  );
}

const reuseExistingServer = await inspectExistingServer();
let server = null;
if (reuseExistingServer) {
  console.log("E2E-Preflight: vorhandener waste-guide-DEV auf Port 4318 eindeutig bestätigt.");
} else {
  server = spawn(process.execPath, ["scripts/dev-server.mjs"], {
    cwd: new URL("../../", import.meta.url),
    env: {
      ...process.env,
      WASTE_GUIDE_HOST: host,
      WASTE_GUIDE_PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk;
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk;
  });
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  let lastReadiness = "keine Antwort";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      const health = response.headers.get("content-type")?.includes("application/json")
        ? await response.json()
        : null;
      if (
        response.ok &&
        isExpectedIdentity(health)
      ) {
        return;
      }
      lastReadiness = `HTTP ${response.status}, appKey=${health?.appKey ?? "fehlt"}, environment=${health?.environment ?? "fehlt"}`;
    } catch (error) {
      lastReadiness = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`App-spezifische Readiness für waste-guide fehlgeschlagen (${lastReadiness}). ${serverOutput}`);
}

const results = [];

async function check(name, operation) {
  const started = performance.now();
  try {
    await operation();
    const duration = Math.round(performance.now() - started);
    results.push({ name, status: "PASS", duration });
    console.log(`PASS ${name} (${duration} ms)`);
  } catch (error) {
    results.push({ name, status: "FAIL", error });
    console.error(`FAIL ${name}\n${error.stack || error.message}`);
  }
}

function collectPageErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

async function submitSearch(page, query) {
  await page.getByLabel(/Gegenstand oder Material|Item or material/).fill(query);
  await page.getByRole("button", { name: /Suchen|Search/ }).click();
}

await waitForServer();
const browser = await chromium.launch({ executablePath, headless: true });

try {
  await check("Healthcheck und stabile Direkt-URL", async () => {
    const response = await fetch(`${baseUrl}/healthz`);
    assert.equal(response.status, 200);
    const health = await response.json();
    assert.deepEqual(
      {
        appKey: health.appKey,
        environment: health.environment,
        contentVersion: health.contentVersion,
        productionApproved: health.productionApproved
      },
      {
        appKey: "waste-guide",
        environment: "DEV",
        contentVersion: expectedContentVersion,
        productionApproved: false
      }
    );

    const direct = await fetch(`${baseUrl}/?item=battery`);
    assert.equal(direct.status, 200);
    assert.match(await direct.text(), /Welcher Müll/);

    const csp = direct.headers.get("content-security-policy");
    assert.equal(
      csp,
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
    );
    assert.doesNotMatch(csp, /unsafe-inline|sha256-|nonce-/);

    for (const stylesheet of ["milos-app-shell.css", "milos-app-shell-theme.css"]) {
      const response = await fetch(`${baseUrl}/vendor/milosapps-shell/v2/${stylesheet}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "text/css; charset=utf-8");
    }

    for (const [file, mime] of [
      ["bootstrap.js", "text/javascript; charset=utf-8"],
      ["milos-app-essentials.js", "text/javascript; charset=utf-8"],
      ["milos-app-essentials.css", "text/css; charset=utf-8"],
      ["milos-app-essentials-theme.css", "text/css; charset=utf-8"],
      ["essentials-lock.json", "application/json; charset=utf-8"]
    ]) {
      const response = await fetch(`${baseUrl}/vendor/milosapps-essentials/v1/${file}`);
      assert.equal(response.status, 200, file);
      assert.equal(response.headers.get("content-type"), mime, file);
    }
    const icon = await fetch(`${baseUrl}/assets/icon.svg`);
    assert.equal(icon.status, 200);
    assert.equal(icon.headers.get("content-type"), "image/svg+xml");
    const offlineWorker = await fetch(`${baseUrl}/offline-sw.js`);
    assert.equal(offlineWorker.status, 200);
    assert.equal(offlineWorker.headers.get("content-type"), "text/javascript; charset=utf-8");
  });

  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
    serviceWorkers: "allow"
  });
  await desktop.addInitScript(() => {
    window.__storageCalls = [];
    for (const method of ["getItem", "setItem", "removeItem", "clear"]) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value(...args) {
          window.__storageCalls.push({ method, args });
          return original.apply(this, args);
        }
      });
    }
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        async writeText(value) {
          window.__copiedText = value;
        }
      },
      configurable: true
    });
    window.print = () => {
      window.__printCalled = true;
    };
  });
  const desktopPage = await desktop.newPage();
  const desktopErrors = collectPageErrors(desktopPage);

  await check("Desktop: Start, Semantik und exakter Suchfluss", async () => {
    await desktopPage.goto(baseUrl, { waitUntil: "networkidle" });
    await assert.doesNotReject(() => desktopPage.getByRole("heading", { name: "Welcher Müll?", level: 1 }).waitFor());
    assert.equal(await desktopPage.getByRole("search").count(), 1);
    assert.equal(await desktopPage.getByLabel("Gegenstand oder Material").getAttribute("maxlength"), "120");
    await submitSearch(desktopPage, "Joghurtbecher");
    await desktopPage.getByRole("heading", { name: "Joghurtbecher", exact: true }).waitFor();
    await assert.doesNotReject(() => desktopPage.getByText(/Gelbe Tonne, Gelber Sack/).first().waitFor());
    await assert.doesNotReject(() => desktopPage.getByText("Bundesweit belegt").waitFor());
    assert.match(desktopPage.url(), /\?item=yogurt-cup$/);
    await desktopPage.screenshot({
      path: fileURLToPath(new URL("desktop-result.png", artifacts)),
      fullPage: true
    });
  });

  await check("Desktop: kein Scheinbanner und kein optionaler Browserspeicher", async () => {
    assert.equal(await desktopPage.locator("[data-milos-privacy-notice]").count(), 0);
    const privacyLink = desktopPage.locator("[data-milos-privacy-info]");
    await privacyLink.waitFor();
    assert.equal(await privacyLink.getAttribute("href"), "https://dev.milos-apps.de/datenschutz");
    assert.deepEqual(await desktop.cookies(), []);
    assert.deepEqual(await desktopPage.evaluate(() => window.__storageCalls), []);
    assert.deepEqual(await desktopPage.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })), { local: 0, session: 0 });
  });

  await check("Desktop: v2-Shell, vollständiges Englisch und Reload-Persistenz", async () => {
    await desktopPage.goto(baseUrl, { waitUntil: "networkidle" });
    const shell = desktopPage.locator("milos-app-shell");
    await shell.waitFor();
    const shellRuntime = await shell.evaluate((element) => {
      const shadowStylesheet = element.shadowRoot.querySelector('link[rel="stylesheet"]');
      const themeStylesheet = document.querySelector('link[data-milos-app-shell-theme="waste-guide"]');
      const brand = element.shadowRoot.querySelector(".brand");
      const control = element.shadowRoot.querySelector(".control");
      const icon = element.shadowRoot.querySelector(".app-icon");
      const controlRect = control.getBoundingClientRect();
      return {
        shadowStylesheet: shadowStylesheet?.href,
        themeStylesheet: themeStylesheet?.href,
        inlineShadowStyles: element.shadowRoot.querySelectorAll("style").length,
        inlineHostStyle: element.hasAttribute("style"),
        hostDisplay: getComputedStyle(element).display,
        brandDisplay: getComputedStyle(brand).display,
        controlWidth: Math.round(controlRect.width),
        controlHeight: Math.round(controlRect.height),
        iconWidth: Math.round(icon.getBoundingClientRect().width),
        accent: getComputedStyle(element).getPropertyValue("--milos-shell-accent").trim()
      };
    });
    assert.equal(shellRuntime.shadowStylesheet, `${baseUrl}/vendor/milosapps-shell/v2/milos-app-shell.css`);
    assert.equal(shellRuntime.themeStylesheet, `${baseUrl}/vendor/milosapps-shell/v2/milos-app-shell-theme.css`);
    assert.equal(shellRuntime.inlineShadowStyles, 0);
    assert.equal(shellRuntime.inlineHostStyle, false);
    assert.equal(shellRuntime.hostDisplay, "grid");
    assert.equal(shellRuntime.brandDisplay, "flex");
    assert.ok(shellRuntime.controlWidth >= 44 && shellRuntime.controlHeight >= 44, JSON.stringify(shellRuntime));
    assert.equal(shellRuntime.iconWidth, 38);
    assert.equal(shellRuntime.accent, "#d9ff56");
    assert.equal(await shell.getByText("MilosApps", { exact: true }).count(), 2);
    assert.equal(await shell.getByText("DEV", { exact: true }).count(), 1);
    assert.equal(await shell.getByRole("link", { name: /Alle Apps/ }).getAttribute("href"), "https://dev.milos-apps.de/apps");
    assert.equal(await shell.getByRole("link", { name: "Impressum" }).getAttribute("href"), "https://dev.milos-apps.de/impressum");
    assert.equal(await shell.locator("footer").getByRole("link", { name: "Datenschutz" }).getAttribute("href"), "https://dev.milos-apps.de/datenschutz");
    const englishButton = shell.getByRole("button", { name: "EN", exact: true });
    await englishButton.click();
    await desktopPage.locator("html[lang='en']").waitFor();
    assert.match(desktopPage.url(), /[?&]lang=en(?:&|$)/);
    await desktopPage.reload({ waitUntil: "networkidle" });
    await desktopPage.getByRole("heading", { name: "Waste guide", level: 1 }).waitFor();
    assert.equal(await desktopPage.getByLabel("Item or material").getAttribute("placeholder"), "e.g. rubber band, battery, pizza box");
    await submitSearch(desktopPage, "rubber band");
    await desktopPage.getByRole("heading", { name: "Rubber band", exact: true }).waitFor();
    await desktopPage.getByText("Small items: residual waste · large items and tires: check locally", { exact: true }).waitFor();
    await desktopPage.getByText(/Car and motorcycle tires do not belong/).waitFor();
    assert.equal(await desktopPage.getByRole("button", { name: "Share", exact: true }).count(), 1);
    await desktopPage.getByRole("button", { name: "Region", exact: true }).click();
    await desktopPage.getByRole("dialog", { name: "Region", exact: true }).waitFor();
    assert.equal(await desktopPage.getByLabel("Broad region").locator("option").first().textContent(), "Germany — general guidance");
    await desktopPage.getByRole("button", { name: "Close settings" }).click();
    await desktopPage.locator(".trust-section > summary").click();
    await desktopPage.getByRole("button", { name: "All sources & privacy" }).click();
    const englishAbout = desktopPage.getByRole("dialog", { name: "Sources, rights & privacy" });
    await englishAbout.getByRole("heading", { name: "License evidence for the main sources" }).waitFor();
    await desktopPage.getByRole("button", { name: "Close dialog" }).click();
    await desktopPage.reload({ waitUntil: "networkidle" });
    assert.equal(await desktopPage.locator("html").getAttribute("lang"), "en");
    await desktopPage.getByRole("heading", { name: "Waste guide", level: 1 }).waitFor();
    await shell.getByRole("button", { name: "DE", exact: true }).click();
    await desktopPage.locator("html[lang='de']").waitFor();
    assert.doesNotMatch(desktopPage.url(), /[?&]lang=/);
    assert.deepEqual(await desktopPage.evaluate(() => window.__storageCalls), []);
  });

  await check("Desktop: Suche dominiert und Zusatzinfos bleiben kompakt", async () => {
    await desktopPage.goto(baseUrl, { waitUntil: "networkidle" });
    const geometry = await desktopPage.evaluate(() => {
      const hero = document.querySelector(".hero").getBoundingClientRect();
      const search = document.querySelector(".search-control").getBoundingClientRect();
      const mainContent = document.querySelector(".hero").getBoundingClientRect();
      const trust = document.querySelector(".trust-section");
      return {
        heroHeight: Math.round(hero.height),
        searchBottom: Math.round(search.bottom),
        contentWidth: Math.round(mainContent.width),
        idleResultsHidden: document.querySelector(".results-section").hidden,
        trustCollapsed: trust instanceof HTMLDetailsElement && !trust.open,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });
    assert.ok(geometry.heroHeight <= 180, `Hero zu hoch: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.searchBottom <= 300, `Suche zu spät sichtbar: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.contentWidth <= 960, `Inhalt zu breit: ${JSON.stringify(geometry)}`);
    assert.equal(geometry.idleResultsHidden, true);
    assert.equal(geometry.trustCollapsed, true);
    assert.ok(geometry.horizontalOverflow <= 1, `horizontaler Überlauf: ${JSON.stringify(geometry)}`);

    await submitSearch(desktopPage, "Plastikblume");
    await desktopPage.getByRole("heading", { name: "Plastikblume", exact: true }).waitFor();
    await desktopPage.screenshot({
      path: fileURLToPath(new URL("desktop-plastic-flower.png", artifacts)),
      fullPage: true
    });
    await desktopPage.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await desktopPage.waitForTimeout(100);
    const stickyTop = await desktopPage.locator(".search-dock").evaluate((element) => Math.round(element.getBoundingClientRect().top));
    assert.ok(stickyTop >= 0 && stickyTop <= 16, `Suche bleibt beim Ergebnislesen nicht erreichbar: ${stickyTop}px`);
    await desktopPage.evaluate(() => window.scrollTo(0, 0));
  });

  await check("Desktop: Einstellungen sind ein kompakter runder Dialog", async () => {
    await desktopPage.getByRole("button", { name: "Region", exact: true }).click();
    const settingsDialog = desktopPage.getByRole("dialog", { name: "Region", exact: true });
    await settingsDialog.waitFor();
    const geometry = await settingsDialog.evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect();
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        radius: Number.parseFloat(getComputedStyle(dialog).borderTopLeftRadius)
      };
    });
    assert.ok(geometry.width <= 640, `Einstellungsdialog zu breit: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.height <= 500, `Einstellungsdialog zu hoch: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.radius >= 24, `Einstellungsdialog zu eckig: ${JSON.stringify(geometry)}`);
    assert.equal(await settingsDialog.getByText(/Letzte Suchen merken|Lokale Angaben löschen/).count(), 0);
    await desktopPage.screenshot({
      path: fileURLToPath(new URL("settings-dialog.png", artifacts))
    });
    await desktopPage.getByRole("button", { name: "Einstellungen schließen" }).click();
  });

  await check("Desktop: Tippfehler, Umlaute, Plural und Sicherheitspriorität", async () => {
    const cases = [
      ["Joghurbecher", "Joghurtbecher"],
      ["Akkus", "Batterie oder Akku"],
      ["Plastikschüssel", "Plastikschüssel"],
      ["elektrische Zahnbürste", "Elektrogerät"],
      ["elektronisches Plastikspielzeug", "Elektrogerät"],
      ["aufgeblähter Handyakku", "Aufgeblähter oder beschädigter Akku"]
    ];
    for (const [query, heading] of cases) {
      await submitSearch(desktopPage, query);
      await desktopPage.getByRole("heading", { name: heading, exact: true }).waitFor();
    }
    await assert.doesNotReject(() => desktopPage.getByText(/Bei Rauch, Zischen/).waitFor());
  });

  await check("Desktop: Mehrdeutigkeit wird nicht geraten", async () => {
    await submitSearch(desktopPage, "Glas");
    await desktopPage.getByRole("heading", { name: /Was meinst du mit „Glas“/ }).waitFor();
    await assert.doesNotReject(() => desktopPage.getByRole("heading", { name: "Glasverpackung" }).waitFor());
    await assert.doesNotReject(() => desktopPage.getByRole("heading", { name: "Trinkglas" }).waitFor());
    assert.equal(await desktopPage.getByRole("button", { name: "Glasverpackung auswählen" }).count(), 1);
    assert.equal(await desktopPage.getByRole("button", { name: "Trinkglas auswählen" }).count(), 1);
    assert.doesNotMatch(desktopPage.url(), /\?item=/);
  });

  await check("Desktop: unklare Zustände entfernen veraltete Deep-Links", async () => {
    await desktopPage.getByRole("button", { name: "Glasverpackung auswählen" }).click();
    await desktopPage.getByRole("heading", { name: "Glasverpackung", exact: true }).waitFor();
    assert.match(desktopPage.url(), /\?item=glass-container$/);

    await submitSearch(desktopPage, "quantenmüll xyz");
    await desktopPage.getByRole("heading", { name: /Kein sicherer Treffer/ }).waitFor();
    assert.doesNotMatch(desktopPage.url(), /\?item=/);
    await desktopPage.goBack();
    await desktopPage.getByRole("heading", { name: "Glasverpackung", exact: true }).waitFor();

    await submitSearch(desktopPage, "x");
    await desktopPage.getByRole("heading", { name: "Bitte etwas genauer" }).waitFor();
    assert.doesNotMatch(desktopPage.url(), /\?item=/);
  });

  await check("Desktop: regionale Korrektur bleibt auf die geöffnete Seite begrenzt", async () => {
    await desktopPage.getByRole("button", { name: "Region", exact: true }).click();
    await desktopPage.getByLabel("Grobe Region").selectOption("munich");
    await desktopPage.getByRole("button", { name: "Einstellungen schließen" }).click();
    await submitSearch(desktopPage, "Joghurtbecher");
    await assert.doesNotReject(() => desktopPage.getByText("Wertstoffinsel für Kunststoff und Metall").waitFor());
    assert.deepEqual(await desktopPage.evaluate(() => window.__storageCalls), []);
    await desktopPage.reload({ waitUntil: "networkidle" });
    await desktopPage.getByRole("button", { name: "Region", exact: true }).click();
    assert.equal(await desktopPage.getByLabel("Grobe Region").inputValue(), "de");
    await desktopPage.getByRole("button", { name: "Einstellungen schließen" }).click();
  });

  await check("Desktop: schnelle Rücknavigation stellt Ergebnisse wieder her", async () => {
    await submitSearch(desktopPage, "Batterie");
    await desktopPage.getByRole("heading", { name: "Batterie oder Akku", exact: true }).waitFor();
    await submitSearch(desktopPage, "Medikamente");
    await desktopPage.getByRole("heading", { name: "Alte Medikamente", exact: true }).waitFor();
    await desktopPage.goBack();
    await desktopPage.getByRole("heading", { name: "Batterie oder Akku", exact: true }).waitFor();
    await desktopPage.goForward();
    await desktopPage.getByRole("heading", { name: "Alte Medikamente", exact: true }).waitFor();
  });

  await check("Desktop: Teilen-Fallback und Drucken enthalten keinen Suchverlauf", async () => {
    await desktopPage.getByRole("button", { name: "Teilen", exact: true }).click();
    await assert.doesNotReject(() => desktopPage.getByText("Link kopiert", { exact: true }).waitFor());
    const copied = await desktopPage.evaluate(() => window.__copiedText);
    assert.match(copied, /Alte Medikamente/);
    assert.match(copied, /\?item=medicine/);
    assert.match(copied, /Quelle:/);
    assert.doesNotMatch(copied, /Joghurtbecher/);
    await desktopPage.getByRole("button", { name: "Drucken" }).click();
    assert.equal(await desktopPage.evaluate(() => window.__printCalled), true);
  });

  await check("Desktop: natives Teilen und Abbruch bleiben sichere Nutzeraktionen", async () => {
    await desktopPage.evaluate(() => {
      Object.defineProperty(navigator, "share", {
        value: async (payload) => { window.__sharedPayload = payload; },
        configurable: true
      });
    });
    const shareButton = desktopPage.getByRole("button", { name: "Teilen", exact: true });
    const beforeShare = await shareButton.boundingBox();
    await shareButton.click();
    await desktopPage.waitForTimeout(80);
    const payload = await desktopPage.evaluate(() => window.__sharedPayload);
    assert.match(payload.text, /Alte Medikamente/);
    assert.match(payload.text, /Quelle:/);
    assert.match(payload.url, /\?item=medicine$/);
    assert.doesNotMatch(JSON.stringify(payload), /Joghurtbecher/);
    assert.equal(await desktopPage.locator("[data-milos-share-status]").textContent(), "");
    assert.deepEqual(await shareButton.boundingBox(), beforeShare);

    await desktopPage.evaluate(() => {
      Object.defineProperty(navigator, "share", {
        value: async () => { throw new DOMException("Abgebrochen", "AbortError"); },
        configurable: true
      });
    });
    await shareButton.click();
    assert.equal(await shareButton.isEnabled(), true);
    assert.equal(await desktopPage.locator("[data-milos-share-status]").textContent(), "");
    assert.deepEqual(await shareButton.boundingBox(), beforeShare);
  });

  await check("Desktop: Tastatur und Dialog-Fokus", async () => {
    await desktopPage.goto(baseUrl, { waitUntil: "networkidle" });
    await desktopPage.locator("body").press("Tab");
    let reachedSearch = false;
    for (let index = 0; index < 8; index += 1) {
      const activeId = await desktopPage.evaluate(() => document.activeElement?.id);
      if (activeId === "waste-query") {
        reachedSearch = true;
        break;
      }
      await desktopPage.keyboard.press("Tab");
    }
    assert.equal(reachedSearch, true);
    await desktopPage.keyboard.type("Kassenzettel");
    await desktopPage.keyboard.press("Enter");
    await desktopPage.getByRole("heading", { name: "Kassenzettel", exact: true }).waitFor();

    await desktopPage.locator(".trust-section > summary").click();
    await desktopPage.getByRole("button", { name: "Alle Quellen & Datenschutz" }).click();
    const aboutDialog = desktopPage.getByRole("dialog");
    await aboutDialog.waitFor();
    const radius = await aboutDialog.evaluate((dialog) => Number.parseFloat(getComputedStyle(dialog).borderTopLeftRadius));
    assert.ok(radius >= 24, `Transparenzdialog zu eckig: ${radius}px`);
    await desktopPage.getByRole("button", { name: "Dialog schließen" }).focus();
    await desktopPage.keyboard.press("Enter");
    assert.equal(await desktopPage.getByRole("dialog").isVisible(), false);
  });

  await check("Desktop: Screenreader-Namen und Live-Status", async () => {
    await desktopPage.goto(baseUrl, { waitUntil: "networkidle" });
    const unnamedControls = await desktopPage.locator("button, input, select, a[href]").evaluateAll((controls) => {
      return controls
        .filter((control) => {
          const style = getComputedStyle(control);
          if (style.display === "none" || style.visibility === "hidden") return false;
          const name =
            control.getAttribute("aria-label") ||
            control.labels?.[0]?.textContent ||
            control.textContent ||
            control.getAttribute("title");
          return !name?.trim();
        })
        .map((control) => control.outerHTML);
    });
    assert.deepEqual(unnamedControls, []);
    assert.equal(await desktopPage.locator("#search-status").getAttribute("aria-live"), "polite");
    await submitSearch(desktopPage, "x");
    await assert.doesNotReject(() => desktopPage.getByRole("heading", { name: "Bitte etwas genauer" }).waitFor());
  });

  await check("Desktop: Reduced Motion und Shell-Fokus bleiben wirksam", async () => {
    await desktopPage.emulateMedia({ reducedMotion: "reduce" });
    await desktopPage.goto(baseUrl, { waitUntil: "networkidle" });
    const shell = desktopPage.locator("milos-app-shell");
    const durations = await shell.evaluate((element) => {
      const control = element.shadowRoot.querySelector(".control");
      const appButton = document.querySelector(".quick-search button");
      return {
        shell: getComputedStyle(control).transitionDuration,
        app: getComputedStyle(appButton).transitionDuration
      };
    });
    assert.match(durations.shell, /0\.01ms|1e-05s|0s/);
    assert.match(durations.app, /0\.01ms|1e-05s|0s/);
    await desktopPage.emulateMedia({ reducedMotion: "no-preference" });
  });

  await check("Desktop: Offline-Nutzung erst nach ausdrücklicher Aktivierung", async () => {
    await desktopPage.goto(baseUrl, { waitUntil: "networkidle" });
    assert.equal(await desktopPage.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
    await desktopPage.getByRole("button", { name: "Region", exact: true }).click();
    await desktopPage.getByRole("button", { name: "Offline aktivieren" }).click();
    await desktopPage.getByText("Die App-Dateien sind jetzt auf diesem Gerät verfügbar.", { exact: false }).waitFor();
    const offlineRegistrations = await desktopPage.evaluate(async () =>
      (await navigator.serviceWorker.getRegistrations()).map((registration) => registration.active?.scriptURL)
    );
    assert.deepEqual(offlineRegistrations, [`${baseUrl}/offline-sw.js`]);
    await desktopPage.getByRole("button", { name: "Einstellungen schließen" }).click();
    await desktopPage.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await desktopPage.reload({ waitUntil: "networkidle" });
    await desktop.setOffline(true);
    await desktopPage.reload({ waitUntil: "domcontentloaded" });
    await desktopPage.getByText(/Offline – die mitgelieferten Hinweise/).waitFor();
    await submitSearch(desktopPage, "Akku");
    await desktopPage.getByRole("heading", { name: "Batterie oder Akku", exact: true }).waitFor();
    await desktop.setOffline(false);
  });

  await check("Desktop: keine Konsolenfehler", async () => {
    assert.deepEqual(desktopErrors, []);
  });

  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });
  const mobilePage = await mobile.newPage();
  const mobileErrors = collectPageErrors(mobilePage);

  await check("Smartphone: Loader reflowt und Datenschutz bleibt ohne Scheinbanner erreichbar", async () => {
    await mobilePage.route(`${baseUrl}/public/data/**`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    await mobilePage.goto(baseUrl, { waitUntil: "domcontentloaded" });
    const loader = mobilePage.locator("[data-milos-app-loading]");
    const loadingIcon = await loader.locator("[data-milos-loading-icon]").boundingBox();
    assert.ok(loadingIcon.width <= 48 && loadingIcon.height <= 48, JSON.stringify(loadingIcon));
    await mobilePage.getByRole("heading", { name: "Welcher Müll?", level: 1 }).waitFor();
    await loader.waitFor({ state: "hidden" });
    await mobilePage.unroute(`${baseUrl}/public/data/**`);
    assert.equal(await mobilePage.locator("[data-milos-privacy-notice]").count(), 0);
    const privacyLink = mobilePage.locator("[data-milos-privacy-info]");
    await privacyLink.waitFor();
    assert.equal(await privacyLink.getAttribute("href"), "https://dev.milos-apps.de/datenschutz");
    const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `${overflow}px horizontaler Überlauf`);
    await mobilePage.screenshot({
      path: fileURLToPath(new URL("phone-start.png", artifacts)),
      fullPage: true
    });
  });

  await check("Smartphone: Einstellungen bleiben kompakt und schließen per Escape", async () => {
    await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
    await mobilePage.getByRole("button", { name: "Region", exact: true }).tap();
    const dialog = mobilePage.getByRole("dialog", { name: "Region", exact: true });
    await dialog.waitFor();
    const geometry = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        viewportHeight: innerHeight,
        viewportWidth: innerWidth
      };
    });
    assert.ok(geometry.top >= 0 && geometry.bottom <= geometry.viewportHeight, `Dialog außerhalb des Sichtfelds: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.width <= geometry.viewportWidth - 8, `Dialog zu breit: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.height <= 620, `Dialog zu hoch: ${JSON.stringify(geometry)}`);
    await mobilePage.keyboard.press("Escape");
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await mobilePage.getByRole("button", { name: "Region", exact: true }).getAttribute("aria-expanded"), "false");
  });

  await check("Smartphone: Touch, Dark Mode und lange Eingabe", async () => {
    await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
    const startGeometry = await mobilePage.evaluate(() => {
      const search = document.querySelector(".search-control").getBoundingClientRect();
      return { searchBottom: Math.round(search.bottom) };
    });
    assert.ok(startGeometry.searchBottom <= 720, `Suche liegt nicht im ersten Smartphone-Sichtfeld: ${JSON.stringify(startGeometry)}`);
    await submitSearch(mobilePage, "Medikamente");
    await mobilePage.getByRole("heading", { name: "Alte Medikamente", exact: true }).waitFor();
    const visual = await mobilePage.evaluate(() => {
      const rgb = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = (value) => {
        const channels = rgb(value).map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const contrast = (foreground, background) => {
        const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
        return (values[0] + 0.05) / (values[1] + 0.05);
      };
      const shell = getComputedStyle(document.querySelector("milos-app-shell"));
      const title = getComputedStyle(document.querySelector("h1"));
      const card = getComputedStyle(document.querySelector(".result-card"));
      const answer = getComputedStyle(document.querySelector(".answer"));
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        heroContrast: contrast(title.color, shell.backgroundColor),
        resultContrast: contrast(answer.color, card.backgroundColor)
      };
    });
    assert.ok(visual.overflow <= 1, `horizontaler Überlauf: ${visual.overflow}px`);
    assert.ok(visual.heroContrast >= 4.5, `Dark-Mode-Hero ohne ausreichenden Kontrast: ${JSON.stringify(visual)}`);
    assert.ok(visual.resultContrast >= 4.5, `Dark-Mode-Ergebnis ohne ausreichenden Kontrast: ${JSON.stringify(visual)}`);

    await mobilePage.getByRole("button", { name: "Neue Suche" }).tap();
    await mobilePage.getByLabel("Gegenstand oder Material").fill("x".repeat(500));
    assert.equal((await mobilePage.getByLabel("Gegenstand oder Material").inputValue()).length, 120);
    await mobilePage.screenshot({
      path: fileURLToPath(new URL("phone-dark.png", artifacts)),
      fullPage: true
    });
  });

  await check("Smartphone: Gummiband zeigt den Entsorgungsweg ohne Umweg", async () => {
    await mobilePage.setViewportSize({ width: 390, height: 844 });
    await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
    await submitSearch(mobilePage, "Gummibnad");
    await mobilePage.getByRole("heading", { name: "Gummiband", exact: true }).waitFor();
    await mobilePage.getByText("Kleine Teile: Restmüll · große Teile und Reifen örtlich prüfen", { exact: true }).waitFor();
    const resultGeometry = await mobilePage.evaluate(() => {
      const card = document.querySelector(".result-card").getBoundingClientRect();
      const route = document.querySelector(".result-immediate").getBoundingClientRect();
      const subject = document.querySelector(".result-subject").textContent.trim();
      const destination = document.querySelector(".result-destination").textContent.trim();
      const icon = document.querySelector("[data-result-icon]");
      const resetSearch = document.querySelector("#reset-search");
      return {
        top: Math.round(route.top),
        bottom: Math.round(route.bottom),
        routeWidth: Math.round(route.width),
        cardWidth: Math.round(card.width),
        viewport: innerHeight,
        resetWhiteSpace: getComputedStyle(resetSearch).whiteSpace,
        subject,
        destination,
        iconDecorative: icon.getAttribute("aria-hidden") === "true"
      };
    });
    assert.ok(resultGeometry.top < resultGeometry.viewport, `Entsorgungsweg nicht sofort sichtbar: ${JSON.stringify(resultGeometry)}`);
    assert.ok(resultGeometry.routeWidth >= resultGeometry.cardWidth - 2, `Entsorgungsweg kollabiert: ${JSON.stringify(resultGeometry)}`);
    assert.equal(resultGeometry.resetWhiteSpace, "nowrap");
    assert.equal(resultGeometry.subject, "Gummiband");
    assert.match(resultGeometry.destination, /Kleine Teile: Restmüll/);
    assert.equal(resultGeometry.iconDecorative, true);
    await mobilePage.screenshot({
      path: fileURLToPath(new URL("phone-rubber-result.png", artifacts)),
      fullPage: true
    });
  });

  await check("200-Prozent-Zoom-Äquivalent: Desktop-Reflow bei halbierter CSS-Breite", async () => {
    await mobilePage.setViewportSize({ width: 640, height: 720 });
    await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
    await submitSearch(mobilePage, "Pizzakarton");
    const geometry = await mobilePage.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    assert.ok(
      geometry.scrollWidth <= geometry.clientWidth + 2,
      `kein Reflow beim 200-%-Äquivalent: ${JSON.stringify(geometry)}`
    );
    await mobilePage.screenshot({
      path: fileURLToPath(new URL("phone-zoom-200.png", artifacts)),
      fullPage: true
    });
  });

  await check("360 × 800 bei 200 Prozent Textzoom bleibt überlauffrei", async () => {
    await mobilePage.setViewportSize({ width: 360, height: 800 });
    await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
    await mobilePage.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await mobilePage.getByRole("heading", { name: "Welcher Müll?", level: 1 }).waitFor();
    const geometry = await mobilePage.locator("milos-app-shell").evaluate((shell) => {
      const icon = shell.shadowRoot.querySelector(".app-icon").getBoundingClientRect();
      const searchInput = document.querySelector(".search-control input").getBoundingClientRect();
      const controls = [...shell.shadowRoot.querySelectorAll(".control")].map((element) => {
        const rect = element.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height) };
      });
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        iconWidth: Math.round(icon.width),
        searchInputWidth: Math.round(searchInput.width),
        controls,
        shellOffenders: [...shell.shadowRoot.querySelectorAll("*")]
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              element: `${element.tagName.toLowerCase()}.${element.className || ""}`,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              scrollWidth: element.scrollWidth
            };
          })
          .filter(({ left, right, width }) => width > 0 && (left < -1 || right > innerWidth + 1))
          .slice(0, 12),
        shadowScrollContainers: [...shell.shadowRoot.querySelectorAll("*")]
          .filter((element) => element.scrollWidth > element.clientWidth + 1)
          .map((element) => ({
            element: `${element.tagName.toLowerCase()}.${element.className || ""}`,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            overflowX: getComputedStyle(element).overflowX
          }))
          .slice(0, 12),
        offenders: [...document.querySelectorAll("body *")]
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              element: `${element.tagName.toLowerCase()}#${element.id}.${element.className || ""}`,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              scrollWidth: element.scrollWidth
            };
          })
          .filter(({ left, right, width }) => width > 0 && (left < -1 || right > innerWidth + 1))
          .slice(0, 12),
        scrollContainers: [document.documentElement, document.body, ...document.querySelectorAll("body *")]
          .filter((element) => element.scrollWidth > element.clientWidth + 1)
          .map((element) => ({
            element: `${element.tagName.toLowerCase()}#${element.id}.${element.className || ""}`,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            overflowX: getComputedStyle(element).overflowX
          }))
          .slice(0, 12)
      };
    });
    assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, `200-%-Textzoom läuft horizontal über: ${JSON.stringify(geometry)}`);
    assert.equal(geometry.iconWidth, 38);
    assert.ok(geometry.searchInputWidth >= 180, `Suchfeld bei 200 % nicht sinnvoll bedienbar: ${JSON.stringify(geometry)}`);
    assert.deepEqual(geometry.controls.filter(({ width, height }) => width < 44 || height < 44), []);
    await mobilePage.screenshot({
      path: fileURLToPath(new URL("phone-text-zoom-200.png", artifacts)),
      fullPage: true
    });
    await mobilePage.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
  });

  await check("Smartphone: Querformat bleibt bedienbar", async () => {
    await mobilePage.setViewportSize({ width: 844, height: 390 });
    await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
    await submitSearch(mobilePage, "LED Lampe");
    await mobilePage.getByRole("heading", { name: "LED- oder Energiesparlampe", exact: true }).waitFor();
    assert.ok(await mobilePage.getByRole("button", { name: "Teilen", exact: true }).isVisible());
    const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `Querformat-Überlauf: ${overflow}px`);
  });

  await check("Smartphone: wichtige Touch-Ziele sind mindestens 44 Pixel hoch", async () => {
    const undersized = await mobilePage
      .locator(".header-button, .quick-search button, .result-actions button, .regional-box a, .source-list a, footer nav a")
      .evaluateAll((controls) => {
        return controls
          .filter((control) => {
            const style = getComputedStyle(control);
            const rect = control.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0;
          })
          .map((control) => {
            const rect = control.getBoundingClientRect();
            return {
              name: control.getAttribute("aria-label") || control.textContent?.trim(),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            };
          })
          .filter((control) => control.height < 44 || control.width < 44);
      });
    assert.deepEqual(undersized, []);
  });

  await check("Smartphone: Shell endet ohne Leerraum unter dem Footer", async () => {
    await mobilePage.setViewportSize({ width: 390, height: 844 });
    await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
    const geometry = await mobilePage.locator("milos-app-shell").evaluate((shell) => {
      const rect = shell.getBoundingClientRect();
      return {
        shellBottom: Math.round(rect.bottom + scrollY),
        documentHeight: document.documentElement.scrollHeight,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });
    assert.ok(Math.abs(geometry.shellBottom - geometry.documentHeight) <= 2, `Leerraum unter Footer: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.overflow <= 1, `horizontaler Überlauf: ${JSON.stringify(geometry)}`);
  });

  await check("Smartphone: keine Konsolenfehler", async () => {
    assert.deepEqual(mobileErrors, []);
  });
  await mobile.close();

  const slow = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const slowPage = await slow.newPage();
  await slowPage.route(`${baseUrl}/public/data/**`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });

  await check("Langsames Netz: kompakter Loader bleibt bis zur Fachbereitschaft sichtbar", async () => {
    await slowPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
    const loader = slowPage.locator("[data-milos-app-loading]");
    await loader.waitFor();
    const geometry = await loader.evaluate((element) => {
      const icon = element.querySelector("[data-milos-loading-icon]").getBoundingClientRect();
      const card = element.querySelector("[data-milos-loading-card]").getBoundingClientRect();
      return {
        iconWidth: Math.round(icon.width),
        iconHeight: Math.round(icon.height),
        cardWidth: Math.round(card.width),
        cardHeight: Math.round(card.height),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });
    assert.ok(geometry.iconWidth <= 56 && geometry.iconHeight <= 56, JSON.stringify(geometry));
    assert.ok(geometry.cardWidth <= 320 && geometry.cardHeight <= 220, JSON.stringify(geometry));
    assert.ok(geometry.overflow <= 1, JSON.stringify(geometry));
    await slowPage.screenshot({ path: fileURLToPath(new URL("startup-slow.png", artifacts)) });
    await slowPage.getByRole("heading", { name: "Welcher Müll?", level: 1 }).waitFor();
    await loader.waitFor({ state: "hidden" });
    await submitSearch(slowPage, "Spraydose");
    await slowPage.getByRole("heading", { name: "Spraydose", exact: true }).waitFor();
  });
  await slow.close();
} finally {
  await browser.close();
  server?.kill("SIGTERM");
}

const failed = results.filter((result) => result.status === "FAIL");
console.log(`\nE2E: ${results.length - failed.length}/${results.length} Prüfungen bestanden.`);
if (failed.length > 0) process.exitCode = 1;
