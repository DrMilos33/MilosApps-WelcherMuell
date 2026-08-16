import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const outputRoot = resolve(repositoryRoot, "dist", "production");
const deployment = JSON.parse(await readFile(resolve(outputRoot, "deployment.json"), "utf8"));
const headersSource = await readFile(resolve(outputRoot, "_headers"), "utf8");
const expectedContentVersion = "2026.08.09-1";
const expectedFeedbackEndpoint = "https://milosapps-waste-guide-feedback-production.pascalcasiddu.workers.dev/v1/feedback";
const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const linuxChromeCandidates = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/microsoft-edge",
  "/usr/bin/microsoft-edge-stable"
];
const playwrightChromiumPath = process.platform === "linux" ? chromium.executablePath() : undefined;
const executablePath = process.platform === "linux"
  ? linuxChromeCandidates.find(existsSync) ??
    (playwrightChromiumPath && existsSync(playwrightChromiumPath) ? playwrightChromiumPath : undefined)
  : chromeCandidates.find(existsSync);
if (!executablePath) {
  throw new Error("Für den Production-Browserlauf wurde kein Chrome oder Edge gefunden.");
}

function parseHeaderBlock(path) {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = headersSource.match(new RegExp(`(?:^|\\n)${escaped}\\r?\\n((?:  [^\\r\\n]+\\r?\\n?)+)`));
  if (!match) return {};
  return Object.fromEntries(
    match[1]
      .trimEnd()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .map((line) => {
        const separator = line.indexOf(":");
        return [line.slice(0, separator).toLowerCase(), line.slice(separator + 1).trim()];
      })
  );
}

