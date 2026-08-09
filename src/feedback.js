const ISSUE_ENDPOINT = "https://github.com/DrMilos33/MilosApps-WelcherMuell/issues/new";
const REASONS = new Set(["wrong", "missing", "unclear", "other"]);

function clean(value, limit) {
  return String(value ?? "").replace(/\r\n?/g, "\n").trim().slice(0, limit);
}

export function buildFeedbackIssueUrl({
  itemId,
  itemName,
  reason,
  comment = "",
  query = "",
  contentVersion,
  language,
  resultUrl
}) {
  if (!REASONS.has(reason)) throw new TypeError("Unknown feedback reason");
  const safeItemId = clean(itemId, 80);
  const safeItemName = clean(itemName, 120);
  const safeVersion = clean(contentVersion, 40);
  if (!safeItemId || !safeItemName || !safeVersion) throw new TypeError("Feedback context is incomplete");

  const canonicalResult = new URL(resultUrl);
  canonicalResult.hash = "";
  canonicalResult.search = "";
  canonicalResult.searchParams.set("item", safeItemId);
  if (language === "en") canonicalResult.searchParams.set("lang", "en");

  const body = [
    "## Waste-guide result feedback",
    "",
    `- Item: ${safeItemName} (\`${safeItemId}\`)`,
    `- Reason: \`${reason}\``,
    `- Search: ${clean(query, 120) || "not provided"}`,
    `- Content version: \`${safeVersion}\``,
    `- Language: \`${language === "en" ? "en" : "de"}\``,
    `- Result: ${canonicalResult}`,
    "",
    "### Optional comment",
    clean(comment, 500) || "No comment provided."
  ].join("\n");

  const issueUrl = new URL(ISSUE_ENDPOINT);
  issueUrl.searchParams.set("title", `[Result feedback] ${safeItemName}`);
  issueUrl.searchParams.set("body", body);
  return issueUrl.toString();
}
