import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

const repositoryRoot = new URL("../../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("milos-essentials.json", repositoryRoot), "utf8"));
const indexHtml = await readFile(new URL("index.html", repositoryRoot), "utf8");
const appSource = await readFile(new URL("src/app.js", repositoryRoot), "utf8");
const shellSessionSource = await readFile(new URL("src/shell-session.js", repositoryRoot), "utf8");
const storageInventory = JSON.parse(await readFile(new URL("docs/DEVICE_STORAGE_INVENTORY.json", repositoryRoot), "utf8"));
const buildSource = await readFile(new URL("scripts/build-github-pages-dev.mjs", repositoryRoot), "utf8");
const legacyWorkerSource = await readFile(new URL("sw.js", repositoryRoot), "utf8");
const offlineWorkerSource = await readFile(new URL("offline-sw.js", repositoryRoot), "utf8");
const vendorRoot = new URL("vendor/milosapps-essentials/v1/", repositoryRoot);
const vendorAttributes = await readFile(new URL(".gitattributes", vendorRoot), "utf8");
const shellVendorAttributes = await readFile(
  new URL("vendor/milosapps-shell/v2/.gitattributes", repositoryRoot),
  "utf8"
);
const shellVendorRoot = new URL("vendor/milosapps-shell/v2/", repositoryRoot);
const lockedArtifacts = [
  "bootstrap.js",
  "milos-app-essentials.css",
  "milos-app-essentials-theme.css",
  "milos-app-essentials.js",
  "verify.mjs",
  "essentials-manifest.schema.json"
];
const shellLockedArtifacts = [
  "bootstrap.js",
  "milos-app-shell-theme.css",
  "milos-app-shell.css",
  "milos-app-shell.js",
  "verify.mjs"
];

describe("public-app-essentials/v1", () => {
  test("pinnt den unveränderlichen Shared-Release und die DEV-Grenze", () => {
    assert.equal(manifest.appKey, "waste-guide");
    assert.equal(manifest.environment, "dev");
    assert.equal(manifest.productionApproved, false);
    assert.deepEqual(manifest.essentialsContract, {
      id: "public-app-essentials/v1",
      version: "1.1.5",
      sharedCommit: "2942132ad3bf6cf39edc9f52ed918de6a230be23",
      vendorDirectory: "vendor/milosapps-essentials/v1",
      runtimeBasePath: "vendor/milosapps-essentials/v1"
    });
    assert.equal(manifest.$schema, "./vendor/milosapps-essentials/v1/essentials-manifest.schema.json");
    assert.deepEqual(manifest.consumerEntryModule, {
      sourceFile: "src/app.js",
      runtimePath: "src/app.js"
    });
    assert.equal(manifest.loading.iconPath, "assets/icon.svg");
    assert.equal(manifest.loading.iconRuntimePath, "./assets/icon.svg");
  });

  test("aktiviert Loader und Teilen ohne Scheinbanner oder optionale Persistenz", () => {
    assert.deepEqual(manifest.features, {
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
    assert.equal(manifest.privacy.mode, "no-cookies");
    assert.equal(manifest.privacy.usesLocalStorage, false);
    assert.equal(manifest.privacy.optionalTracking, false);
    assert.equal(manifest.privacy.privacyUrl, "https://dev.milos-apps.de/datenschutz");
    assert.deepEqual(manifest.privacy.storagePurposes, []);
    assert.match(indexHtml, /data-milos-privacy-info[^>]+href="https:\/\/dev\.milos-apps\.de\/datenschutz"/);
    assert.doesNotMatch(indexHtml, /<milos-(?:date-picker|place-search)\b/);
  });

  test("lädt CSS vor Modulen und teilt nur die kanonische Ergebnis-URL", () => {
    const essentialsCss = indexHtml.indexOf("milos-app-essentials.css");
    const essentialsTheme = indexHtml.indexOf("milos-app-essentials-theme.css");
    const firstModule = indexHtml.indexOf('type="module"');
    assert.ok(essentialsCss > 0 && essentialsCss < firstModule);
    assert.ok(essentialsTheme > essentialsCss && essentialsTheme < firstModule);
    assert.match(indexHtml, /data-milos-app-loading/);
    assert.match(indexHtml, /data-milos-loading-icon[^>]+width="32"[^>]+height="32"/);
    assert.equal((indexHtml.match(/<h1\b/g) ?? []).length, 1);
    assert.match(appSource, /<milos-share-button data-share-item=/);
    assert.match(appSource, /url\.searchParams\.set\("item", item\.id\)/);
    assert.match(appSource, /globalThis\.milosAppEssentials\.ready\(\)/);
    assert.doesNotMatch(appSource, /dispatchEvent\(new CustomEvent\("milosapps:ready"\)\)/);
    assert.doesNotMatch(`${appSource}\n${shellSessionSource}`, /localStorage|sessionStorage/);
    assert.doesNotMatch(appSource, /navigator\.share|navigator\.clipboard/);
  });

  test("inventarisiert jeden Endgerätezugriff und hält optionale Zustände flüchtig", () => {
    assert.equal(storageInventory.appKey, "waste-guide");
    assert.equal(storageInventory.productionApproved, false);
    assert.deepEqual(storageInventory.browserStorage, {
      cookies: false,
      localStorage: false,
      sessionStorage: false,
      indexedDB: false
    });
    assert.equal(storageInventory.optionalState.region.storage, "memory-only");
    assert.equal(storageInventory.optionalState.searchHistory.storage, "disabled");
    assert.equal(storageInventory.optionalState.language.storage, "url-only");
    assert.ok(storageInventory.deviceAccess.every((entry) => entry.strictlyNecessary === true));
    assert.match(storageInventory.legacyPolicy, /never reads or writes/);
    assert.match(appSource, /register\(new URL\("\.\.\/offline-sw\.js"/);
    assert.doesNotMatch(appSource, /register\(new URL\("\.\.\/sw\.js"/);
    assert.match(legacyWorkerSource, /self\.registration\.unregister\(\)/);
    assert.match(legacyWorkerSource, /name\.startsWith\("waste-guide-"\)/);
    assert.match(offlineWorkerSource, /waste-guide-2026-08-09-feedback-v8/);
    const cacheName = offlineWorkerSource.match(/const CACHE_NAME = "([^"]+)";/)?.[1];
    const inventoryCache = storageInventory.deviceAccess.find((entry) => entry.api === "CacheStorage")?.identifier;
    assert.equal(inventoryCache, cacheName, "Das Speicherinventar muss den tatsächlich verwendeten Offline-Cache nennen.");
  });

  test("stellt den erkannten Gegenstand und Entsorgungsweg vor Details", () => {
    const immediate = appSource.indexOf('class="result-immediate"');
    const immediateEnd = appSource.indexOf('class="result-copy"');
    const immediateSource = appSource.slice(immediate, immediateEnd);
    const reason = appSource.indexOf('class="result-reason"');
    const steps = appSource.indexOf('class="result-steps"');
    const sources = appSource.indexOf('class="result-details"');
    assert.ok(immediate > 0 && immediate < reason && reason < steps && steps < sources);
    assert.match(appSource, /data-result-icon/);
    assert.match(appSource, /class="result-subject"/);
    assert.match(appSource, /class="result-destination"/);
    assert.match(appSource, /function renderDestination/);
    assert.match(appSource, /route-keyword/);
    assert.doesNotMatch(immediateSource, /recognizedLabel|disposalRouteLabel|result-certainty/);
  });

  test("lässt den Pages-Build bei fehlenden oder eingebetteten CSS-Dateien scheitern", () => {
    assert.match(buildSource, /milos-app-essentials\.css/);
    assert.match(buildSource, /milos-app-essentials-theme\.css/);
    assert.match(buildSource, /essentials-manifest\.schema\.json/);
    assert.match(buildSource, /verify\.mjs/);
    assert.match(buildSource, /missingEssentialsArtifacts/);
    assert.match(buildSource, /requiredAppArtifacts = \["sw\.js", "offline-sw\.js", "src\/shell-session\.js"\]/);
    assert.match(buildSource, /href=\["'\]data:text\\\/css/);
    assert.match(buildSource, /Gebautes HTML muss .* externe Same-Origin-Datei laden/);
  });

  test("erzwingt LF für alle bytegenau gelockten Vendor-Dateien", async () => {
    assert.equal(vendorAttributes, "* text eol=lf\n");
    assert.equal(shellVendorAttributes, "* text eol=lf\n");

    for (const artifact of lockedArtifacts) {
      const content = await readFile(new URL(artifact, vendorRoot), "utf8");
      assert.doesNotMatch(content, /\r\n/, `${artifact} enthält CRLF statt LF`);
    }
    for (const artifact of shellLockedArtifacts) {
      const content = await readFile(new URL(artifact, shellVendorRoot), "utf8");
      assert.doesNotMatch(content, /\r\n/, `Shell ${artifact} enthält CRLF statt LF`);
    }
  });
});
