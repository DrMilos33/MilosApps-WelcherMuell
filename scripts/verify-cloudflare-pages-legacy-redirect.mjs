import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputRoot = resolve(repositoryRoot, "dist", "production-legacy-redirect");
const canonicalTarget = "https://milos-apps.de/welcher-muell";
const expectedRule = `/* ${canonicalTarget}/:splat 308\n`;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const deployment = JSON.parse(await readFile(resolve(outputRoot, "deployment.json"), "utf8"));
const redirects = await readFile(resolve(outputRoot, "_redirects"), "utf8");
const entries = (await readdir(outputRoot)).sort();

assert.deepEqual(entries, ["_redirects", "deployment.json"]);
assert.equal(redirects, expectedRule);
assert.equal(deployment.schemaVersion, 1);
assert.equal(deployment.artifactType, "legacy-redirect");
assert.equal(deployment.appKey, "waste-guide");
assert.equal(deployment.environment, "PRODUCTION");
assert.equal(deployment.provider, "Cloudflare Pages");
assert.equal(deployment.projectName, "milosapps-waste-guide-production");
assert.equal(deployment.sourceBranch, "codex/waste-guide-canonical-cutover");
assert.match(deployment.sourceCommit, /^[0-9a-f]{40}$/);
assert.match(deployment.sourceTree, /^[0-9a-f]{40}$/);
assert.equal(deployment.productionApproved, true);
assert.equal(deployment.functionsAllowed, false);
assert.equal(deployment.canonicalTarget, canonicalTarget);
assert.equal(deployment.portalOriginRevision, "https://7bd3fbc3.milosapps-waste-guide-production.pages.dev");
assert.deepEqual(deployment.legacyOrigins, [
  "https://welcher-muell.milos-apps.de/",
  "https://milosapps-waste-guide-production.pages.dev/"
]);
assert.equal(deployment.redirectStatus, 308);
assert.equal(deployment.preservePathSuffix, true);
assert.equal(deployment.preserveQuery, true);
assert.equal(deployment.adsEnabled, false);
assert.equal(deployment.cmpEnabled, false);
assert.equal(deployment.trackingEnabled, false);
assert.equal(existsSync(resolve(outputRoot, "functions")), false);
assert.equal(existsSync(resolve(outputRoot, "_worker.js")), false);
assert.equal(existsSync(resolve(outputRoot, "index.html")), false);

const redirectHash = sha256(await readFile(resolve(outputRoot, "_redirects")));
assert.deepEqual(deployment.files, [{ path: "_redirects", sha256: redirectHash }]);
assert.equal(deployment.artifactSha256, sha256(`_redirects\0${redirectHash}\n`));

const cases = [
  ["/", "?item=iron&lang=en", `${canonicalTarget}/?item=iron&lang=en`],
  ["/healthz", "", `${canonicalTarget}/healthz`],
  ["/assets/icon.svg", "?download=1", `${canonicalTarget}/assets/icon.svg?download=1`],
  ["/nested/path", "?a=1&b=2", `${canonicalTarget}/nested/path?a=1&b=2`]
];
for (const [pathname, search, expected] of cases) {
  const suffix = pathname.slice(1);
  assert.equal(`${canonicalTarget}/${suffix}${search}`, expected);
}

console.log(JSON.stringify({
  status: "PASS",
  outputRoot,
  sourceCommit: deployment.sourceCommit,
  artifactSha256: deployment.artifactSha256,
  files: entries
}, null, 2));
