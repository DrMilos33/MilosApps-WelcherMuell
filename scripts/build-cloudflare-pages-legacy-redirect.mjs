import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputRoot = resolve(repositoryRoot, "dist", "production-legacy-redirect");
const allowedOutputRoot = resolve(repositoryRoot, "dist");
const expectedSourceCommit = process.env.WASTE_GUIDE_SOURCE_COMMIT;
const canonicalSourceBranch = "codex/waste-guide-canonical-cutover";
const sourceBranch = process.env.WASTE_GUIDE_LEGACY_REDIRECT_SOURCE_BRANCH;
const canonicalTarget = "https://milos-apps.de/welcher-muell";
const portalOriginRevision = "https://7bd3fbc3.milosapps-waste-guide-production.pages.dev";
const legacyOrigins = [
  "https://welcher-muell.milos-apps.de/",
  "https://milosapps-waste-guide-production.pages.dev/"
];

function git(args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true
  }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

if (!/^[0-9a-f]{40}$/.test(expectedSourceCommit ?? "")) {
  throw new Error("WASTE_GUIDE_SOURCE_COMMIT muss den vollständigen Cutover-Commit enthalten.");
}
const sourceCommit = git(["rev-parse", "HEAD"]);
if (sourceCommit !== expectedSourceCommit) {
  throw new Error(`Cutover-Commit stimmt nicht: erwartet ${expectedSourceCommit}, gefunden ${sourceCommit}.`);
}
if (sourceBranch !== canonicalSourceBranch) {
  throw new Error(`WASTE_GUIDE_LEGACY_REDIRECT_SOURCE_BRANCH muss exakt ${canonicalSourceBranch} sein.`);
}
if (!outputRoot.startsWith(`${allowedOutputRoot}${sep}`)) {
  throw new Error(`Unsicheres Ausgabeverzeichnis: ${outputRoot}`);
}

const sourceTree = git(["rev-parse", "HEAD^{tree}"]);
const redirectRule = `/* ${canonicalTarget}/:splat 308\n`;

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await writeFile(resolve(outputRoot, "_redirects"), redirectRule, "utf8");

const redirectHash = sha256(await readFile(resolve(outputRoot, "_redirects")));
const artifactSha256 = sha256(`_redirects\0${redirectHash}\n`);
const deployment = {
  schemaVersion: 1,
  artifactType: "legacy-redirect",
  appKey: "waste-guide",
  environment: "PRODUCTION",
  provider: "Cloudflare Pages",
  projectName: "milosapps-waste-guide-production",
  sourceBranch,
  sourceCommit,
  sourceTree,
  productionApproved: true,
  functionsAllowed: false,
  canonicalTarget,
  portalOriginRevision,
  legacyOrigins,
  redirectStatus: 308,
  preservePathSuffix: true,
  preserveQuery: true,
  adsEnabled: false,
  cmpEnabled: false,
  trackingEnabled: false,
  artifactSha256,
  files: [{ path: "_redirects", sha256: redirectHash }]
};
await writeFile(
  resolve(outputRoot, "deployment.json"),
  `${JSON.stringify(deployment, null, 2)}\n`,
  "utf8"
);

console.log(JSON.stringify({
  status: "PASS",
  outputRoot,
  sourceCommit,
  artifactSha256,
  redirectRule: redirectRule.trim()
}, null, 2));
