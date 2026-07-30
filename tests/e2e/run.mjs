import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = 4318;
const baseUrl = `http://${host}:${port}`;
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

const server = spawn(process.execPath, ["scripts/dev-server.mjs"], {
  cwd: new URL("../../", import.meta.url),
  env: {
    ...process.env,
    WASTE_GUIDE_HOST: host,
    WASTE_GUIDE_PORT: String(port)
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk;
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk;
});

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
        health?.appKey === "waste-guide" &&
        health?.environment === "DEV" &&
        health?.productionApproved === false
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
  await page.getByLabel("Gegenstand oder Material").fill(query);
  await page.getByRole("button", { name: "Nachschlagen" }).click();
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
        productionApproved: health.productionApproved
      },
      { appKey: "waste-guide", environment: "DEV", productionApproved: false }
    );

    const direct = await fetch(`${baseUrl}/?item=battery`);
    assert.equal(direct.status, 200);
    assert.match(await direct.text(), /Welcher Müll/);
  });

  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
    serviceWorkers: "allow"
  });
  await desktop.addInitScript(() => {
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
    await assert.doesNotReject(() => desktopPage.getByRole("heading", { name: "Wohin kommt das?" }).waitFor());
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

  await check("Desktop: Tippfehler, Umlaute, Plural und Sicherheitspriorität", async () => {
    const cases = [
      ["Joghurbecher", "Joghurtbecher"],
      ["Akkus", "Batterie oder Akku"],
      ["elektrische Zahnbürste", "Elektrogerät"],
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
    const choices = desktopPage.getByRole("button", { name: "Auswählen" });
    assert.ok((await choices.count()) >= 2);
  });

  await check("Desktop: regionale Korrektur München und lokale Löschung", async () => {
    await desktopPage.getByRole("button", { name: "Region & Datenschutz" }).click();
    await desktopPage.getByLabel("Grobe Region").selectOption("munich");
    await desktopPage.getByLabel("Letzte Suchen merken").check();
    await desktopPage.getByRole("button", { name: "Schließen" }).click();
    await submitSearch(desktopPage, "Joghurtbecher");
    await assert.doesNotReject(() => desktopPage.getByText("Wertstoffinsel für Kunststoff und Metall").waitFor());
    await desktopPage.reload({ waitUntil: "networkidle" });
    assert.equal(await desktopPage.getByLabel("Grobe Region").inputValue(), "munich");
    await assert.doesNotReject(() => desktopPage.getByRole("heading", { name: "Letzte Suchen" }).waitFor());

    await desktopPage.getByRole("button", { name: "Region & Datenschutz" }).click();
    await desktopPage.getByRole("button", { name: "Lokale Angaben löschen" }).click();
    assert.equal(await desktopPage.getByLabel("Grobe Region").inputValue(), "de");
    assert.equal(await desktopPage.getByLabel("Letzte Suchen merken").isChecked(), false);
    assert.equal(await desktopPage.getByRole("heading", { name: "Letzte Suchen" }).count(), 0);
    await desktopPage.getByRole("button", { name: "Schließen" }).click();
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

  await check("Desktop: Teilen und Drucken enthalten keinen Suchverlauf", async () => {
    await desktopPage.getByRole("button", { name: "Hinweis teilen" }).click();
    await assert.doesNotReject(() => desktopPage.getByText("Hinweis und Link kopiert.").waitFor());
    const copied = await desktopPage.evaluate(() => window.__copiedText);
    assert.match(copied, /Alte Medikamente/);
    assert.match(copied, /\?item=medicine/);
    assert.doesNotMatch(copied, /Joghurtbecher/);
    await desktopPage.getByRole("button", { name: "Drucken" }).click();
    assert.equal(await desktopPage.evaluate(() => window.__printCalled), true);
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

    await desktopPage.getByRole("button", { name: "Quellen & Datenschutz" }).click();
    await desktopPage.getByRole("dialog").waitFor();
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

  await check("Desktop: Offline-Nutzung nach Erstaufruf", async () => {
    await desktopPage.goto(baseUrl, { waitUntil: "networkidle" });
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

  await check("Smartphone: Touch, Dark Mode und lange Eingabe", async () => {
    await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
    await mobilePage.getByRole("button", { name: "Medikamente" }).tap();
    await mobilePage.getByRole("heading", { name: "Alte Medikamente", exact: true }).waitFor();
    const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `horizontaler Überlauf: ${overflow}px`);

    await mobilePage.getByRole("button", { name: "Neue Suche" }).tap();
    await mobilePage.getByLabel("Gegenstand oder Material").fill("x".repeat(500));
    assert.equal((await mobilePage.getByLabel("Gegenstand oder Material").inputValue()).length, 120);
    await mobilePage.screenshot({
      path: fileURLToPath(new URL("phone-dark.png", artifacts)),
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

  await check("Smartphone: Querformat bleibt bedienbar", async () => {
    await mobilePage.setViewportSize({ width: 844, height: 390 });
    await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
    await submitSearch(mobilePage, "LED Lampe");
    await mobilePage.getByRole("heading", { name: "LED- oder Energiesparlampe", exact: true }).waitFor();
    assert.ok(await mobilePage.getByRole("button", { name: "Hinweis teilen" }).isVisible());
    const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `Querformat-Überlauf: ${overflow}px`);
  });

  await check("Smartphone: keine Konsolenfehler", async () => {
    assert.deepEqual(mobileErrors, []);
  });
  await mobile.close();

  const slow = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const slowPage = await slow.newPage();
  await slowPage.route(`${baseUrl}/**`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 180));
    await route.continue();
  });

  await check("Langsames Netz: Lade- und Suchzustand bleiben verständlich", async () => {
    await slowPage.goto(baseUrl, { waitUntil: "networkidle" });
    await slowPage.getByRole("heading", { name: "Wohin kommt das?" }).waitFor();
    await submitSearch(slowPage, "Spraydose");
    await slowPage.getByRole("heading", { name: "Spraydose", exact: true }).waitFor();
  });
  await slow.close();
} finally {
  await browser.close();
  server.kill("SIGTERM");
}

const failed = results.filter((result) => result.status === "FAIL");
console.log(`\nE2E: ${results.length - failed.length}/${results.length} Prüfungen bestanden.`);
if (failed.length > 0) process.exitCode = 1;