const commonHeaders = parseHeaderBlock("/*");
const healthHeaders = parseHeaderBlock("/healthz");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  const relativePath = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const candidate = normalize(resolve(outputRoot, relativePath));
  if (candidate !== outputRoot && !candidate.startsWith(`${outputRoot}${sep}`)) {
    response.writeHead(404).end();
    return;
  }
  if (!existsSync(candidate) || !statSync(candidate).isFile()) {
    response.writeHead(404, { ...commonHeaders, "content-type": "text/plain; charset=utf-8" }).end("Nicht gefunden");
    return;
  }
  const routeHeaders = url.pathname === "/healthz" ? healthHeaders : parseHeaderBlock(url.pathname);
  const responseHeaders = {
    ...commonHeaders,
    "content-type": contentTypes[extname(candidate)] || "application/octet-stream",
    ...routeHeaders
  };
  response.writeHead(200, responseHeaders);
  if (request.method === "HEAD") response.end();
  else createReadStream(candidate).pipe(response);
});
await new Promise((resolvePromise, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolvePromise);
});
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}/`;

const browser = await chromium.launch({ executablePath, headless: true });
const results = [];
async function check(name, operation) {
  try {
    await operation();
    results.push({ name, status: "PASS" });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: "FAIL", error: error.message });
    console.error(`FAIL ${name}\n${error.stack || error.message}`);
  }
}

function collectErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

async function submit(page, query) {
  await page.getByLabel(/Gegenstand oder Material|Item or material/).fill(query);
  await page.getByRole("button", { name: /Suchen|Search/, exact: true }).click();
}

try {
  await check("Production-Health, CSP, MIME und Identität", async () => {
    const healthResponse = await fetch(`${baseUrl}healthz`);
    assert.equal(healthResponse.status, 200);
    assert.equal(healthResponse.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(healthResponse.headers.get("cache-control"), "no-store");
    assert.equal(healthResponse.headers.get("x-content-type-options"), "nosniff");
    const csp = healthResponse.headers.get("content-security-policy");
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /connect-src 'self' https:\/\/milosapps-waste-guide-feedback-production\.pascalcasiddu\.workers\.dev/);
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
    assert.deepEqual(await healthResponse.json(), {
      status: "ok",
      appKey: "waste-guide",
      environment: "PRODUCTION",
      contentVersion: expectedContentVersion,
      productionApproved: true,
      sourceCommit: deployment.sourceCommit
    });
    for (const [path, expectedType] of [
      ["vendor/milosapps-shell/v2/bootstrap.js", "text/javascript; charset=utf-8"],
      ["vendor/milosapps-shell/v2/milos-app-shell.css", "text/css; charset=utf-8"],
      ["vendor/milosapps-essentials/v1/bootstrap.js", "text/javascript; charset=utf-8"],
      ["vendor/milosapps-essentials/v1/milos-app-essentials.css", "text/css; charset=utf-8"],
      ["assets/icon.svg", "image/svg+xml"]
    ]) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get("content-type"), expectedType, path);
    }
    const robots = await fetch(`${baseUrl}robots.txt`);
    const sitemap = await fetch(`${baseUrl}sitemap.xml`);
    assert.equal(robots.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(sitemap.headers.get("content-type"), "application/xml; charset=utf-8");
    assert.match(await robots.text(), /Sitemap: https:\/\/welcher-muell\.milos-apps\.de\/sitemap\.xml/);
    assert.match(await sitemap.text(), /<loc>https:\/\/welcher-muell\.milos-apps\.de\/<\/loc>/);
  });

  await check("Desktop Production-Shell, Suche, DE/EN und Datenschutz", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "allow" });
    await context.addInitScript(() => {
      globalThis.__storageCalls = [];
      for (const method of ["getItem", "setItem", "removeItem", "clear"]) {
        const original = Storage.prototype[method];
        Object.defineProperty(Storage.prototype, method, {
          configurable: true,
          value(...args) {
            globalThis.__storageCalls.push({ method, args });
            return original.apply(this, args);
          }
        });
      }
    });
    const page = await context.newPage();
    const errors = collectErrors(page);
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    assert.equal(await page.locator("html").getAttribute("data-milos-environment"), "production");
    assert.equal(await page.locator("html").getAttribute("data-milos-production-approved"), "true");
    assert.equal(await page.locator("body").getAttribute("data-milos-essentials-loading"), null);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://welcher-muell.milos-apps.de/");
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "index,follow,max-image-preview:large");
    assert.equal(await page.locator('meta[name="waste-guide-ads-enabled"]').getAttribute("content"), "false");
    assert.equal(await page.locator('meta[name="waste-guide-feedback-endpoint"]').getAttribute("content"), expectedFeedbackEndpoint);
    assert.equal(await page.locator("[data-milos-privacy-info]").getAttribute("href"), "https://milos-apps.de/datenschutz");
    const shell = page.locator("milos-app-shell");
    const shellState = await shell.evaluate((element) => {
      const root = element.shadowRoot;
      return {
        devHidden: root.querySelector(".dev").hidden,
        brand: root.querySelector(".brand").href,
        apps: root.querySelector('[data-text="allApps"]').closest("a").href,
        privacy: root.querySelector('a[data-text="privacy"]').href
      };
    });
    assert.deepEqual(shellState, {
      devHidden: true,
      brand: "https://milos-apps.de/",
      apps: "https://milos-apps.de/apps",
      privacy: "https://milos-apps.de/datenschutz"
    });
    await submit(page, "Eisen");
    await page.getByRole("heading", { name: /Eisen|Iron/ }).waitFor();
    assert.match(await page.locator("#results").innerText(), /Wertstofftonne|Wertstoffhof/);
    await submit(page, "Toiaster");
    await page.getByRole("heading", { name: "Meintest du „Toaster“?", exact: true }).waitFor();
    assert.equal(await page.locator(".result-immediate").count(), 0);
    await submit(page, "TOast");
    assert.doesNotMatch(await page.locator("#results").innerText(), /Elektrogerät/);
    await shell.evaluate((element) => element.shadowRoot.querySelector('button[data-locale="en"]').click());
    await page.getByRole("heading", { name: "Waste guide", exact: true }).waitFor();
    await submit(page, "iron bar");
    assert.match(await page.locator("#results").innerText(), /recycling centre/i);
    await page.locator(".trust-section > summary").click();
    assert.equal(await page.locator(".crawl-sources a").count(), 3);
    assert.match(await page.locator(".crawl-sources").innerText(), /Selected official foundations/);
    assert.equal(await page.evaluate(() => document.cookie), "");
    assert.deepEqual(await page.evaluate(() => globalThis.__storageCalls), []);
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check("390px Loader, Ziele und explizites Offline", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
    const page = await context.newPage();
    const errors = collectErrors(page);
    await page.route("**/public/data/waste-items.v1.json", async (route) => {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
      await route.continue();
    });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    const loader = page.locator("[data-milos-loading-icon]");
    await loader.waitFor({ state: "visible" });
    assert.deepEqual(await loader.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }), { width: 32, height: 32 });
    await page.locator("body:not([data-milos-essentials-loading])").waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    const smallTargets = await page.locator("button, input, select, summary, a").evaluateAll((elements) =>
      elements
        .filter((element) => {
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0 && box.height < 44;
        })
        .map((element) => ({ tag: element.tagName, text: element.textContent?.trim(), height: element.getBoundingClientRect().height }))
    );
    assert.deepEqual(smallTargets, []);
    assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
    await page.getByRole("button", { name: /Region|Region/ }).click();
    await page.getByRole("button", { name: /Offline aktivieren|Enable offline use/ }).click();
    await page.getByText(/Offline aktiviert|Offline enabled/, { exact: true }).first().waitFor();
    const offlineState = await page.evaluate(async () => ({
      registrations: (await navigator.serviceWorker.getRegistrations()).map((registration) => registration.active?.scriptURL),
      caches: await caches.keys()
    }));
    assert.equal(offlineState.registrations.length, 1);
    assert.match(offlineState.registrations[0], /offline-sw\.js$/);
    assert.deepEqual(offlineState.caches, ["waste-guide-production-2026-08-09-feedback-v8"]);
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("body:not([data-milos-essentials-loading])").waitFor();
    await submit(page, "Batterie");
    await page.getByRole("heading", { name: /Batterie|Battery/ }).waitFor();
    await context.setOffline(false);
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check("360x800 bei 200 Prozent ohne Überlauf", async () => {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, serviceWorkers: "block" });
    const page = await context.newPage();
    const errors = collectErrors(page);
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await submit(page, "Plastik");
    await page.locator(".result-immediate").first().waitFor();
    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      maxRight: Math.ceil(Math.max(...[...document.querySelectorAll("body *")].map((element) => element.getBoundingClientRect().right)))
    }));
    assert.equal(geometry.clientWidth, 360);
    assert.equal(geometry.scrollWidth, 360);
    assert.ok(geometry.maxRight <= 360, JSON.stringify(geometry));
    assert.deepEqual(errors, []);
    await context.close();
  });
} finally {
  await browser.close();
  await new Promise((resolvePromise) => server.close(resolvePromise));
}

const failures = results.filter((result) => result.status === "FAIL");
console.log(JSON.stringify({
  status: failures.length === 0 ? "PASS" : "FAIL",
  checks: results.length,
  sourceCommit: deployment.sourceCommit,
  artifactSha256: deployment.artifactSha256,
  targetConfirmed: deployment.targetConfirmed
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
