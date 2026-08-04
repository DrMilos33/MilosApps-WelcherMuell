import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = 4318;
const configuredBaseUrl = process.env.WASTE_GUIDE_TRANSITION_URL?.trim();
const externalRun = Boolean(configuredBaseUrl);
const baseUrl = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/$/, "")
  : `http://${host}:${port}`;
const expectedContentVersion = "2026.08.03-4";
const expectedSourceCommit = process.env.WASTE_GUIDE_EXPECTED_SOURCE_COMMIT?.trim() || null;
const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = chromeCandidates.find(existsSync);

if (!executablePath) {
  throw new Error("Für den Shell-Übergangstest wurde kein Chrome- oder Edge-Browser gefunden.");
}

function isExpectedIdentity(health) {
  return (
    health?.appKey === "waste-guide" &&
    health?.environment === "DEV" &&
    health?.contentVersion === expectedContentVersion &&
    health?.productionApproved === false &&
    (!expectedSourceCommit || health?.sourceCommit === expectedSourceCommit)
  );
}

async function inspectExistingServer() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${baseUrl}/healthz`, { signal: controller.signal });
    let health = null;
    try {
      health = JSON.parse(await response.text());
    } catch {
      // Identity remains invalid when the readiness body is not JSON.
    }
    if (response.ok && isExpectedIdentity(health)) return true;
    throw new Error(
      `Port ${port} ist durch einen fremden oder ungültigen Dienst belegt ` +
      `(HTTP ${response.status}, appKey=${health?.appKey ?? "fehlt"}, environment=${health?.environment ?? "fehlt"}).`
    );
  } catch (error) {
    if (error?.cause?.code === "ECONNREFUSED") return false;
    if (error?.name === "AbortError") {
      throw new Error(`Port ${port} antwortet, aber die App-Identität konnte nicht rechtzeitig geprüft werden.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

let server = null;
let serverOutput = "";

