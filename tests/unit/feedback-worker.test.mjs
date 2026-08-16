import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker, { validateFeedbackPayload } from "../../feedback-worker/src/worker.js";

const origin = "https://drmilos33.github.io";
const submissionId = "3e8ae953-d44e-4cd3-9b77-fd40f266b8bc";

function validPayload(overrides = {}) {
  return {
    schemaVersion: 1,
    submissionId,
    appKey: "waste-guide",
    itemId: "liquid-paint",
    itemName: "Flüssige Farbe oder Lack",
    reason: "wrong",
    comment: "Das Ergebnis passt nicht.",
    query: "nasse Farbe",
    contentVersion: "2026.08.09-1",
    language: "de",
    resultUrl: `${origin}/MilosApps-WelcherMuell/?item=liquid-paint`,
    website: "",
    ...overrides
  };
}

function createEnv() {
  const inserts = [];
  const statements = [];
  let rateCalls = 0;
  const env = {
    APP_ENVIRONMENT: "DEV",
    PRODUCTION_APPROVED: "false",
    ALLOWED_RESULT_BASES: `${origin}/MilosApps-WelcherMuell/`,
    FEEDBACK_DB: {
      prepare(sql) {
        statements.push(sql);
        return {
          bind(...values) {
            return {
              async run() {
                inserts.push(values);
                return { success: true };
              }
            };
          },
          async run() {
            return { success: true };
          }
        };
      }
    },
    REPORT_LIMIT: {
      async limit() {
        rateCalls += 1;
        return { success: true };
      }
    }
  };
  return { env, inserts, statements, rateCalls: () => rateCalls };
}

function request(payload, { requestOrigin = origin, method = "POST", marker = "1" } = {}) {
  return new Request("https://feedback.example.test/v1/feedback", {
    method,
    headers: {
      origin: requestOrigin,
      "content-type": "application/json; charset=utf-8",
      "x-waste-guide-feedback": marker
    },
    body: method === "POST" ? JSON.stringify(payload) : undefined
  });
}

test("Worker validiert kanonischen Kontext und speichert nur strukturierte Felder", async () => {
  const fixture = createEnv();
  const response = await worker.fetch(request(validPayload()), fixture.env);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { status: "accepted", submissionId });
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.equal(fixture.rateCalls(), 1);
  assert.equal(fixture.inserts.length, 1);
  assert.equal(fixture.inserts[0][0], submissionId);
  assert.equal(fixture.inserts[0][2], "DEV");
  assert.equal(fixture.inserts[0][6], "wrong");
  assert.equal(fixture.inserts[0][8], "nasse Farbe");
  assert.equal(fixture.inserts[0].length, 11, "IP-Adresse und User-Agent dürfen nicht gebunden werden.");
});

test("Worker blockiert fremde Origins, ungültige URLs und unbekannte Gründe", async () => {
  const fixture = createEnv();
  const foreign = await worker.fetch(request(validPayload(), { requestOrigin: "https://evil.example" }), fixture.env);
  assert.equal(foreign.status, 403);

  assert.equal(validateFeedbackPayload(validPayload({ reason: "tracking" }), fixture.env), null);
  assert.equal(validateFeedbackPayload(validPayload({ resultUrl: `${origin}/MilosApps-WelcherMuell/?item=used-oil` }), fixture.env), null);
  assert.equal(validateFeedbackPayload(validPayload({ resultUrl: "https://user:secret@drmilos33.github.io/MilosApps-WelcherMuell/?item=liquid-paint" }), fixture.env), null);
});

test("Honeypot wird still angenommen, aber weder gelockt noch gespeichert", async () => {
  const fixture = createEnv();
  const response = await worker.fetch(request(validPayload({ website: "spam.example" })), fixture.env);
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { status: "accepted", submissionId });
  assert.equal(fixture.rateCalls(), 0);
  assert.equal(fixture.inserts.length, 0);
});

test("Worker liefert CORS-Preflight, Health und fail-closed Methoden", async () => {
  const fixture = createEnv();
  const preflight = await worker.fetch(new Request("https://feedback.example.test/v1/feedback", {
    method: "OPTIONS",
    headers: { origin }
  }), fixture.env);
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get("access-control-allow-methods"), /POST/);

  const health = await worker.fetch(new Request("https://feedback.example.test/healthz"), fixture.env);
  assert.deepEqual(await health.json(), {
    status: "ok",
    appKey: "waste-guide",
    service: "feedback",
    environment: "DEV",
    productionApproved: false
  });

  const get = await worker.fetch(new Request("https://feedback.example.test/v1/feedback", {
    headers: { origin }
  }), fixture.env);
  assert.equal(get.status, 405);

  const productionEnv = { ...fixture.env, APP_ENVIRONMENT: "PRODUCTION", PRODUCTION_APPROVED: "false" };
  const blockedHealth = await worker.fetch(new Request("https://feedback.example.test/healthz"), productionEnv);
  assert.equal(blockedHealth.status, 503);
  assert.deepEqual(await blockedHealth.json(), {
    status: "blocked",
    appKey: "waste-guide",
    service: "feedback",
    environment: "PRODUCTION",
    productionApproved: false
  });
  const blockedPost = await worker.fetch(request(validPayload()), productionEnv);
  assert.equal(blockedPost.status, 503);
  assert.equal((await blockedPost.json()).code, "production-not-approved");
});

