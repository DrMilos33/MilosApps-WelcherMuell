import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const evidence = Object.freeze({
  commit: "742b99a6dbb1f1089007a5edcabebca25c599330",
  publicDataTree: "1c3b643799d901260dd591ae9199761449cb5f36",
  qaReportBlob: "2eed8e6851e82aedb20bd26a8e66524741f8eb4d",
  sourcesDocumentBlob: "4e0a94b2eeb8e0c8511f766ae0da051d8b5f132f",
  sourceCount: 30,
  checkedAt: "2026-08-09"
});

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const currentCommit = git(["rev-parse", "HEAD^{commit}"]);
assert.equal(git(["rev-parse", `${evidence.commit}^{commit}`]), evidence.commit);
execFileSync("git", ["merge-base", "--is-ancestor", evidence.commit, currentCommit], { stdio: "ignore" });
assert.equal(git(["rev-parse", `${evidence.commit}:public/data`]), evidence.publicDataTree);
assert.equal(
  git(["rev-parse", `${currentCommit}:public/data`]),
  evidence.publicDataTree,
  "Redaktionelle Daten haben sich seit der 30/30-Onlineevidenz verändert."
);
assert.equal(git(["rev-parse", `${evidence.commit}:docs/QA_REPORT.md`]), evidence.qaReportBlob);
assert.equal(git(["rev-parse", `${evidence.commit}:docs/SOURCES_AND_LICENSES.md`]), evidence.sourcesDocumentBlob);

const catalog = JSON.parse(await readFile(new URL("../public/data/sources.v1.json", import.meta.url), "utf8"));
assert.equal(catalog.sources.length, evidence.sourceCount);
assert.equal(new Set(catalog.sources.map((source) => source.id)).size, evidence.sourceCount);
for (const source of catalog.sources) {
  assert.equal(new URL(source.url).protocol, "https:");
}

const qaReport = git(["show", `${evidence.commit}:docs/QA_REPORT.md`]);
const sourcesDocument = git(["show", `${evidence.commit}:docs/SOURCES_AND_LICENSES.md`]);
assert.match(qaReport, /30\/30 amtliche Quellen mit HTTP 200/);
assert.match(sourcesDocument, /Am 09\.08\.2026 beantworteten alle 30 katalogisierten amtlichen und kommunalen/);

console.log(JSON.stringify({
  status: "verified-immutable-current-source-evidence",
  currentCommit,
  evidenceCommit: evidence.commit,
  publicDataTree: evidence.publicDataTree,
  sourceCount: evidence.sourceCount,
  checkedAt: evidence.checkedAt
}, null, 2));
