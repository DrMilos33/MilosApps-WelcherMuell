import assert from "node:assert/strict";
import test from "node:test";
import {
  createFeedbackPayload,
  feedbackEndpoint,
  feedbackPlaceholderKey,
  submitFeedback
} from "../../src/feedback.js";

const submissionId = "3e8ae953-d44e-4cd3-9b77-fd40f266b8bc";

test("Ergebnisfeedback erzeugt einen begrenzten strukturierten Datensatz ohne Verlauf", () => {
  const payload = createFeedbackPayload({
    submissionId,
    itemId: "liquid-paint",
    itemName: "Flüssige Farbe oder Lack",
    reason: "wrong",
    comment: "Das Ergebnis passt nicht.",
    query: "nasse Farbe",
    contentVersion: "2026.08.09-1",
    language: "de",
    resultUrl: "https://example.test/?lang=en&item=old#history"
  });

  assert.deepEqual(payload, {
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
    resultUrl: "https://example.test/?item=liquid-paint",
    website: ""
  });
});

test("Ergebnisfeedback begrenzt Freitext und lehnt ungültigen Kontext ab", () => {
  const payload = createFeedbackPayload({
    submissionId,
    itemId: "used-oil",
    itemName: "Used oil",
    reason: "other",
    comment: "x".repeat(800),
    query: "q".repeat(200),
    contentVersion: "2026.08.09-1",
    language: "en",
    resultUrl: "https://example.test/"
  });
  assert.equal(payload.comment, "x".repeat(500));
  assert.equal(payload.query, "q".repeat(120));
  assert.equal(payload.resultUrl, "https://example.test/?item=used-oil&lang=en");

  assert.throws(() => createFeedbackPayload({
    submissionId,
    itemId: "used-oil",
    itemName: "Used oil",
    reason: "tracking",
    contentVersion: "2026.08.09-1",
    resultUrl: "https://example.test/"
  }), /Unknown feedback reason/);
  assert.throws(() => createFeedbackPayload({
    submissionId: "not-a-uuid",
    itemId: "used-oil",
    itemName: "Used oil",
    reason: "wrong",
    contentVersion: "2026.08.09-1",
    resultUrl: "https://example.test/"
  }), /submission ID/);
});

test("Hilfetext folgt dem ausgewählten Meldegrund", () => {
  assert.equal(feedbackPlaceholderKey("wrong"), "feedbackCommentPlaceholderWrong");
  assert.equal(feedbackPlaceholderKey("missing"), "feedbackCommentPlaceholderMissing");
  assert.equal(feedbackPlaceholderKey("unclear"), "feedbackCommentPlaceholderUnclear");
  assert.equal(feedbackPlaceholderKey("other"), "feedbackCommentPlaceholderOther");
  assert.equal(feedbackPlaceholderKey("unknown"), "feedbackCommentPlaceholderWrong");
});

test("Feedback-Endpunkt erlaubt HTTPS sowie Loopback-HTTP, aber keine Credentials", () => {
  const documentFor = (content, baseURI = "https://example.test/app/") => ({
    baseURI,
    querySelector: () => ({ content })
  });
  assert.equal(feedbackEndpoint(documentFor("https://feedback.example.test/v1/feedback")), "https://feedback.example.test/v1/feedback");
  assert.equal(feedbackEndpoint(documentFor("/api/feedback", "http://127.0.0.1:4318/")), "http://127.0.0.1:4318/api/feedback");
  assert.throws(() => feedbackEndpoint(documentFor("http://feedback.example.test/v1/feedback")), /HTTPS/);
  assert.throws(() => feedbackEndpoint(documentFor("https://user:secret@example.test/v1/feedback")), /credentials/);
});

test("Direktversand nutzt genau einen credential-freien JSON-POST", async () => {
  const calls = [];
  const payload = { submissionId };
  const result = await submitFeedback("https://feedback.example.test/v1/feedback", payload, async (...args) => {
    calls.push(args);
    return new Response(JSON.stringify({ status: "accepted", submissionId }), {
      status: 201,
      headers: { "content-type": "application/json" }
    });
  });
  assert.deepEqual(result, { status: "accepted", submissionId });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "https://feedback.example.test/v1/feedback");
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[0][1].credentials, "omit");
  assert.equal(calls[0][1].referrerPolicy, "no-referrer");
  assert.equal(JSON.parse(calls[0][1].body).submissionId, submissionId);

  await assert.rejects(
    submitFeedback("https://feedback.example.test/v1/feedback", payload, async () =>
      new Response(JSON.stringify({ status: "rejected" }), { status: 422 })
    ),
    /could not be stored/
  );
});
