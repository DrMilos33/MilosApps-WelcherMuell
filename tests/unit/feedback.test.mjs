import assert from "node:assert/strict";
import test from "node:test";
import { buildFeedbackIssueUrl } from "../../src/feedback.js";

test("Ergebnisfeedback erzeugt eine analysierbare GitHub-Meldung ohne Verlauf", () => {
  const url = new URL(buildFeedbackIssueUrl({
    itemId: "liquid-paint",
    itemName: "Flüssige Farbe oder Lack",
    reason: "wrong",
    comment: "Das Ergebnis passt nicht.",
    query: "nasse Farbe",
    contentVersion: "2026.08.09-1",
    language: "de",
    resultUrl: "https://example.test/?lang=en&item=old#history"
  }));

  assert.equal(url.origin, "https://github.com");
  assert.equal(url.pathname, "/DrMilos33/MilosApps-WelcherMuell/issues/new");
  assert.match(url.searchParams.get("title"), /Flüssige Farbe/);
  const body = url.searchParams.get("body");
  assert.match(body, /Reason: `wrong`/);
  assert.match(body, /Search: nasse Farbe/);
  assert.match(body, /https:\/\/example\.test\/\?item=liquid-paint/);
  assert.doesNotMatch(body, /old|history/);
});

test("Ergebnisfeedback begrenzt Freitext und lehnt unbekannte Gründe ab", () => {
  const url = new URL(buildFeedbackIssueUrl({
    itemId: "used-oil",
    itemName: "Used oil",
    reason: "other",
    comment: "x".repeat(800),
    contentVersion: "2026.08.09-1",
    language: "en",
    resultUrl: "https://example.test/"
  }));
  const comment = url.searchParams.get("body").split("### Optional comment\n")[1];
  assert.equal(comment.length, 500);
  assert.equal(comment, "x".repeat(500));
  assert.throws(() => buildFeedbackIssueUrl({
    itemId: "used-oil",
    itemName: "Used oil",
    reason: "tracking",
    contentVersion: "2026.08.09-1",
    resultUrl: "https://example.test/"
  }), /Unknown feedback reason/);
});
