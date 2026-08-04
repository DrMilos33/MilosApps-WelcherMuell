import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const evidence = Object.freeze({
  repository: "DrMilos33/MilosApps-WelcherMuell",
  commit: "a9738e80e54ab19f8feedb8b8e33399cf29ffdf0",
  publicDataTree: "6ce557371e27c60e8a6c263d2b2f01aefe45e24e",
  runId: 30933656781,
  jobId: 92074256068,
  jobName: "full-gate",
  stepName: "Run pnpm test:sources:online"
});

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function verifyLocalIdentity() {
  const currentCommit = git(["rev-parse", "HEAD^{commit}"]);
  const evidenceCommit = git(["rev-parse", `${evidence.commit}^{commit}`]);
  assert.equal(evidenceCommit, evidence.commit, "Der erwartete Evidenzcommit ist lokal nicht eindeutig vorhanden.");

  execFileSync("git", ["merge-base", "--is-ancestor", evidence.commit, currentCommit], {
    stdio: "ignore"
  });

  const evidenceTree = git(["rev-parse", `${evidence.commit}:public/data`]);
  const currentTree = git(["rev-parse", `${currentCommit}:public/data`]);
  assert.equal(evidenceTree, evidence.publicDataTree, "Der festgehaltene public/data-Evidenzbaum stimmt nicht.");
  assert.equal(
    currentTree,
    evidence.publicDataTree,
    "public/data wurde seit dem grünen Online-Quellenlauf verändert; frühere Evidenz ist unzulässig."
  );

  return { currentCommit, currentTree };
}

async function githubJson(path) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "MilosApps-Waste-Guide-Source-Evidence/1.0",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const response = await fetch(`https://api.github.com/repos/${evidence.repository}${path}`, { headers });
  assert.equal(response.ok, true, `GitHub-Evidenz konnte nicht bestätigt werden: HTTP ${response.status}.`);
  return response.json();
}

async function verifyRemoteEvidence() {
  const run = await githubJson(`/actions/runs/${evidence.runId}`);
  assert.equal(run.id, evidence.runId, "Unerwartete GitHub-Run-ID.");
  assert.equal(run.head_sha, evidence.commit, "Der Evidenzlauf gehört nicht zum festgehaltenen Commit.");
  assert.equal(run.status, "completed", "Der Evidenzlauf ist nicht abgeschlossen.");
  assert.equal(run.conclusion, "success", "Der Evidenzlauf war nicht erfolgreich.");

  const jobs = await githubJson(`/actions/runs/${evidence.runId}/jobs?per_page=100`);
  const job = jobs.jobs?.find((candidate) => candidate.id === evidence.jobId);
  assert.ok(job, "Der festgehaltene Evidenzjob fehlt.");
  assert.equal(job.name, evidence.jobName, "Der Evidenzjob hat einen unerwarteten Namen.");
  assert.equal(job.status, "completed", "Der Evidenzjob ist nicht abgeschlossen.");
  assert.equal(job.conclusion, "success", "Der Evidenzjob war nicht erfolgreich.");

  const sourceStep = job.steps?.find((step) => step.name === evidence.stepName);
  assert.ok(sourceStep, "Der Online-Quellenschritt fehlt im Evidenzjob.");
  assert.equal(sourceStep.status, "completed", "Der Online-Quellenschritt ist nicht abgeschlossen.");
  assert.equal(sourceStep.conclusion, "success", "Der Online-Quellenschritt war nicht erfolgreich.");
}

const identity = verifyLocalIdentity();
await verifyRemoteEvidence();

console.log(
  JSON.stringify({
    status: "verified-prior-online-source-evidence",
    currentCommit: identity.currentCommit,
    publicDataTree: identity.currentTree,
    evidenceCommit: evidence.commit,
    evidenceRun: evidence.runId,
    evidenceJob: evidence.jobId
  })
);
