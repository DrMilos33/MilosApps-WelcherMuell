import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const expectedSourceCommit = process.env.WASTE_GUIDE_EXPECTED_SOURCE_COMMIT;
if (!/^[0-9a-f]{40}$/.test(expectedSourceCommit ?? "")) {
  throw new Error("WASTE_GUIDE_EXPECTED_SOURCE_COMMIT muss den vollständigen deployten Quellcommit enthalten.");
}
const expectedContentVersion = "2026.08.03-4";
const expectedEssentialsVersion = "1.1.5";
const expectedEssentialsCommit = "2942132ad3bf6cf39edc9f52ed918de6a230be23";
const configuredUrl = process.env.WASTE_GUIDE_REMOTE_URL;
if (!configuredUrl) throw new Error("WASTE_GUIDE_REMOTE_URL fehlt.");

const baseUrl = new URL(configuredUrl);
if (baseUrl.protocol !== "https:" && process.env.WASTE_GUIDE_ALLOW_HTTP !== "1") {
  throw new Error(`Remote-Smoke verlangt HTTPS: ${baseUrl}`);
}
if (!baseUrl.pathname.endsWith("/")) baseUrl.pathname = `${baseUrl.pathname}/`;

const healthUrl = new URL("healthz", baseUrl);
const healthResponse = await fetch(healthUrl, { redirect: "error" });
assert.equal(healthResponse.status, 200);
const health = JSON.parse(await healthResponse.text());
assert.deepEqual(
  {
    status: health.status,
    appKey: health.appKey,
    environment: health.environment,
    contentVersion: health.contentVersion,
    productionApproved: health.productionApproved,
    sourceCommit: health.sourceCommit
  },
  {
    status: "ok",
    appKey: "waste-guide",
    environment: "DEV",
    contentVersion: expectedContentVersion,
    productionApproved: false,
    sourceCommit: expectedSourceCommit
  }
);

const metadataResponse = await fetch(new URL("meta.json", baseUrl), { redirect: "error" });
assert.equal(metadataResponse.status, 200);
const metadata = await metadataResponse.json();
assert.equal(metadata.appKey, "waste-guide");
assert.equal(metadata.devUrl, baseUrl.toString());
assert.equal(metadata.healthcheck, healthUrl.toString());
assert.equal(metadata.productionApproved, false);
assert.equal(metadata.contentDate, "2026-08-03");
assert.equal(metadata.deployment?.sourceCommit, expectedSourceCommit);

const manifestResponse = await fetch(new URL("milos-app.json", baseUrl), { redirect: "error" });
assert.equal(manifestResponse.status, 200);
const appManifest = await manifestResponse.json();
assert.equal(appManifest.shellContract?.version, "2.0.3");
assert.equal(appManifest.shellContract?.sharedCommit, "ed898412306e22c6ae1b10ee8953df29f8acd627");
assert.equal(appManifest.environment, "dev");
assert.equal(appManifest.productionApproved, false);

const lockResponse = await fetch(new URL("vendor/milosapps-shell/v2/shell-lock.json", baseUrl), { redirect: "error" });
assert.equal(lockResponse.status, 200);
const shellLock = await lockResponse.json();
assert.equal(shellLock.version, "2.0.3");
assert.equal(shellLock.sharedCommit, appManifest.shellContract.sharedCommit);
assert.deepEqual(
  Object.keys(shellLock.artifacts).sort(),
  ["bootstrap.js", "milos-app-shell-theme.css", "milos-app-shell.css", "milos-app-shell.js", "verify.mjs"]
);

const essentialsManifestResponse = await fetch(new URL("milos-essentials.json", baseUrl), { redirect: "error" });
assert.equal(essentialsManifestResponse.status, 200);
const essentialsManifest = await essentialsManifestResponse.json();
assert.equal(essentialsManifest.essentialsContract?.version, expectedEssentialsVersion);
assert.equal(essentialsManifest.essentialsContract?.sharedCommit, expectedEssentialsCommit);
assert.equal(essentialsManifest.essentialsContract?.runtimeBasePath, "vendor/milosapps-essentials/v1");
assert.equal(essentialsManifest.$schema, "./vendor/milosapps-essentials/v1/essentials-manifest.schema.json");
assert.deepEqual(essentialsManifest.consumerEntryModule, { sourceFile: "src/app.js", runtimePath: "src/app.js" });
assert.equal(essentialsManifest.loading?.iconPath, "assets/icon.svg");
assert.equal(essentialsManifest.loading?.iconRuntimePath, "./assets/icon.svg");
assert.deepEqual(essentialsManifest.features, {
  startup: true,
  privacyNotice: false,
  share: true,
  datePicker: false,
  placeSearch: false,
  placeSuggestions: {
    enabled: false,
    minChars: 3,
    debounceMs: 350,
    providerCapability: "submit-only",
    evidenceFile: null
  }
});
assert.equal(essentialsManifest.privacy?.mode, "no-cookies");
assert.equal(essentialsManifest.privacy?.usesLocalStorage, false);
assert.deepEqual(essentialsManifest.privacy?.storagePurposes, []);
assert.equal(essentialsManifest.privacy?.optionalTracking, false);
assert.equal(essentialsManifest.productionApproved, false);

