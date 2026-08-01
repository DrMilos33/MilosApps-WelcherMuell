const STOP_WORDS = new Set([
  "wo",
  "wohin",
  "kommt",
  "kommen",
  "gehort",
  "gehoert",
  "entsorge",
  "entsorgen",
  "entsorgung",
  "mull",
  "muell",
  "der",
  "die",
  "das",
  "den",
  "dem",
  "ein",
  "eine",
  "einen",
  "meine",
  "mein",
  "alte",
  "alter",
  "altes",
  "weg"
]);

export function normalizeText(value) {
  return String(value ?? "")
    .replaceAll("Ä", "Ae")
    .replaceAll("Ö", "Oe")
    .replaceAll("Ü", "Ue")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de-DE")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function damerauLevenshtein(left, right) {
  const a = normalizeText(left);
  const b = normalizeText(right);
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let row = 0; row <= a.length; row += 1) matrix[row][0] = row;
  for (let column = 0; column <= b.length; column += 1) matrix[0][column] = column;

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      );

      if (
        row > 1 &&
        column > 1 &&
        a[row - 1] === b[column - 2] &&
        a[row - 2] === b[column - 1]
      ) {
        matrix[row][column] = Math.min(matrix[row][column], matrix[row - 2][column - 2] + cost);
      }
    }
  }

  return matrix[a.length][b.length];
}

