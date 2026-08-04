import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputRoot = resolve(repositoryRoot, "dist", "production");
const expectedContentVersion = "2026.08.03-4";
const expectedProjectName = "milosapps-waste-guide-production";

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
assert.equal(deployment.productionApproved, true);
assert.equal(deployment.functionsAllowed, false);
assert.equal(deployment.contentVersion, expectedContentVersion);
assert.match(deployment.sourceCommit, /^[0-9a-f]{40}$/);
assert.match(deployment.sourceTree, /^[0-9a-f]{40}$/);
assert.match(deployment.publicUrl, /^https:\/\//);
assert.equal(new URL(deployment.publicUrl).pathname, "/");
assert.equal(deployment.healthUrl, new URL("healthz", deployment.publicUrl).toString());

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
assert.equal(metadata.deployment.environment, "PRODUCTION");
assert.equal(metadata.deployment.targetConfirmed, deployment.targetConfirmed);
assert.equal(storage.productionApproved, true);
assert.equal(storage.browserStorage.cookies, false);
assert.equal(storage.browserStorage.localStorage, false);
assert.equal(storage.browserStorage.sessionStorage, false);
assert.equal(storage.browserStorage.indexedDB, false);
assert.equal(storage.deviceAccess.find((entry) => entry.api === "CacheStorage")?.identifier, "waste-guide-production-2026-08-03-search-v6");
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
assert.doesNotMatch(index, /https:\/\/dev\.milos-apps\.de\/datenschutz/);
assert.doesNotMatch(index, /MilosApps-WelcherMuell\//);
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
assert.match(offlineWorker, /waste-guide-production-2026-08-03-search-v6/);
assert.doesNotMatch(offlineWorker, /waste-guide-2026-08-03-search-v6/);

const headers = await readFile(resolve(outputRoot, "_headers"), "utf8");
assert.match(headers, /^\/\*\r?\n/m);
assert.match(headers, /Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self';/);
assert.match(headers, /frame-ancestors 'none'/);
assert.match(headers, /worker-src 'self'/);
assert.doesNotMatch(headers, /unsafe-inline|unsafe-eval|data:|https:\/\//);
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
