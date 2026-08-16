import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputRoot = resolve(repositoryRoot, "dist", "production");
const allowedOutputRoot = resolve(repositoryRoot, "dist");
const runtimeBaseCommit = "e573e7711e69f5b59603f611e64adc9f29c490e3";
const expectedContentVersion = "2026.08.09-1";
const projectName = "milosapps-waste-guide-production";
const canonicalProductionUrl = "https://welcher-muell.milos-apps.de/";
const canonicalFeedbackEndpoint = "https://milosapps-waste-guide-feedback-production.pascalcasiddu.workers.dev/v1/feedback";
const canonicalSourceBranch = "codex/waste-guide-production-refresh";
const expectedSourceCommit = process.env.WASTE_GUIDE_SOURCE_COMMIT;
const configuredProductionUrl = process.env.WASTE_GUIDE_PRODUCTION_URL;
const configuredFeedbackEndpoint = process.env.WASTE_GUIDE_FEEDBACK_ENDPOINT;
const targetConfirmed = process.env.WASTE_GUIDE_CLOUDFLARE_TARGET_CONFIRMED === "1";
const sourceBranch = process.env.WASTE_GUIDE_PRODUCTION_SOURCE_BRANCH || canonicalSourceBranch;
const gitSafeDirectory = repositoryRoot.replaceAll("\\", "/");

if (!/^[0-9a-f]{40}$/.test(expectedSourceCommit ?? "")) {
  throw new Error("WASTE_GUIDE_SOURCE_COMMIT muss den vollständigen Production-Kandidatencommit enthalten.");
}
if (!configuredProductionUrl) {
  throw new Error("WASTE_GUIDE_PRODUCTION_URL muss die explizite HTTPS-Kandidaten-URL enthalten.");
}
const productionUrl = new URL(configuredProductionUrl);
if (
  productionUrl.protocol !== "https:"
  || productionUrl.username
  || productionUrl.password
  || productionUrl.search
  || productionUrl.hash
  || productionUrl.pathname !== "/"
) {
  throw new Error("WASTE_GUIDE_PRODUCTION_URL muss eine credential-freie HTTPS-Origin-URL mit Root-Pfad sein.");
}
const publicUrl = productionUrl.toString();
if (publicUrl !== canonicalProductionUrl) {
  throw new Error(`WASTE_GUIDE_PRODUCTION_URL muss exakt ${canonicalProductionUrl} sein.`);
}
const healthUrl = new URL("healthz", productionUrl).toString();
if (!configuredFeedbackEndpoint) {
  throw new Error("WASTE_GUIDE_FEEDBACK_ENDPOINT muss den getrennten Production-Meldedienst enthalten.");
}
if (!targetConfirmed) {
  throw new Error("WASTE_GUIDE_CLOUDFLARE_TARGET_CONFIRMED muss für den bestätigten Production-Build 1 sein.");
}
if (sourceBranch !== canonicalSourceBranch) {
  throw new Error(`WASTE_GUIDE_PRODUCTION_SOURCE_BRANCH muss exakt ${canonicalSourceBranch} sein.`);
}
const feedbackEndpointUrl = new URL(configuredFeedbackEndpoint);
if (
  feedbackEndpointUrl.toString() !== canonicalFeedbackEndpoint
  || feedbackEndpointUrl.username
  || feedbackEndpointUrl.password
  || feedbackEndpointUrl.search
  || feedbackEndpointUrl.hash
) {
  throw new Error(`WASTE_GUIDE_FEEDBACK_ENDPOINT muss exakt ${canonicalFeedbackEndpoint} sein.`);
}
const feedbackEndpoint = feedbackEndpointUrl.toString();
const feedbackOrigin = feedbackEndpointUrl.origin;
const feedbackHealthUrl = new URL("/healthz", feedbackEndpointUrl).toString();

if (!outputRoot.startsWith(`${allowedOutputRoot}${sep}`)) {
  throw new Error(`Unsicheres Ausgabeverzeichnis: ${outputRoot}`);
}

