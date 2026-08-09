const REASONS = new Set(["wrong", "missing", "unclear", "other"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ITEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const MAX_BODY_BYTES = 4096;
const RETENTION_DAYS = 365;

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers
    }
  });
}

function configuredOrigins(env) {
  return new Set(String(env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean));
}

function configuredResultPaths(env) {
  return new Set(String(env.ALLOWED_RESULT_PATHS ?? "")
    .split(",")
    .map((path) => path.trim())
    .filter((path) => path.startsWith("/") && path.endsWith("/")));
}

function environmentName(env) {
  return env.APP_ENVIRONMENT === "PRODUCTION" ? "PRODUCTION" : "DEV";
}

function productionApproved(env) {
  return env.PRODUCTION_APPROVED === "true";
}

function corsHeaders(origin, env) {
  if (!configuredOrigins(env).has(origin)) return null;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-waste-guide-feedback",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}

function cleanString(value, maximum, { required = false } = {}) {
  if (typeof value !== "string") return required ? null : "";
  const clean = value.replace(/\r\n?/g, "\n").trim();
  if ((required && clean.length === 0) || clean.length > maximum) return null;
  return clean;
}

function validResultUrl(value, itemId, language, env) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const allowed = configuredOrigins(env);
  if (
    !allowed.has(url.origin) ||
    !configuredResultPaths(env).has(url.pathname) ||
    url.username ||
    url.password ||
    url.hash
  ) return false;
  const expected = new URL(url.pathname, url.origin);
  expected.searchParams.set("item", itemId);
  if (language === "en") expected.searchParams.set("lang", "en");
  return url.toString() === expected.toString();
}

export function validateFeedbackPayload(value, env) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.schemaVersion !== 1 || value.appKey !== "waste-guide") return null;

  const submissionId = cleanString(value.submissionId, 36, { required: true });
  const itemId = cleanString(value.itemId, 80, { required: true });
  const itemName = cleanString(value.itemName, 120, { required: true });
  const reason = cleanString(value.reason, 20, { required: true });
  const comment = cleanString(value.comment, 500);
  const query = cleanString(value.query, 120);
  const contentVersion = cleanString(value.contentVersion, 40, { required: true });
  const language = value.language === "en" ? "en" : value.language === "de" ? "de" : null;
  const resultUrl = cleanString(value.resultUrl, 500, { required: true });
  const website = cleanString(value.website, 120);

  if (
    !UUID_PATTERN.test(submissionId ?? "") ||
    !ITEM_ID_PATTERN.test(itemId ?? "") ||
    !itemName ||
    !REASONS.has(reason) ||
    comment === null ||
    query === null ||
    !contentVersion ||
    !language ||
    !resultUrl ||
    website === null ||
    !validResultUrl(resultUrl, itemId, language, env)
  ) return null;

  return {
    submissionId,
    itemId,
    itemName,
    reason,
    comment,
    query,
    contentVersion,
    language,
    resultUrl,
    website
  };
}

async function acceptFeedback(request, env, cors) {
  if (request.headers.get("x-waste-guide-feedback") !== "1") {
    return json({ status: "rejected", code: "missing-client-marker" }, 400, cors);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ status: "rejected", code: "payload-too-large" }, 413, cors);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ status: "rejected", code: "unsupported-media-type" }, 415, cors);
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return json({ status: "rejected", code: "payload-too-large" }, 413, cors);
  }
  let decoded;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return json({ status: "rejected", code: "invalid-json" }, 400, cors);
  }
  const payload = validateFeedbackPayload(decoded, env);
  if (!payload) return json({ status: "rejected", code: "invalid-feedback" }, 422, cors);

  // A filled hidden field is acknowledged without storing it, so simple form bots
  // cannot use response differences to tune their submission.
  if (payload.website) {
    return json({ status: "accepted", submissionId: payload.submissionId }, 202, cors);
  }

  if (env.REPORT_LIMIT?.limit) {
    const rate = await env.REPORT_LIMIT.limit({ key: "waste-guide-feedback" });
    if (!rate.success) return json({ status: "rejected", code: "rate-limited" }, 429, cors);
  }

  const now = new Date().toISOString();
  await env.FEEDBACK_DB.prepare(`
    INSERT OR IGNORE INTO feedback_reports (
      id, created_at, environment, content_version, item_id, item_name,
      reason, comment, search_query, language, result_url, review_state
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'new')
  `).bind(
    payload.submissionId,
    now,
    environmentName(env),
    payload.contentVersion,
    payload.itemId,
    payload.itemName,
    payload.reason,
    payload.comment,
    payload.query,
    payload.language,
    payload.resultUrl
  ).run();

  return json({ status: "accepted", submissionId: payload.submissionId }, 201, cors);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") ?? "";
    const cors = corsHeaders(origin, env);

    if (url.pathname === "/healthz" && request.method === "GET") {
      const environment = environmentName(env);
      const approved = productionApproved(env);
      return json({
        status: environment === "PRODUCTION" && !approved ? "blocked" : "ok",
        appKey: "waste-guide",
        service: "feedback",
        environment,
        productionApproved: approved
      }, environment === "PRODUCTION" && !approved ? 503 : 200);
    }

    if (url.pathname !== "/v1/feedback") return json({ status: "not-found" }, 404);
    if (!cors) return json({ status: "rejected", code: "origin-not-allowed" }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ status: "rejected", code: "method-not-allowed" }, 405, cors);
    if (environmentName(env) === "PRODUCTION" && !productionApproved(env)) {
      return json({ status: "rejected", code: "production-not-approved" }, 503, cors);
    }
    return acceptFeedback(request, env, cors);
  },

  async scheduled(_controller, env) {
    await env.FEEDBACK_DB.prepare(
      `DELETE FROM feedback_reports WHERE created_at < datetime('now', '-${RETENTION_DAYS} days')`
    ).run();
  }
};
