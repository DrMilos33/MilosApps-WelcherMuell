import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const expectedSourceCommit = process.env.WASTE_GUIDE_SOURCE_COMMIT;
if (!/^[0-9a-f]{40}$/.test(expectedSourceCommit ?? "")) {
  throw new Error("WASTE_GUIDE_SOURCE_COMMIT muss den vollständigen, zu veröffentlichenden Quellcommit enthalten.");
}
const expectedContentVersion = "2026.08.09-1";
const repositoryName = "MilosApps-WelcherMuell";
const basePath = `/${repositoryName}`;
const devUrl = `https://drmilos33.github.io${basePath}/`;
const healthUrl = `${devUrl}healthz`;
const outputRoot = resolve(repositoryRoot, "dist", repositoryName);
const allowedOutputRoot = resolve(repositoryRoot, "dist");
const gitSafeDirectory = repositoryRoot.replaceAll("\\", "/");

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

const sourceCommit = git(["rev-parse", `${expectedSourceCommit}^{commit}`], { encoding: "utf8" }).trim();
if (sourceCommit !== expectedSourceCommit) {
  throw new Error(`Unerwarteter Quellcommit: ${sourceCommit}`);
}

const sourceTree = git(["show", "-s", "--format=%T", sourceCommit], { encoding: "utf8" }).trim();
const deployablePrefixes = ["assets/", "public/", "src/", "vendor/"];
const deployableRootFiles = new Set(["index.html", "manifest.webmanifest", "meta.json", "milos-app.json", "milos-essentials.json", "sw.js", "offline-sw.js"]);
const sourcePaths = git(["ls-tree", "-r", "--name-only", sourceCommit], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((path) => deployableRootFiles.has(path) || deployablePrefixes.some((prefix) => path.startsWith(prefix)));
const requiredEssentialsArtifacts = [
  "milos-essentials.json",
  "vendor/milosapps-essentials/v1/bootstrap.js",
  "vendor/milosapps-essentials/v1/milos-app-essentials.js",
  "vendor/milosapps-essentials/v1/milos-app-essentials.css",
  "vendor/milosapps-essentials/v1/milos-app-essentials-theme.css",
  "vendor/milosapps-essentials/v1/verify.mjs",
  "vendor/milosapps-essentials/v1/essentials-manifest.schema.json",
  "vendor/milosapps-essentials/v1/essentials-lock.json"
];
const missingEssentialsArtifacts = requiredEssentialsArtifacts.filter((path) => !sourcePaths.includes(path));
if (missingEssentialsArtifacts.length > 0) {
  throw new Error(`Essentials-Artefakte fehlen im Quellcommit: ${missingEssentialsArtifacts.join(", ")}`);
}
const requiredAppArtifacts = ["sw.js", "offline-sw.js", "src/shell-session.js"];
const missingAppArtifacts = requiredAppArtifacts.filter((path) => !sourcePaths.includes(path));
if (missingAppArtifacts.length > 0) {
  throw new Error(`App-Laufzeitartefakte fehlen im Quellcommit: ${missingAppArtifacts.join(", ")}`);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const path of sourcePaths) {
  const outputPath = resolve(outputRoot, path);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, git(["show", `${sourceCommit}:${path}`]));
}