function git(args, options = {}) {
  return execFileSync(
    "git",
    ["-c", `safe.directory=${gitSafeDirectory}`, "-C", repositoryRoot, ...args],
    { maxBuffer: 20 * 1024 * 1024, ...options }
  );
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function replaceExactly(source, from, to, label) {
  const occurrences = source.split(from).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${label}: erwartete exakt ein Vorkommen, gefunden ${occurrences}.`);
  }
  return source.replace(from, to);
}

const sourceCommit = git(["rev-parse", `${expectedSourceCommit}^{commit}`], { encoding: "utf8" }).trim();
if (sourceCommit !== expectedSourceCommit) {
  throw new Error(`Unerwarteter Quellcommit: ${sourceCommit}`);
}
try {
  git(["merge-base", "--is-ancestor", runtimeBaseCommit, sourceCommit]);
} catch {
  throw new Error(`Production-Kandidat muss von der Runtime-Basis ${runtimeBaseCommit} abstammen.`);
}
const sourceTree = git(["show", "-s", "--format=%T", sourceCommit], { encoding: "utf8" }).trim();
const deployablePrefixes = ["assets/", "public/", "src/", "vendor/"];
const deployableRootFiles = new Set([
  "404.html",
  "index.html",
  "manifest.webmanifest",
  "meta.json",
  "milos-app.json",
  "milos-essentials.json",
  "sw.js",
  "offline-sw.js"
]);
const sourcePaths = git(["ls-tree", "-r", "--name-only", sourceCommit], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((path) => deployableRootFiles.has(path) || deployablePrefixes.some((prefix) => path.startsWith(prefix)));

for (const required of [
  "404.html",
  "index.html",
  "manifest.webmanifest",
  "meta.json",
  "milos-app.json",
  "milos-essentials.json",
  "offline-sw.js",
  "assets/icon.svg",
  "vendor/milosapps-shell/v2/shell-lock.json",
  "vendor/milosapps-essentials/v1/essentials-lock.json"
]) {
  if (!sourcePaths.includes(required)) throw new Error(`Production-Artefaktquelle fehlt: ${required}`);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
for (const path of sourcePaths) {
  const outputPath = resolve(outputRoot, path);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, git(["show", `${sourceCommit}:${path}`]));
}

const appManifestPath = resolve(outputRoot, "milos-app.json");
const appManifest = JSON.parse(await readFile(appManifestPath, "utf8"));
appManifest.environment = "production";
appManifest.productionApproved = true;
await writeJson(appManifestPath, appManifest);

const essentialsManifestPath = resolve(outputRoot, "milos-essentials.json");
const essentialsManifest = JSON.parse(await readFile(essentialsManifestPath, "utf8"));
essentialsManifest.environment = "production";
essentialsManifest.productionApproved = true;
essentialsManifest.privacy.privacyUrl = "https://milos-apps.de/datenschutz";
await writeJson(essentialsManifestPath, essentialsManifest);

const shellBootstrapPath = resolve(outputRoot, "vendor", "milosapps-shell", "v2", "bootstrap.js");
let shellBootstrap = await readFile(shellBootstrapPath, "utf8");
shellBootstrap = replaceExactly(shellBootstrap, '"environment": "dev"', '"environment": "production"', "Shell-Bootstrap environment");
shellBootstrap = replaceExactly(shellBootstrap, '"productionApproved": false', '"productionApproved": true', "Shell-Bootstrap Production-Freigabe");
await writeFile(shellBootstrapPath, shellBootstrap, "utf8");

const essentialsBootstrapPath = resolve(outputRoot, "vendor", "milosapps-essentials", "v1", "bootstrap.js");
let essentialsBootstrap = await readFile(essentialsBootstrapPath, "utf8");
essentialsBootstrap = replaceExactly(essentialsBootstrap, '"environment": "dev"', '"environment": "production"', "Essentials-Bootstrap environment");
essentialsBootstrap = replaceExactly(essentialsBootstrap, '"productionApproved": false', '"productionApproved": true', "Essentials-Bootstrap Production-Freigabe");
essentialsBootstrap = replaceExactly(
  essentialsBootstrap,
  '"privacyUrl": "https://dev.milos-apps.de/datenschutz"',
  '"privacyUrl": "https://milos-apps.de/datenschutz"',
  "Essentials-Bootstrap Datenschutzlink"
);
await writeFile(essentialsBootstrapPath, essentialsBootstrap, "utf8");

const indexPath = resolve(outputRoot, "index.html");
let indexHtml = await readFile(indexPath, "utf8");
indexHtml = replaceExactly(
  indexHtml,
  '<html lang="de">',
  '<html lang="de" data-milos-environment="production" data-milos-production-approved="true">',
  "Index Production-Marker"
);
indexHtml = replaceExactly(
  indexHtml,
  'href="https://dev.milos-apps.de/datenschutz"',
  'href="https://milos-apps.de/datenschutz"',
  "Index Datenschutzlink"
);
indexHtml = replaceExactly(
  indexHtml,
  '<meta name="waste-guide-feedback-endpoint" content="/api/feedback">',
  `<link rel="canonical" href="${publicUrl}">\n    <meta name="robots" content="index,follow,max-image-preview:large">\n    <meta name="waste-guide-ads-enabled" content="false">\n    <meta name="waste-guide-feedback-endpoint" content="${feedbackEndpoint}">`,
  "Production Canonical, Ads- und Feedback-Metadaten"
);
await writeFile(indexPath, indexHtml, "utf8");

await writeFile(
  resolve(outputRoot, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${new URL("sitemap.xml", productionUrl)}\n`,
  "utf8"
);
await writeFile(
  resolve(outputRoot, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${publicUrl}</loc>\n    <lastmod>2026-08-09</lastmod>\n  </url>\n</urlset>\n`,
  "utf8"
);

const offlineWorkerPath = resolve(outputRoot, "offline-sw.js");
let offlineWorker = await readFile(offlineWorkerPath, "utf8");
offlineWorker = replaceExactly(
  offlineWorker,
  'const CACHE_NAME = "waste-guide-2026-08-09-feedback-v8";',
  'const CACHE_NAME = "waste-guide-production-2026-08-09-feedback-v8";',
  "Production-Service-Worker-Cache"
);
await writeFile(offlineWorkerPath, offlineWorker, "utf8");

const manifestPath = resolve(outputRoot, "manifest.webmanifest");
const webManifest = JSON.parse(await readFile(manifestPath, "utf8"));
webManifest.start_url = "/";
webManifest.scope = "/";
webManifest.icons = webManifest.icons.map((icon) => ({ ...icon, src: icon.src.startsWith("/") ? icon.src : `/${icon.src.replace(/^\.\//, "")}` }));
await writeJson(manifestPath, webManifest);

const metaPath = resolve(outputRoot, "meta.json");
const meta = JSON.parse(await readFile(metaPath, "utf8"));
if (meta.contentVersion !== expectedContentVersion) {
  throw new Error(`Unerwartete Inhaltsversion: ${meta.contentVersion}`);
}
meta.status = "PRODUCTION";
meta.productionUrl = publicUrl;
meta.healthcheck = healthUrl;
meta.productionApproved = true;
meta.adsEnabled = false;
meta.previewImage.path = "/assets/preview.svg";
meta.feedback = {
  provider: "Cloudflare Worker + D1",
  environment: "PRODUCTION",
  endpoint: feedbackEndpoint,
  healthUrl: feedbackHealthUrl,
  database: "milosapps-waste-guide-feedback-production",
  dataJurisdiction: "EU",
  productionApproved: true
};
meta.deployment = {
  provider: "Cloudflare Pages",
  environment: "PRODUCTION",
  projectName,
  targetConfirmed,
  sourceBranch,
  sourceCommit,
  sourceTree,
  adsEnabled: false,
  productionApproved: true
};
await writeJson(metaPath, meta);

const storageInventory = JSON.parse(
  git(["show", `${sourceCommit}:docs/DEVICE_STORAGE_INVENTORY.json`], { encoding: "utf8" })
);
storageInventory.reviewedAt = "2026-08-09";
storageInventory.productionApproved = true;
const cacheEntry = storageInventory.deviceAccess.find((entry) => entry.api === "CacheStorage");
if (!cacheEntry) throw new Error("CacheStorage fehlt im Endgeräteinventar.");
cacheEntry.identifier = "waste-guide-production-2026-08-09-feedback-v8";
const feedbackStorage = storageInventory.serverData?.resultFeedback;
if (!feedbackStorage) throw new Error("Feedback-Speicherinventar fehlt.");
feedbackStorage.deploymentStatus = "PRODUCTION auf getrenntem app-eigenem EU-D1-Ziel konfiguriert";
storageInventory.externalServices = storageInventory.externalServices.map((entry) => {
  if (entry.service === "GitHub Pages") {
    return { ...entry, service: "Cloudflare Pages", purpose: "Production-App und alle redaktionellen Daten als Same-Origin-Dateien ausliefern" };
  }
  if (entry.service === "App-owned Cloudflare Worker and D1") {
    return {
      ...entry,
      status: "PRODUCTION configured",
      endpoint: feedbackEndpoint,
      healthUrl: feedbackHealthUrl,
      database: "milosapps-waste-guide-feedback-production",
      dataJurisdiction: "EU"
    };
  }
  return entry;
});
await writeJson(resolve(outputRoot, "device-storage-inventory.json"), storageInventory);
meta.deviceStorageInventory = "./device-storage-inventory.json";
await writeJson(metaPath, meta);

const shellLockPath = resolve(outputRoot, "vendor", "milosapps-shell", "v2", "shell-lock.json");
const shellLock = JSON.parse(await readFile(shellLockPath, "utf8"));
for (const artifact of Object.keys(shellLock.artifacts)) {
  shellLock.artifacts[artifact] = `sha256:${sha256(await readFile(resolve(dirname(shellLockPath), artifact)))}`;
}
await writeJson(shellLockPath, shellLock);

const essentialsLockPath = resolve(outputRoot, "vendor", "milosapps-essentials", "v1", "essentials-lock.json");
const essentialsLock = JSON.parse(await readFile(essentialsLockPath, "utf8"));
essentialsLock.manifestSha256 = `sha256:${sha256(Buffer.from(canonicalJson(essentialsManifest), "utf8"))}`;
for (const artifact of Object.keys(essentialsLock.artifacts)) {
  essentialsLock.artifacts[artifact] = `sha256:${sha256(await readFile(resolve(dirname(essentialsLockPath), artifact)))}`;
}
await writeJson(essentialsLockPath, essentialsLock);

const health = {
  status: "ok",
  appKey: "waste-guide",
  environment: "PRODUCTION",
  contentVersion: expectedContentVersion,
  productionApproved: true,
  sourceCommit
};
await writeFile(resolve(outputRoot, "healthz"), JSON.stringify(health), "utf8");

const csp = `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self' ${feedbackOrigin}; font-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; media-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`;
const headers = `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), camera=(), microphone=()
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Cache-Control: no-cache

/healthz
  Content-Type: application/json; charset=utf-8
  Cache-Control: no-store

/deployment.json
  Content-Type: application/json; charset=utf-8
  Cache-Control: no-store

/meta.json
  Content-Type: application/json; charset=utf-8
  Cache-Control: no-store

/device-storage-inventory.json
  Content-Type: application/json; charset=utf-8
  Cache-Control: no-store

/robots.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: no-cache

/sitemap.xml
  Content-Type: application/xml; charset=utf-8
  Cache-Control: no-cache

/offline-sw.js
  Content-Type: text/javascript; charset=utf-8
  Cache-Control: no-cache
  Service-Worker-Allowed: /

/sw.js
  Content-Type: text/javascript; charset=utf-8
  Cache-Control: no-cache
  Service-Worker-Allowed: /
`;
await writeFile(resolve(outputRoot, "_headers"), headers, "utf8");

const artifactFiles = [];
async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(fullPath);
    } else if (entry.name !== "deployment.json") {
      artifactFiles.push({
        path: relative(outputRoot, fullPath).replaceAll("\\", "/"),
        sha256: sha256(await readFile(fullPath))
      });
    }
  }
}
await collectFiles(outputRoot);
artifactFiles.sort((left, right) => left.path.localeCompare(right.path));
const artifactSha256 = sha256(artifactFiles.map(({ path, sha256: hash }) => `${path}\0${hash}\n`).join(""));
const deployment = {
  schemaVersion: 1,
  appKey: "waste-guide",
  environment: "PRODUCTION",
  provider: "Cloudflare Pages",
  projectName,
  targetConfirmed,
  functionsAllowed: false,
  publicUrl,
  healthUrl,
  sourceBranch,
  sourceCommit,
  sourceTree,
  runtimeBaseCommit,
  contentVersion: expectedContentVersion,
  adsEnabled: false,
  feedback: {
    endpoint: feedbackEndpoint,
    healthUrl: feedbackHealthUrl,
    database: "milosapps-waste-guide-feedback-production",
    dataJurisdiction: "EU"
  },
  productionApproved: true,
  artifactSha256,
  files: artifactFiles
};
await writeJson(resolve(outputRoot, "deployment.json"), deployment);

console.log(JSON.stringify({
  outputRoot,
  projectName,
  targetConfirmed,
  publicUrl,
  healthUrl,
  sourceCommit,
  sourceTree,
  artifactSha256,
  fileCount: artifactFiles.length + 1
}, null, 2));
