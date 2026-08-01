import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const expectedSourceCommit = process.env.WASTE_GUIDE_EXPECTED_SOURCE_COMMIT;
if (!/^[0-9a-f]{40}$/.test(expectedSourceCommit ?? "")) {
  throw new Error("WASTE_GUIDE_EXPECTED_SOURCE_COMMIT muss den vollständigen deployten Quellcommit enthalten.");
}
const expectedContentVersion = "2026.08.01-1";
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

for (const stylesheet of ["milos-app-shell.css", "milos-app-shell-theme.css"]) {
  const response = await fetch(new URL(`vendor/milosapps-shell/v2/${stylesheet}`, baseUrl), { redirect: "error" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/css(?:;|$)/);
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

  await page.getByRole("button", { name: "Neue Suche" }).click();
  await page.getByLabel("Gegenstand oder Material").fill("GUmmiband");
  await page.getByRole("button", { name: "Suchen" }).click();
  await page.getByRole("heading", { name: "Gummi-Gegenstand", exact: true }).waitFor();
  await page.getByText("Kleine Teile: Restmüll · große Teile und Reifen örtlich prüfen", { exact: true }).waitFor();

  await shell.getByRole("button", { name: "EN", exact: true }).click();
  await page.locator("html[lang='en']").waitFor();
  await page.getByLabel("Item or material").fill("old medicine");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("heading", { name: "Old medicine", exact: true }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.equal(await page.getByText(/Sign in|Login|Milos account/i).count(), 0);

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
  textZoom200: true
}, null, 2));
