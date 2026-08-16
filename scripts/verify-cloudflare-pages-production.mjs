import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputRoot = resolve(repositoryRoot, "dist", "production");
const expectedContentVersion = "2026.08.09-1";
const expectedProjectName = "milosapps-waste-guide-production";
const expectedProductionUrl = "https://welcher-muell.milos-apps.de/";
const expectedFeedbackEndpoint = "https://milosapps-waste-guide-feedback-production.pascalcasiddu.workers.dev/v1/feedback";
const expectedFeedbackOrigin = new URL(expectedFeedbackEndpoint).origin;

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

async function json(path) {
  return JSON.parse(await readFile(resolve(outputRoot, path), "utf8"));
}

const deployment = await json("deployment.json");
assert.equal(deployment.appKey, "waste-guide");
assert.equal(deployment.environment, "PRODUCTION");
assert.equal(deployment.provider, "Cloudflare Pages");
assert.equal(deployment.projectName, expectedProjectName);
assert.equal(deployment.targetConfirmed, true);
assert.equal(deployment.productionApproved, true);
assert.equal(deployment.functionsAllowed, false);
assert.equal(deployment.contentVersion, expectedContentVersion);
assert.match(deployment.sourceCommit, /^[0-9a-f]{40}$/);
assert.match(deployment.sourceTree, /^[0-9a-f]{40}$/);
assert.equal(deployment.publicUrl, expectedProductionUrl);
assert.equal(new URL(deployment.publicUrl).pathname, "/");
assert.equal(deployment.healthUrl, new URL("healthz", deployment.publicUrl).toString());
assert.equal(deployment.adsEnabled, false);
assert.deepEqual(deployment.feedback, {
  endpoint: expectedFeedbackEndpoint,
  healthUrl: "https://milosapps-waste-guide-feedback-production.pascalcasiddu.workers.dev/healthz",
  database: "milosapps-waste-guide-feedback-production",
  dataJurisdiction: "EU"
});

const actualFiles = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) await collect(fullPath);
    else if (entry.name !== "deployment.json") {
      actualFiles.push({
        path: relative(outputRoot, fullPath).replaceAll("\\", "/"),
        sha256: sha256(await readFile(fullPath))
      });
    }
  }
}
await collect(outputRoot);
actualFiles.sort((left, right) => left.path.localeCompare(right.path));
assert.deepEqual(actualFiles, deployment.files, "deployment.json muss jede ausgelieferte Datei bytegenau binden");
assert.equal(
  deployment.artifactSha256,
  sha256(actualFiles.map(({ path, sha256: hash }) => `${path}\0${hash}\n`).join(""))
);

for (const forbidden of ["_worker.js", "functions", "MilosApps-WelcherMuell"]) {
  assert.equal(existsSync(resolve(outputRoot, forbidden)), false, `${forbidden} darf nicht im Production-Output liegen`);
}

const appManifest = await json("milos-app.json");
const essentialsManifest = await json("milos-essentials.json");
const metadata = await json("meta.json");
const health = JSON.parse(await readFile(resolve(outputRoot, "healthz"), "utf8"));
const storage = await json("device-storage-inventory.json");
assert.equal(appManifest.environment, "production");
assert.equal(appManifest.productionApproved, true);
assert.equal(essentialsManifest.environment, "production");
assert.equal(essentialsManifest.productionApproved, true);
assert.equal(essentialsManifest.privacy.privacyUrl, "https://milos-apps.de/datenschutz");
assert.equal(metadata.status, "PRODUCTION");
assert.equal(metadata.productionUrl, deployment.publicUrl);
assert.equal(metadata.healthcheck, deployment.healthUrl);
assert.equal(metadata.productionApproved, true);
assert.equal(metadata.adsEnabled, false);
assert.deepEqual(metadata.feedback, {
  provider: "Cloudflare Worker + D1",
  environment: "PRODUCTION",
  endpoint: expectedFeedbackEndpoint,
  healthUrl: deployment.feedback.healthUrl,
  database: deployment.feedback.database,
  dataJurisdiction: "EU",
  productionApproved: true
});
assert.equal(metadata.deployment.environment, "PRODUCTION");
assert.equal(metadata.deployment.targetConfirmed, deployment.targetConfirmed);
assert.equal(storage.productionApproved, true);
assert.equal(storage.browserStorage.cookies, false);
assert.equal(storage.browserStorage.localStorage, false);
assert.equal(storage.browserStorage.sessionStorage, false);
assert.equal(storage.browserStorage.indexedDB, false);
assert.equal(storage.deviceAccess.find((entry) => entry.api === "CacheStorage")?.identifier, "waste-guide-production-2026-08-09-feedback-v8");
assert.match(storage.serverData.resultFeedback.deploymentStatus, /PRODUCTION/);
const feedbackService = storage.externalServices.find((entry) => entry.service === "App-owned Cloudflare Worker and D1");
assert.equal(feedbackService.endpoint, expectedFeedbackEndpoint);
assert.equal(feedbackService.healthUrl, deployment.feedback.healthUrl);
assert.equal(feedbackService.database, deployment.feedback.database);
assert.equal(feedbackService.dataJurisdiction, "EU");
assert.deepEqual(health, {
  status: "ok",
  appKey: "waste-guide",
  environment: "PRODUCTION",
  contentVersion: expectedContentVersion,
  productionApproved: true,
  sourceCommit: deployment.sourceCommit
});

