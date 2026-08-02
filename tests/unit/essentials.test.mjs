import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

const repositoryRoot = new URL("../../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("milos-essentials.json", repositoryRoot), "utf8"));
const indexHtml = await readFile(new URL("index.html", repositoryRoot), "utf8");
const appSource = await readFile(new URL("src/app.js", repositoryRoot), "utf8");
const buildSource = await readFile(new URL("scripts/build-github-pages-dev.mjs", repositoryRoot), "utf8");
const vendorRoot = new URL("vendor/milosapps-essentials/v1/", repositoryRoot);
const vendorAttributes = await readFile(new URL(".gitattributes", vendorRoot), "utf8");
const lockedArtifacts = [
  "bootstrap.js",
  "milos-app-essentials.css",
  "milos-app-essentials-theme.css",
  "milos-app-essentials.js",
  "verify.mjs"
];

describe("public-app-essentials/v1", () => {
  test("pinnt den unveränderlichen Shared-Release und die DEV-Grenze", () => {
    assert.equal(manifest.appKey, "waste-guide");
    assert.equal(manifest.environment, "dev");
    assert.equal(manifest.productionApproved, false);
    assert.deepEqual(manifest.essentialsContract, {
      id: "public-app-essentials/v1",
      version: "1.0.0",
      sharedCommit: "b09e09008ff05fe87f05bc647a7c4964ff13e6f6",
      vendorDirectory: "vendor/milosapps-essentials/v1"
    });
  });

  test("aktiviert nur Loader, ehrlichen Datenschutzhinweis und Teilen", () => {
    assert.deepEqual(manifest.features, {
      startup: true,
      privacyNotice: true,
      share: true,
      datePicker: false,
      placeSearch: false
    });
    assert.deepEqual(manifest.privacy, {
      mode: "no-cookies",
      usesLocalStorage: true,
      optionalTracking: false,
      privacyUrl: "https://dev.milos-apps.de/datenschutz"
    });
    assert.doesNotMatch(indexHtml, /<milos-(?:date-picker|place-search)\b/);
  });

  test("lädt CSS vor Modulen und teilt nur die kanonische Ergebnis-URL", () => {
    const essentialsCss = indexHtml.indexOf("milos-app-essentials.css");
    const essentialsTheme = indexHtml.indexOf("milos-app-essentials-theme.css");
    const firstModule = indexHtml.indexOf('type="module"');
    assert.ok(essentialsCss > 0 && essentialsCss < firstModule);
    assert.ok(essentialsTheme > essentialsCss && essentialsTheme < firstModule);
    assert.match(indexHtml, /data-milos-app-loading/);
    assert.match(indexHtml, /data-milos-loading-icon[^>]+width="52"[^>]+height="52"/);
    assert.equal((indexHtml.match(/<h1\b/g) ?? []).length, 1);
    assert.match(appSource, /<milos-share-button data-share-item=/);
    assert.match(appSource, /url\.searchParams\.set\("item", item\.id\)/);
    assert.match(appSource, /document\.dispatchEvent\(new CustomEvent\("milosapps:ready"\)\)/);
    assert.match(appSource, /localStorage\.removeItem\(PRIVACY_NOTICE_STORAGE_KEY\)/);
    assert.doesNotMatch(appSource, /navigator\.share|navigator\.clipboard/);
  });

  test("lässt den Pages-Build bei fehlenden oder eingebetteten CSS-Dateien scheitern", () => {
    assert.match(buildSource, /milos-app-essentials\.css/);
    assert.match(buildSource, /milos-app-essentials-theme\.css/);
    assert.match(buildSource, /missingEssentialsArtifacts/);
    assert.match(buildSource, /href=\["'\]data:text\\\/css/);
    assert.match(buildSource, /Gebautes HTML muss .* externe Same-Origin-Datei laden/);
  });

  test("erzwingt LF für alle bytegenau gelockten Vendor-Dateien", async () => {
    assert.equal(vendorAttributes, "* text eol=lf\n");

    for (const artifact of lockedArtifacts) {
      const content = await readFile(new URL(artifact, vendorRoot), "utf8");
      assert.doesNotMatch(content, /\r\n/, `${artifact} enthält CRLF statt LF`);
    }
  });
});