const essentialsLockResponse = await fetch(new URL("vendor/milosapps-essentials/v1/essentials-lock.json", baseUrl), { redirect: "error" });
assert.equal(essentialsLockResponse.status, 200);
const essentialsLock = await essentialsLockResponse.json();
assert.equal(essentialsLock.version, expectedEssentialsVersion);
assert.equal(essentialsLock.sharedCommit, essentialsManifest.essentialsContract.sharedCommit);
assert.deepEqual(
  Object.keys(essentialsLock.artifacts).sort(),
  ["bootstrap.js", "essentials-manifest.schema.json", "milos-app-essentials-theme.css", "milos-app-essentials.css", "milos-app-essentials.js", "verify.mjs"]
);

const iconResponse = await fetch(new URL("assets/icon.svg", baseUrl), { redirect: "error" });
assert.equal(iconResponse.status, 200);
assert.match(iconResponse.headers.get("content-type") ?? "", /^image\/svg\+xml(?:;|$)/);
const remoteIcon = Buffer.from(await iconResponse.arrayBuffer());
const sourceIcon = await readFile(new URL("../../assets/icon.svg", import.meta.url));
assert.equal(createHash("sha256").update(remoteIcon).digest("hex"), createHash("sha256").update(sourceIcon).digest("hex"));

for (const stylesheet of ["milos-app-shell.css", "milos-app-shell-theme.css"]) {
  const response = await fetch(new URL(`vendor/milosapps-shell/v2/${stylesheet}`, baseUrl), { redirect: "error" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/css(?:;|$)/);
}

for (const [file, mime] of [
  ["bootstrap.js", /^(?:text|application)\/javascript(?:;|$)/],
  ["milos-app-essentials.js", /^(?:text|application)\/javascript(?:;|$)/],
  ["milos-app-essentials.css", /^text\/css(?:;|$)/],
  ["milos-app-essentials-theme.css", /^text\/css(?:;|$)/]
]) {
  const response = await fetch(new URL(`vendor/milosapps-essentials/v1/${file}`, baseUrl), { redirect: "error" });
  assert.equal(response.status, 200, file);
  assert.match(response.headers.get("content-type") ?? "", mime, file);
}

const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = chromeCandidates.find(existsSync);
if (!executablePath) throw new Error("Kein lokaler Chrome- oder Edge-Browser gefunden.");

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
  isMobile: true,
  hasTouch: true,
  storageState: { cookies: [], origins: [] }
});
await context.addInitScript(() => {
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
});
const page = await context.newPage();
const consoleErrors = [];
const failedResponses = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
});