function significantTokens(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function itemTerms(item) {
  return [
    { value: item.name, kind: "name" },
    ...(item.aliases ?? []).map((value) => ({ value, kind: "alias" })),
    ...(item.keywords ?? []).map((value) => ({ value, kind: "keyword" }))
  ]
    .map((term) => ({ ...term, value: normalizeText(term.value) }))
    .filter((term) => Boolean(term.value));
}

function fuzzyTokenMatch(queryToken, termToken) {
  if (queryToken === termToken) return 1;
  const longest = Math.max(queryToken.length, termToken.length);
  const shortest = Math.min(queryToken.length, termToken.length);
  if (
    queryToken.length >= 3 &&
    shortest / longest >= 0.7 &&
    (termToken.startsWith(queryToken) || queryToken.startsWith(termToken))
  ) {
    return 0.88;
  }

  if (longest < 4) return 0;
  const distance = damerauLevenshtein(queryToken, termToken);
  const allowed = longest >= 9 ? 2 : 1;
  return distance <= allowed ? 0.72 - (distance - 1) * 0.12 : 0;
}

function scoreItem(item, normalizedQuery) {
  const terms = itemTerms(item);
  let best = 0;
  let reason = "";

  for (const term of terms) {
    if (term.value === normalizedQuery) {
      const score = term.kind === "name" ? 140 : term.kind === "alias" ? 132 : 106;
      if (score > best) {
        best = score;
        reason = term.kind === "keyword" ? "keyword" : "exact";
      }
      continue;
    }

    const prefixScore = term.kind === "keyword" ? 88 : 112;
    if (normalizedQuery.length >= 2 && term.value.startsWith(normalizedQuery) && prefixScore > best) {
      best = prefixScore;
      reason = "prefix";
    }

    const containsScore = term.kind === "keyword" ? 80 : 96;
    if (normalizedQuery.length >= 3 && term.value.includes(normalizedQuery) && containsScore > best) {
      best = containsScore;
      reason = "contains";
    }

    const questionScore = term.kind === "keyword" ? 72 : 88;
    if (term.value.length >= 3 && normalizedQuery.includes(term.value) && questionScore > best) {
      best = questionScore;
      reason = "question";
    }

    const longest = Math.max(term.value.length, normalizedQuery.length);
    if (
      term.kind !== "keyword" &&
      !term.value.includes(" ") &&
      !normalizedQuery.includes(" ") &&
      longest >= 4
    ) {
      const distance = damerauLevenshtein(normalizedQuery, term.value);
      const allowed = longest >= 10 ? 3 : longest >= 6 ? 2 : 1;
      if (distance <= allowed) {
        const score = 105 - distance * 9;
        if (score > best) {
          best = score;
          reason = "typo";
        }
      }
    }
  }

  const queryTokens = significantTokens(normalizedQuery);
  if (queryTokens.length > 0) {
    const termTokens = [...new Set(terms.flatMap((term) => term.value.split(" ")))];
    const tokenQuality = queryTokens.map((queryToken) => {
      return Math.max(0, ...termTokens.map((termToken) => fuzzyTokenMatch(queryToken, termToken)));
    });
    const matched = tokenQuality.filter((quality) => quality > 0).length;
    const average = tokenQuality.reduce((sum, quality) => sum + quality, 0) / queryTokens.length;

    if (matched === queryTokens.length) {
      const score = 72 + average * 27;
      if (score > best) {
        best = score;
        reason = "tokens";
      }
    } else if (matched >= Math.ceil(queryTokens.length / 2)) {
      const score = 45 + average * 25;
      if (score > best) {
        best = score;
        reason = "partial";
      }
    }
  }

  return { score: Math.round(best * 10) / 10, reason };
}

export function validateItemIntegrity(item, sourcesById, asOf = new Date()) {
  const issues = [];
  const issueDetails = [];
  const asOfDate = new Date(`${asOf.toISOString().slice(0, 10)}T00:00:00Z`);

  if (!Array.isArray(item.sources) || item.sources.length === 0) {
    issues.push("Für diesen Eintrag fehlt eine Quelle.");
    issueDetails.push({ code: "issueItemSourceMissing" });
  }

  for (const sourceId of item.sources ?? []) {
    const source = sourcesById.get(sourceId);
    if (!source) {
      issues.push(`Quelle ${sourceId} fehlt im Quellenkatalog.`);
      issueDetails.push({ code: "issueSourceMissing", sourceId });
      continue;
    }
    if (!source.scope) {
      issues.push(`Quelle ${sourceId} hat kein Geltungsgebiet.`);
      issueDetails.push({ code: "issueSourceScopeMissing", sourceId });
    }
    if (!source.verifiedAt) {
      issues.push(`Quelle ${sourceId} hat kein Prüfdatum.`);
      issueDetails.push({ code: "issueSourceVerifiedMissing", sourceId });
    }
    if (source.reviewDue && new Date(`${source.reviewDue}T00:00:00Z`) < asOfDate) {
      issues.push(`Quelle ${sourceId} ist zur erneuten Prüfung fällig.`);
      issueDetails.push({ code: "issueSourceReviewDue", sourceId });
    }
  }

  if (!item.reviewedAt || !item.reviewDue) {
    issues.push("Dem Eintrag fehlt ein redaktionelles Prüfdatum.");
    issueDetails.push({ code: "issueItemReviewMissing" });
  } else if (new Date(`${item.reviewDue}T00:00:00Z`) < asOfDate) {
    issues.push("Der Eintrag ist zur erneuten redaktionellen Prüfung fällig.");
    issueDetails.push({ code: "issueItemReviewDue" });
  }

  return {
    valid: issues.length === 0,
    issues,
    issueDetails
  };
}

export function searchItems(items, query, options = {}) {
  const normalizedQuery = normalizeText(query).slice(0, 120);
  if (normalizedQuery.length < 2) return [];

  const sourcesById = options.sourcesById ?? new Map();
  const asOf = options.asOf ?? new Date();

  return items
    .map((item) => {
      const match = scoreItem(item, normalizedQuery);
      return {
        item,
        ...match,
        integrity: sourcesById.size > 0
          ? validateItemIntegrity(item, sourcesById, asOf)
          : { valid: true, issues: [], issueDetails: [] }
      };
    })
    .filter((result) => result.score >= 55)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.item.name.localeCompare(right.item.name, "de");
    })
    .slice(0, options.limit ?? 8);
}

export function isAmbiguous(results) {
  if (results.length < 2) return false;
  const [first, second] = results;
  if (first.score >= 125 && first.score - second.score >= 18) return false;
  return first.score - second.score < 20;
}