const index = await readFile(resolve(outputRoot, "index.html"), "utf8");
const notFound = await readFile(resolve(outputRoot, "404.html"), "utf8");
assert.match(index, /<html lang="de" data-milos-environment="production" data-milos-production-approved="true">/);
assert.match(index, /data-milos-privacy-info href="https:\/\/milos-apps\.de\/datenschutz"/);
assert.match(index, /<link rel="canonical" href="https:\/\/welcher-muell\.milos-apps\.de\/">/);
assert.match(index, /<meta name="robots" content="index,follow,max-image-preview:large">/);
assert.match(index, /<meta name="waste-guide-ads-enabled" content="false">/);
assert.match(index, new RegExp(`<meta name="waste-guide-feedback-endpoint" content="${expectedFeedbackEndpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`));
assert.match(index, /data-i18n="trustSourceSeparation"/);
assert.match(index, /data-i18n="trustSourcePackaging"/);
assert.match(index, /data-i18n="trustSourceMedicine"/);
assert.doesNotMatch(index, /https:\/\/dev\.milos-apps\.de\/datenschutz/);
assert.doesNotMatch(index, /MilosApps-WelcherMuell\//);
assert.doesNotMatch(index, /pagead2|adsbygoogle|googlesyndication/i);
assert.equal((index.match(/milos-app-essentials\.css/g) ?? []).length, 1);
assert.equal((index.match(/milos-app-essentials-theme\.css/g) ?? []).length, 1);
assert.match(notFound, /<html lang="de" data-milos-environment="production" data-milos-production-approved="true">/);
assert.match(notFound, /<h1 id="not-found-title">Diese Seite gibt es nicht\.<\/h1>/);
assert.match(notFound, /<a href="\/">Open Waste Guide<\/a>/);
assert.doesNotMatch(notFound, /<script|unsafe-inline|https:\/\//);

const shellBootstrap = await readFile(resolve(outputRoot, "vendor", "milosapps-shell", "v2", "bootstrap.js"), "utf8");
const essentialsBootstrap = await readFile(resolve(outputRoot, "vendor", "milosapps-essentials", "v1", "bootstrap.js"), "utf8");
for (const bootstrap of [shellBootstrap, essentialsBootstrap]) {
  assert.match(bootstrap, /"environment": "production"/);
  assert.match(bootstrap, /"productionApproved": true/);
  assert.doesNotMatch(bootstrap, /"environment": "dev"|"productionApproved": false/);
}
assert.match(essentialsBootstrap, /"privacyUrl": "https:\/\/milos-apps\.de\/datenschutz"/);

const offlineWorker = await readFile(resolve(outputRoot, "offline-sw.js"), "utf8");
assert.match(offlineWorker, /waste-guide-production-2026-08-09-feedback-v8/);
assert.doesNotMatch(offlineWorker, /waste-guide-2026-08-09-feedback-v8/);

const robots = await readFile(resolve(outputRoot, "robots.txt"), "utf8");
const sitemap = await readFile(resolve(outputRoot, "sitemap.xml"), "utf8");
assert.equal(robots, "User-agent: *\nAllow: /\nSitemap: https://welcher-muell.milos-apps.de/sitemap.xml\n");
assert.match(sitemap, /<loc>https:\/\/welcher-muell\.milos-apps\.de\/<\/loc>/);
assert.match(sitemap, /<lastmod>2026-08-09<\/lastmod>/);
assert.equal(existsSync(resolve(outputRoot, "ads.txt")), false, "Ohne AdSense-Freigabe darf kein ads.txt ausgeliefert werden");

const headers = await readFile(resolve(outputRoot, "_headers"), "utf8");
assert.match(headers, /^\/\*\r?\n/m);
assert.match(headers, /Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self';/);
assert.match(headers, /frame-ancestors 'none'/);
assert.match(headers, /worker-src 'self'/);
assert.match(headers, new RegExp(`connect-src 'self' ${expectedFeedbackOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
assert.doesNotMatch(headers, /unsafe-inline|unsafe-eval|data:/);
assert.equal((headers.match(/https:\/\//g) ?? []).length, 1, "CSP darf nur den exakten Feedback-Origin öffnen");
assert.match(headers, /\/healthz\r?\n  Content-Type: application\/json; charset=utf-8\r?\n  Cache-Control: no-store/);
assert.match(headers, /X-Content-Type-Options: nosniff/);
assert.match(headers, /Permissions-Policy: geolocation=\(\), camera=\(\), microphone=\(\)/);

for (const [vendor, manifest] of [
  ["vendor/milosapps-shell/v2/verify.mjs", "milos-app.json"],
  ["vendor/milosapps-essentials/v1/verify.mjs", "milos-essentials.json"]
]) {
  execFileSync(process.execPath, [resolve(outputRoot, vendor), "--app-root", outputRoot, "--manifest", manifest], {
    cwd: outputRoot,
    stdio: "inherit"
  });
}

console.log(JSON.stringify({
  status: "PASS",
  outputRoot,
  sourceCommit: deployment.sourceCommit,
  artifactSha256: deployment.artifactSha256,
  targetConfirmed: deployment.targetConfirmed,
  fileCount: deployment.files.length + 1
}, null, 2));