try {
  const homeResponse = await page.goto(baseUrl.toString(), { waitUntil: "networkidle" });
  assert.equal(homeResponse?.status(), 200);
  assert.equal(page.url(), baseUrl.toString());
  await page.getByRole("heading", { name: "Welcher Müll?", level: 1 }).waitFor();
  assert.equal(await page.getByRole("search").count(), 1);
  assert.equal(await page.getByText(/Anmelden|Login|Milos-Konto/i).count(), 0);
  assert.deepEqual(await context.cookies(), []);
  assert.equal(await page.locator("[data-milos-privacy-notice]").count(), 0);
  assert.equal(await page.locator("[data-milos-privacy-info]").getAttribute("href"), "https://dev.milos-apps.de/datenschutz");
  assert.deepEqual(await page.evaluate(() => window.__storageCalls), []);
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
  assert.equal(await page.locator("[data-milos-app-loading]").isHidden(), true);
  const loaderIconContract = await page.locator("[data-milos-loading-icon]").evaluate((element) => ({
    width: element.getAttribute("width"),
    height: element.getAttribute("height"),
    computedWidth: getComputedStyle(element).width,
    computedHeight: getComputedStyle(element).height,
    maxWidth: getComputedStyle(element).maxWidth,
    maxHeight: getComputedStyle(element).maxHeight
  }));
  assert.deepEqual(loaderIconContract, {
    width: "32",
    height: "32",
    computedWidth: "32px",
    computedHeight: "32px",
    maxWidth: "32px",
    maxHeight: "32px"
  });
  assert.equal(await page.locator("milos-date-picker, milos-place-search").count(), 0);
  const essentialsRuntime = await page.evaluate(() => ({
    version: globalThis.milosAppEssentials?.version,
    shareRegistered: Boolean(customElements.get("milos-share-button")),
    cssHrefs: [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map((link) => link.href)
      .filter((href) => href.includes("milosapps-essentials/v1/")),
    inlineStyles: document.querySelectorAll('style, [style]').length
  }));
  assert.equal(essentialsRuntime.version, expectedEssentialsVersion);
  assert.equal(essentialsRuntime.shareRegistered, true);
  assert.deepEqual(essentialsRuntime.cssHrefs.sort(), [
    new URL("vendor/milosapps-essentials/v1/milos-app-essentials-theme.css", baseUrl).toString(),
    new URL("vendor/milosapps-essentials/v1/milos-app-essentials.css", baseUrl).toString()
  ].sort());
  assert.equal(essentialsRuntime.inlineStyles, 0);
  const shell = page.locator("milos-app-shell");
  await shell.waitFor();
  const shellRuntime = await shell.evaluate((element) => {
    const shadowStylesheet = element.shadowRoot.querySelector('link[rel="stylesheet"]');
    const themeStylesheet = document.querySelector('link[data-milos-app-shell-theme="waste-guide"]');
    return {
      shadowStylesheet: shadowStylesheet?.href,
      themeStylesheet: themeStylesheet?.href,
      inlineShadowStyles: element.shadowRoot.querySelectorAll("style").length,
      inlineHostStyle: element.hasAttribute("style"),
      hostDisplay: getComputedStyle(element).display,
      accent: getComputedStyle(element).getPropertyValue("--milos-shell-accent").trim()
    };
  });
  assert.equal(shellRuntime.shadowStylesheet, new URL("vendor/milosapps-shell/v2/milos-app-shell.css", baseUrl).toString());
  assert.equal(shellRuntime.themeStylesheet, new URL("vendor/milosapps-shell/v2/milos-app-shell-theme.css", baseUrl).toString());
  assert.equal(shellRuntime.inlineShadowStyles, 0);
  assert.equal(shellRuntime.inlineHostStyle, false);
  assert.equal(shellRuntime.hostDisplay, "grid");
  assert.equal(shellRuntime.accent, "#d9f781");
  assert.equal(await shell.getByText("DEV", { exact: true }).count(), 1);
  assert.equal(await shell.getByRole("link", { name: /Alle Apps/ }).getAttribute("href"), "https://dev.milos-apps.de/apps");

  await page.goto(`${baseUrl}?item=battery`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Batterie oder Akku", exact: true }).waitFor();
  assert.equal(page.url(), `${baseUrl}?item=battery`);

  await page.getByLabel("Gegenstand oder Material").fill("alte Medikamente");
  await page.getByRole("button", { name: "Suchen" }).click();
  await page.getByRole("heading", { name: "Alte Medikamente", exact: true }).waitFor();
  await page.getByText("Örtlich prüfen").waitFor();
  await page.getByRole("button", { name: "Teilen", exact: true }).click();
  await page.getByText("Link kopiert", { exact: true }).waitFor();
  const copied = await page.evaluate(() => window.__copiedText);
  assert.match(copied, /Alte Medikamente/);
  assert.match(copied, /Quelle:/);
  assert.match(copied, /\?item=medicine/);

  await page.getByRole("button", { name: "Neue Suche" }).click();
  await page.getByLabel("Gegenstand oder Material").fill("GUmmiband");
  await page.getByRole("button", { name: "Suchen" }).click();
  await page.getByRole("heading", { name: "Gummiband", exact: true }).waitFor();
  const rubberDestination = page.locator(".result-destination");
  await rubberDestination.waitFor();
  assert.match((await rubberDestination.textContent()) ?? "", /Kleine Teile: Restmüll · große Teile und Reifen örtlich prüfen/);
  assert.equal(await page.locator(".result-immediate .result-label, .result-immediate .result-certainty").count(), 0);
  assert.deepEqual(await rubberDestination.locator(".route-keyword").allTextContents(), ["Restmüll", "örtlich prüfen"]);

  await page.getByRole("button", { name: "Neue Suche" }).click();
  await page.getByLabel("Gegenstand oder Material").fill("Poster");
  await page.getByRole("button", { name: "Suchen" }).click();
  await page.getByRole("heading", { name: "Poster", exact: true }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "Elektrogerät", exact: true }).count(), 0);

  await page.getByRole("button", { name: "Neue Suche" }).click();
  await page.getByLabel("Gegenstand oder Material").fill("Polster");
  await page.getByRole("button", { name: "Suchen" }).click();
  await page.getByRole("heading", { name: /Kein sicherer Treffer/ }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "Elektrogerät", exact: true }).count(), 0);

  await page.getByRole("button", { name: "Neue Suche" }).click();
  await page.getByLabel("Gegenstand oder Material").fill("Toiaster");
  await page.getByRole("button", { name: "Suchen" }).click();
  await page.getByRole("heading", { name: "Meintest du „Toaster“?", exact: true }).waitFor();
  assert.equal(await page.locator(".result-immediate").count(), 0);
  await page.getByRole("button", { name: "Toaster suchen", exact: true }).click();
  await page.getByRole("heading", { name: "Toaster", exact: true }).waitFor();

  await page.getByRole("button", { name: "Neue Suche" }).click();
  await page.getByLabel("Gegenstand oder Material").fill("TOast");
  await page.getByRole("button", { name: "Suchen" }).click();
  await page.getByRole("heading", { name: "Toast", exact: true }).waitFor();
  assert.equal(await page.getByText("Elektrogerät", { exact: true }).count(), 0);
  assert.match((await page.locator(".result-destination").textContent()) ?? "", /Biotonne/);

  await shell.getByRole("button", { name: "EN", exact: true }).click();
  await page.locator("html[lang='en']").waitFor();
  await page.getByLabel("Item or material").fill("old medicine");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("heading", { name: "Old medicine", exact: true }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.match(page.url(), /[?&]lang=en(?:&|$)/);
  assert.equal(await page.getByText(/Sign in|Login|Milos account/i).count(), 0);
  assert.deepEqual(await page.evaluate(() => window.__storageCalls), []);

  await page.getByRole("button", { name: "Region", exact: true }).click();
  await page.getByRole("button", { name: "Enable offline use" }).click();
  await page.getByText("The app files are now available on this device.", { exact: false }).waitFor();
  assert.deepEqual(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map((registration) => registration.active?.scriptURL)),
    [new URL("offline-sw.js", baseUrl).toString()]
  );
  await page.getByRole("button", { name: "Close settings" }).click();

  const geometry = await shell.evaluate((element) => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    shellBottom: Math.round(element.getBoundingClientRect().bottom + scrollY),
    documentHeight: document.documentElement.scrollHeight
  }));
  assert.ok(geometry.overflow <= 1, `horizontal overflow: ${JSON.stringify(geometry)}`);
  assert.ok(Math.abs(geometry.shellBottom - geometry.documentHeight) <= 2, `footer gap: ${JSON.stringify(geometry)}`);

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(baseUrl.toString(), { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const zoomGeometry = await shell.evaluate((element) => {
    const icon = element.shadowRoot.querySelector(".app-icon").getBoundingClientRect();
    const undersized = [...element.shadowRoot.querySelectorAll(".control")]
      .map((control) => control.getBoundingClientRect())
      .filter(({ width, height }) => width < 44 || height < 44).length;
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      iconWidth: Math.round(icon.width),
      undersized
    };
  });
  assert.ok(zoomGeometry.overflow <= 1, `200% text zoom overflow: ${JSON.stringify(zoomGeometry)}`);
  assert.equal(zoomGeometry.iconWidth, 38);
  assert.equal(zoomGeometry.undersized, 0);

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(failedResponses, []);
} finally {
  await context.close();
  await browser.close();
}

console.log(JSON.stringify({
  status: "PASS",
  appKey: health.appKey,
  environment: health.environment,
  contentVersion: health.contentVersion,
  productionApproved: health.productionApproved,
  sourceCommit: health.sourceCommit,
  devUrl: baseUrl.toString(),
  healthUrl: healthUrl.toString(),
  directWithoutLogin: true,
  portalIndependent: true,
  shellVersion: shellLock.version,
  essentialsVersion: essentialsLock.version,
  essentialsSharedCommit: essentialsLock.sharedCommit,
  privacyNotice: "none-no-cookies",
  webStorage: false,
  offlineOptIn: true,
  shareFallback: true,
  compactResultHeader: true,
  textZoom200: true
}, null, 2));
