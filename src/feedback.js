const REASONS = new Set(["wrong", "missing", "unclear", "other"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PLACEHOLDER_KEYS = Object.freeze({
  wrong: "feedbackCommentPlaceholderWrong",
  missing: "feedbackCommentPlaceholderMissing",
  unclear: "feedbackCommentPlaceholderUnclear",
  other: "feedbackCommentPlaceholderOther"
});

function clean(value, limit) {
  return String(value ?? "").replace(/\r\n?/g, "\n").trim().slice(0, limit);
}

function canonicalResultUrl(resultUrl, itemId, language) {
  const url = new URL(resultUrl);
  url.hash = "";
  url.search = "";
  url.searchParams.set("item", itemId);
  if (language === "en") url.searchParams.set("lang", "en");
  return url.toString();
}

export function feedbackPlaceholderKey(reason) {
  return PLACEHOLDER_KEYS[reason] ?? PLACEHOLDER_KEYS.wrong;
}

export function feedbackEndpoint(documentObject = document) {
  const configured = documentObject.querySelector('meta[name="waste-guide-feedback-endpoint"]')?.content;
  if (!configured) throw new Error("Feedback endpoint is not configured");
  const endpoint = new URL(configured, documentObject.baseURI);
  const isLocalHttp = endpoint.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname);
  if (endpoint.protocol !== "https:" && !isLocalHttp) throw new Error("Feedback endpoint must use HTTPS");
  if (endpoint.username || endpoint.password) throw new Error("Feedback endpoint must not contain credentials");
  return endpoint.toString();
}

export function createFeedbackPayload({
  submissionId = globalThis.crypto?.randomUUID?.(),
  itemId,
  itemName,
  reason,
  comment = "",
  query = "",
  contentVersion,
  language,
  resultUrl,
  website = ""
}) {
  if (!REASONS.has(reason)) throw new TypeError("Unknown feedback reason");
  if (!UUID_PATTERN.test(submissionId ?? "")) throw new TypeError("Feedback submission ID is invalid");

  const safeItemId = clean(itemId, 80);
  const safeItemName = clean(itemName, 120);
  const safeVersion = clean(contentVersion, 40);
  if (!safeItemId || !safeItemName || !safeVersion) throw new TypeError("Feedback context is incomplete");

  const normalizedLanguage = language === "en" ? "en" : "de";
  return {
    schemaVersion: 1,
    submissionId,
    appKey: "waste-guide",
    itemId: safeItemId,
    itemName: safeItemName,
    reason,
    comment: clean(comment, 500),
    query: clean(query, 120),
    contentVersion: safeVersion,
    language: normalizedLanguage,
    resultUrl: canonicalResultUrl(resultUrl, safeItemId, normalizedLanguage),
    website: clean(website, 120)
  };
}

export async function submitFeedback(endpoint, payload, fetchImplementation = globalThis.fetch) {
  if (typeof fetchImplementation !== "function") throw new TypeError("Fetch is unavailable");
  const response = await fetchImplementation(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-waste-guide-feedback": "1"
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer"
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || body?.status !== "accepted" || body?.submissionId !== payload.submissionId) {
    const error = new Error("Feedback could not be stored");
    error.status = response.status;
    throw error;
  }
  return body;
}