const indexPath = resolve(outputRoot, "index.html");
let indexHtml = await readFile(indexPath, "utf8");
for (const [from, to] of [
  ['href="/manifest.webmanifest"', `href="${basePath}/manifest.webmanifest"`],
  ['href="/assets/icon.svg"', `href="${basePath}/assets/icon.svg"`],
  ['href="/src/styles.css"', `href="${basePath}/src/styles.css"`],
  ['href="/"', `href="${basePath}/"`],
  ['href="/meta.json"', `href="${basePath}/meta.json"`],
  ['src="/src/app.js"', `src="${basePath}/src/app.js"`]
]) {
  indexHtml = indexHtml.replaceAll(from, to);
}
for (const stylesheet of ["milos-app-essentials.css", "milos-app-essentials-theme.css"]) {
  const expectedHref = `./vendor/milosapps-essentials/v1/${stylesheet}`;
  const matches = indexHtml.match(new RegExp(`href=["']${expectedHref.replaceAll(".", "\\.")}["']`, "g")) ?? [];
  if (matches.length !== 1) {
    throw new Error(`Gebautes HTML muss ${stylesheet} exakt einmal als externe Same-Origin-Datei laden.`);
  }
}
if (/href=["']data:text\/css/i.test(indexHtml) || /src=["']data:/i.test(indexHtml)) {
  throw new Error("Gebautes HTML darf Essentials-Artefakte nicht als data:-URL einbetten.");
}
await writeFile(indexPath, indexHtml, "utf8");

const appPath = resolve(outputRoot, "src", "app.js");
let appJs = await readFile(appPath, "utf8");
appJs = appJs
  .replaceAll('"/public/data/', `"${basePath}/public/data/`);
await writeFile(appPath, appJs, "utf8");

for (const serviceWorkerFile of ["sw.js", "offline-sw.js"]) {
  const serviceWorkerPath = resolve(outputRoot, serviceWorkerFile);
  let serviceWorker = await readFile(serviceWorkerPath, "utf8");
  serviceWorker = serviceWorker.replaceAll('"/', `"${basePath}/`);
  await writeFile(serviceWorkerPath, serviceWorker, "utf8");
}

const manifestPath = resolve(outputRoot, "manifest.webmanifest");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.start_url = `${basePath}/`;
manifest.scope = `${basePath}/`;
manifest.icons = manifest.icons.map((icon) => ({
  ...icon,
  src: `${basePath}${icon.src}`
}));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const metaPath = resolve(outputRoot, "meta.json");
const meta = JSON.parse(await readFile(metaPath, "utf8"));
if (meta.contentVersion !== expectedContentVersion || meta.productionApproved !== false) {
  throw new Error("Inhaltsversion oder Production-Grenze des Quellstands stimmt nicht.");
}
meta.devUrl = devUrl;
meta.healthcheck = healthUrl;
meta.previewImage.path = `${basePath}${meta.previewImage.path}`;
meta.deployment = {
  provider: "GitHub Pages",
  environment: "DEV",
  sourceCommit,
  sourceTree,
  branch: "dev-pages",
  productionApproved: false
};
await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");

const health = {
  status: "ok",
  appKey: "waste-guide",
  environment: "DEV",
  contentVersion: expectedContentVersion,
  productionApproved: false,
  sourceCommit
};
await writeFile(resolve(outputRoot, "healthz"), JSON.stringify(health), "utf8");
await writeFile(resolve(outputRoot, ".nojekyll"), "", "utf8");

const artifactFiles = [];
async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(fullPath);
    } else if (entry.name !== "deployment.json") {
      const contents = await readFile(fullPath);
      artifactFiles.push({
        path: relative(outputRoot, fullPath).replaceAll("\\", "/"),
        sha256: createHash("sha256").update(contents).digest("hex")
      });
    }
  }
}
await collectFiles(outputRoot);
artifactFiles.sort((left, right) => left.path.localeCompare(right.path));

const deployment = {
  schemaVersion: 1,
  appKey: "waste-guide",
  environment: "DEV",
  provider: "GitHub Pages",
  devUrl,
  healthUrl,
  sourceCommit,
  sourceTree,
  contentVersion: expectedContentVersion,
  productionApproved: false,
  files: artifactFiles
};
await writeFile(resolve(outputRoot, "deployment.json"), `${JSON.stringify(deployment, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  outputRoot,
  devUrl,
  healthUrl,
  sourceCommit,
  sourceTree,
  fileCount: artifactFiles.length + 1
}, null, 2));