test("Production akzeptiert ausschließlich die zwei gepaarten Übergangsbasen", async () => {
  const legacyOrigin = "https://welcher-muell.milos-apps.de";
  const legacyBase = `${legacyOrigin}/`;
  const productionOrigin = "https://milos-apps.de";
  const productionPath = "/welcher-muell";
  const fixture = createEnv();
  fixture.env.APP_ENVIRONMENT = "PRODUCTION";
  fixture.env.PRODUCTION_APPROVED = "true";
  fixture.env.ALLOWED_RESULT_BASES = `${legacyBase},${productionOrigin}${productionPath}`;
  const payload = validPayload({
    resultUrl: `${productionOrigin}${productionPath}?item=liquid-paint`
  });
  const response = await worker.fetch(
    request(payload, { requestOrigin: productionOrigin }),
    fixture.env
  );
  assert.equal(response.status, 201);
  assert.equal(fixture.inserts.length, 1);
  assert.equal(fixture.inserts[0][2], "PRODUCTION");

  const legacyPayload = validPayload({
    submissionId: "8e853730-f895-4b61-87a0-005530291b6a",
    resultUrl: `${legacyBase}?item=liquid-paint`
  });
  const legacyResponse = await worker.fetch(
    request(legacyPayload, { requestOrigin: legacyOrigin }),
    fixture.env
  );
  assert.equal(legacyResponse.status, 201);
  assert.equal(fixture.inserts.length, 2);

  const devOrigin = await worker.fetch(request(payload), fixture.env);
  assert.equal(devOrigin.status, 403);

  assert.equal(validateFeedbackPayload(validPayload({
    resultUrl: `${productionOrigin}/?item=liquid-paint`
  }), fixture.env), null, "Die gemeinsame Origin darf keinen fremden Ergebnispfad freigeben.");
  assert.equal(validateFeedbackPayload(validPayload({
    resultUrl: `${legacyOrigin}${productionPath}?item=liquid-paint`
  }), fixture.env), null, "Die Legacy-Origin darf nicht mit dem neuen Ergebnispfad gekreuzt werden.");

  const crossedBrowserOrigin = await worker.fetch(
    request(payload, { requestOrigin: legacyOrigin }),
    fixture.env
  );
  assert.equal(crossedBrowserOrigin.status, 422, "Browser-Origin und Ergebnis-Origin müssen dasselbe Paar bilden.");

  const foreignSameHostPath = await worker.fetch(
    request(validPayload({
      resultUrl: `${productionOrigin}/apps/waste-guide?item=liquid-paint`
    }), { requestOrigin: productionOrigin }),
    fixture.env
  );
  assert.equal(foreignSameHostPath.status, 422);
});

test("Production-Konfiguration trennt Worker, Origin und D1 fail-closed von DEV", async () => {
  const config = JSON.parse(await readFile(
    new URL("../../feedback-worker/wrangler.production.jsonc.example", import.meta.url),
    "utf8"
  ));
  assert.equal(config.name, "milosapps-waste-guide-feedback-production");
  assert.equal(config.vars.APP_ENVIRONMENT, "PRODUCTION");
  assert.equal(config.vars.PRODUCTION_APPROVED, "true");
  assert.equal(
    config.vars.ALLOWED_RESULT_BASES,
    "https://welcher-muell.milos-apps.de/,https://milos-apps.de/welcher-muell"
  );
  assert.equal(config.vars.ALLOWED_ORIGINS, undefined);
  assert.equal(config.vars.ALLOWED_RESULT_PATHS, undefined);
  assert.equal(config.d1_databases[0].database_name, "milosapps-waste-guide-feedback-production");
  assert.notEqual(config.d1_databases[0].database_name, "milosapps-waste-guide-feedback-dev");
  assert.equal(config.d1_databases[0].database_id, "REPLACE_WITH_PRODUCTION_D1_DATABASE_ID");
});

test("Schema bietet Warteschlange, Zusammenfassung und begrenzte Aufbewahrung", async () => {
  const schema = await readFile(new URL("../../feedback-worker/migrations/0001_feedback.sql", import.meta.url), "utf8");
  assert.match(schema, /CREATE TABLE feedback_reports/);
  assert.match(schema, /review_state/);
  assert.match(schema, /CREATE VIEW feedback_summary/);

  const fixture = createEnv();
  await worker.scheduled({}, fixture.env);
  assert.match(fixture.statements.at(-1), /DELETE FROM feedback_reports/);
  assert.match(fixture.statements.at(-1), /-365 days/);
});