if (!externalRun && !(await inspectExistingServer())) {
  server = spawn(process.execPath, ["scripts/dev-server.mjs"], {
    cwd: new URL("../../", import.meta.url),
    env: {
      ...process.env,
      WASTE_GUIDE_HOST: host,
      WASTE_GUIDE_PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  server.stdout.on("data", (chunk) => { serverOutput += chunk; });
  server.stderr.on("data", (chunk) => { serverOutput += chunk; });
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  let lastReadiness = "keine Antwort";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      const body = await response.text();
      let health = null;
      try {
        health = JSON.parse(body);
      } catch {
        // Identity remains invalid when the readiness body is not JSON.
      }
      lastReadiness = `HTTP ${response.status}, appKey=${health?.appKey ?? "fehlt"}, sourceCommit=${health?.sourceCommit ?? "fehlt"}`;
      if (response.ok && isExpectedIdentity(health)) return;
    } catch (error) {
      lastReadiness = error?.message ?? String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`App-spezifische Readiness für waste-guide fehlgeschlagen (${lastReadiness}). ${serverOutput}`);
}

function createGate() {
  let release;
  const promise = new Promise((resolve) => { release = resolve; });
  return { promise, release };
}

function withTimeout(promise, label, timeoutMs = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} nicht innerhalb von ${timeoutMs} ms erreicht.`)), timeoutMs))
  ]);
}

async function readGeometry(page) {
  return page.evaluate(() => window.__captureShellTransitionGeometry());
}

function installTransitionCapture() {
  const marker = "__WASTE_SHELL_TRANSITION__";
  const capture = () => {
    const shell = document.querySelector("milos-app-shell");
    const shellIcon = shell?.querySelector(':scope > [slot="app-icon"]');
    const loadingIcon = document.querySelector("[data-milos-loading-icon]");
    const loader = document.querySelector("[data-milos-app-loading]");
    const shellRect = shellIcon?.getBoundingClientRect();
    const shellStyle = shellIcon ? getComputedStyle(shellIcon) : null;
    const loadingRect = loadingIcon?.getBoundingClientRect();
    const loadingStyle = loadingIcon ? getComputedStyle(loadingIcon) : null;
    const visibleLargeMedia = [...document.querySelectorAll('[data-milos-loading-icon], milos-app-shell > [slot="app-icon"]')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          element: `${element.tagName.toLowerCase()}${element.getAttribute("slot") ? `[slot=${element.getAttribute("slot")}]` : ""}`,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          visible: style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0
        };
      })
      .filter(({ visible, width, height }) => visible && (width > 38 || height > 38));

    return {
      defined: Boolean(customElements.get("milos-app-shell")),
      essentialsCssLoaded: [...document.querySelectorAll('link[rel="stylesheet"]')].some(
        (link) => link.href.includes("/vendor/milosapps-essentials/v1/milos-app-essentials.css") && Boolean(link.sheet)
      ),
      componentCssLoaded: Boolean(shell?.shadowRoot?.querySelector('link[data-milos-app-shell-component]')?.sheet),
      shellIcon: {
        widthAttribute: shellIcon?.getAttribute("width"),
        heightAttribute: shellIcon?.getAttribute("height"),
        width: Math.round(shellRect?.width ?? 0),
        height: Math.round(shellRect?.height ?? 0),
        visibility: shellStyle?.visibility ?? "missing"
      },
      loader: {
        hidden: loader?.hidden ?? true,
        widthAttribute: loadingIcon?.getAttribute("width"),
        heightAttribute: loadingIcon?.getAttribute("height"),
        width: Math.round(loadingRect?.width ?? 0),
        height: Math.round(loadingRect?.height ?? 0),
        computedWidth: loadingStyle?.width ?? "missing",
        computedHeight: loadingStyle?.height ?? "missing",
        maxWidth: loadingStyle?.maxWidth ?? "missing",
        maxHeight: loadingStyle?.maxHeight ?? "missing"
      },
      visibleLargeMedia,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    };
  };

  window.__captureShellTransitionGeometry = capture;
  const reported = new Set();
  const report = (phase, state) => {
    if (reported.has(phase)) return;
    reported.add(phase);
    console.info(`${marker}${JSON.stringify({ phase, state })}`);
  };
  const inspect = () => {
    const state = capture();
    if (state.essentialsCssLoaded && !state.defined && state.shellIcon.widthAttribute === "38") {
      report("before", state);
    }
    if (state.defined && !state.componentCssLoaded && state.loader.hidden) {
      report("pending", state);
    }
    if (state.defined && state.componentCssLoaded && state.loader.hidden) {
      report("after", state);
    }
    requestAnimationFrame(inspect);
  };
  requestAnimationFrame(inspect);
}

function assertShellIconBounded(state, phase) {
  assert.equal(state.shellIcon.widthAttribute, "38", `${phase}: ${JSON.stringify(state)}`);
  assert.equal(state.shellIcon.heightAttribute, "38", `${phase}: ${JSON.stringify(state)}`);
  assert.ok(state.shellIcon.width <= 38, `${phase}: ${JSON.stringify(state)}`);
  assert.ok(state.shellIcon.height <= 38, `${phase}: ${JSON.stringify(state)}`);
  assert.deepEqual(state.visibleLargeMedia, [], `${phase}: ${JSON.stringify(state)}`);
}

function assertLoaderContract(state, phase, { requireMax = true } = {}) {
  assert.equal(state.loader.widthAttribute, "32", `${phase}: ${JSON.stringify(state)}`);
  assert.equal(state.loader.heightAttribute, "32", `${phase}: ${JSON.stringify(state)}`);
  assert.equal(state.loader.computedWidth, "32px", `${phase}: ${JSON.stringify(state)}`);
  assert.equal(state.loader.computedHeight, "32px", `${phase}: ${JSON.stringify(state)}`);
  if (requireMax) {
    assert.equal(state.loader.maxWidth, "32px", `${phase}: ${JSON.stringify(state)}`);
    assert.equal(state.loader.maxHeight, "32px", `${phase}: ${JSON.stringify(state)}`);
  }
}

await waitForServer();
const browser = await chromium.launch({ executablePath, headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  const page = await context.newPage();
  const errors = [];
  const stateGates = {
    before: createGate(),
    pending: createGate(),
    after: createGate()
  };
  page.on("console", (message) => {
    const text = message.text();
    if (text.startsWith("__WASTE_SHELL_TRANSITION__")) {
      const report = JSON.parse(text.slice("__WASTE_SHELL_TRANSITION__".length));
      stateGates[report.phase]?.release(report.state);
    }
    if (message.type() === "error") errors.push(text);
  });
  page.on("pageerror", (error) => errors.push(error.message));

  const bootstrapGate = createGate();
  const bootstrapRequestedGate = createGate();
  const cssGate = createGate();
  const cssRequestedGate = createGate();

  await page.addInitScript(installTransitionCapture);
  await page.route("**/vendor/milosapps-shell/v2/bootstrap.js", async (route) => {
    bootstrapRequestedGate.release();
    await bootstrapGate.promise;
    await route.continue();
  });
  await page.route("**/vendor/milosapps-shell/v2/milos-app-shell.css", async (route) => {
    cssRequestedGate.release();
    await cssGate.promise;
    await route.continue();
  });

  let navigationError = null;
  const navigation = page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 })
    .catch((error) => { navigationError = error; });
  await withTimeout(bootstrapRequestedGate.promise, "Shell-Bootstrap");
  const beforeUpgrade = await withTimeout(
    stateGates.before.promise,
    "Essentials-CSS bei undefinierter Shell",
    15000
  ).catch(async (error) => {
    throw new Error(`${error.message} Zustand: ${JSON.stringify(await readGeometry(page))}`);
  });
  bootstrapGate.release();
  await withTimeout(cssRequestedGate.promise, "Shell-Komponenten-CSS");
  const whileCssPending = await withTimeout(
    stateGates.pending.promise,
    "Shell-Upgrade bei verzögertem Komponenten-CSS"
  );

  cssGate.release();
  const afterCss = await withTimeout(stateGates.after.promise, "fertiger Shell-CSS-Zustand");
  await navigation;
  if (navigationError) throw navigationError;

  assert.equal(beforeUpgrade.essentialsCssLoaded, true, JSON.stringify(beforeUpgrade));
  assert.equal(beforeUpgrade.defined, false, JSON.stringify(beforeUpgrade));
  assert.equal(beforeUpgrade.shellIcon.visibility, "hidden", JSON.stringify(beforeUpgrade));
  assert.equal(whileCssPending.defined, true, JSON.stringify(whileCssPending));
  assert.equal(whileCssPending.componentCssLoaded, false, JSON.stringify(whileCssPending));
  assert.notEqual(whileCssPending.shellIcon.visibility, "hidden", JSON.stringify(whileCssPending));
  assert.equal(afterCss.componentCssLoaded, true, JSON.stringify(afterCss));
  assertShellIconBounded(beforeUpgrade, "vor Upgrade");
  assertShellIconBounded(whileCssPending, "während Komponenten-CSS lädt");
  assertShellIconBounded(afterCss, "nach Komponenten-CSS");
  assertLoaderContract(beforeUpgrade, "vor Upgrade");
  assertLoaderContract(whileCssPending, "während Komponenten-CSS lädt");
  assertLoaderContract(afterCss, "nach Komponenten-CSS");
  assert.equal(beforeUpgrade.loader.hidden, false, JSON.stringify(beforeUpgrade));
  assert.equal(whileCssPending.loader.hidden, true, JSON.stringify(whileCssPending));
  assert.equal(afterCss.shellIcon.width, 38, JSON.stringify(afterCss));
  assert.equal(afterCss.shellIcon.height, 38, JSON.stringify(afterCss));
  assert.deepEqual(errors, []);
  await context.close();

  const zoomContext = await browser.newContext({ viewport: { width: 360, height: 800 }, colorScheme: "dark" });
  const zoomPage = await zoomContext.newPage();
  await zoomPage.addInitScript(installTransitionCapture);
  await zoomPage.goto(baseUrl, { waitUntil: "networkidle" });
  await zoomPage.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  const zoomState = await readGeometry(zoomPage);
  assertShellIconBounded(zoomState, "360 × 800 bei 200 Prozent");
  assertLoaderContract(zoomState, "360 × 800 bei 200 Prozent");
  assert.ok(zoomState.scrollWidth <= zoomState.clientWidth + 1, JSON.stringify(zoomState));
  await zoomContext.close();

  console.log(JSON.stringify({
    status: "PASS",
    mode: externalRun ? "external" : "local",
    url: baseUrl,
    beforeUpgrade,
    whileCssPending,
    afterCss,
    zoom200: zoomState
  }, null, 2));
} finally {
  await browser.close();
  server?.kill("SIGTERM");
}
