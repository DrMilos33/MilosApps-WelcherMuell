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

export function detectGuidedFlow(value) {
  const query = normalizeText(value);
  if (/^(?:oel|oele|oelreste?|oil|oils)$/.test(query)) return { id: "oil", step: "kind" };
  if (/^(?:farbe|farben|farbreste?|lack|lacke|lackreste?|wandfarbe|wandfarben|paint|paints|varnish|varnishes)$/.test(query)) {
    return { id: "paint", step: "state" };
  }
  if (/^(?:was fuer(?: ein)? |welches |welcher )?(?:werkzeuge?|handwerkzeuge?|tools?)$/.test(query)) {
    return { id: "tool", step: "power" };
  }
  return null;
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
    .map((term) => ({ ...term, label: String(term.value), value: normalizeText(term.value) }))
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

function isUsefulPrefix(shorter, longer) {
  if (shorter.length < 3 || !longer.startsWith(shorter)) return false;
  const remainder = longer.slice(shorter.length);
  const ratio = shorter.length / longer.length;
  return ratio >= 0.58 || /^(e|en|er|es|n|s)$/.test(remainder);
}

function includesWholePhrase(value, phrase) {
  return ` ${value} `.includes(` ${phrase} `);
}

function isAdjacentTransposition(left, right) {
  if (left.length !== right.length) return false;
  const mismatches = [];
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) mismatches.push(index);
  }
  return (
    mismatches.length === 2 &&
    mismatches[1] === mismatches[0] + 1 &&
    left[mismatches[0]] === right[mismatches[1]] &&
    left[mismatches[1]] === right[mismatches[0]]
  );
}

function hasStableFuzzyAnchor(query, term, distance) {
  if (distance === 0) return true;
  const anchorLength = 3;
  const hasSharedPrefix = (
    query.length >= anchorLength &&
    term.length >= anchorLength &&
    query.slice(0, anchorLength) === term.slice(0, anchorLength)
  );
  return hasSharedPrefix || (distance === 1 && isAdjacentTransposition(query, term));
}

function scoreSearchIntent(item, normalizedQuery) {
  const compactQuery = normalizedQuery.replaceAll(" ", "");
  let best = 0;
  for (const rule of item.searchIntents ?? []) {
    const groups = rule.all ?? [];
    const matchesGroups = groups.length > 0 && groups.every((roots) =>
      roots.some((root) => compactQuery.includes(normalizeText(root).replaceAll(" ", "")))
    );
    const excluded = (rule.exclude ?? []).some((root) =>
      compactQuery.includes(normalizeText(root).replaceAll(" ", ""))
    );
    if (matchesGroups && !excluded) best = Math.max(best, Number(rule.score) || 0);
  }
  return best;
}

function isExcludedQuery(item, normalizedQuery) {
  const isExactCatalogTerm = itemTerms(item).some((term) =>
    term.kind !== "keyword" && term.value === normalizedQuery
  );
  const exclusions = [
    ...(item.queryExclusions ?? []),
    ...(item.knowledgeType === "material-guide" && !isExactCatalogTerm
      ? (item.searchIntents ?? []).flatMap((rule) => rule.exclude ?? [])
      : [])
  ];
  const compactQuery = normalizedQuery.replaceAll(" ", "");
  return exclusions.some((root) => {
    const compactRoot = normalizeText(root).replaceAll(" ", "");
    return compactRoot.length >= 3 && compactQuery.includes(compactRoot);
  });
}

function scoreItem(item, normalizedQuery) {
  const terms = itemTerms(item);
  const compactQuery = normalizedQuery.replaceAll(" ", "");
  let best = 0;
  let reason = "";
  let matchedTerm = "";

  const useMatch = (score, nextReason, term = null) => {
    if (score <= best) return;
    best = score;
    reason = nextReason;
    matchedTerm = term?.label ?? item.name;
  };

  for (const term of terms) {
    const compactTerm = term.value.replaceAll(" ", "");
    if (term.value === normalizedQuery) {
      const score = term.kind === "name" ? 140 : term.kind === "alias" ? 132 : 106;
      useMatch(score, term.kind === "keyword" ? "keyword" : "exact", term);
      continue;
    }

    if (compactQuery.length >= 4 && compactTerm === compactQuery) {
      const score = term.kind === "name" ? 136 : term.kind === "alias" ? 128 : 102;
      useMatch(score, "spacing", term);
    }

    const prefixScore = term.kind === "keyword" ? 84 : 112;
    if (isUsefulPrefix(normalizedQuery, term.value) && prefixScore > best) {
      useMatch(prefixScore, "prefix", term);
    }

    const containsScore = term.kind === "keyword" ? 76 : 96;
    const containsRatio = normalizedQuery.length / term.value.length;
    if (
      normalizedQuery.length >= 3 &&
      term.value.includes(normalizedQuery) &&
      containsRatio >= 0.58 &&
      containsScore > best
    ) {
      useMatch(containsScore, "contains", term);
    }

    const questionScore = term.kind === "keyword" ? 72 : 88;
    if (term.value.length >= 3 && includesWholePhrase(normalizedQuery, term.value) && questionScore > best) {
      useMatch(questionScore, "question", term);
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
      if (distance <= allowed && hasStableFuzzyAnchor(normalizedQuery, term.value, distance)) {
        const score = 105 - distance * 9;
        useMatch(score, "typo", term);
      }
    }
  }

  const intentScore = scoreSearchIntent(item, normalizedQuery);
  if (intentScore > best && reason !== "typo") {
    useMatch(intentScore, "intent");
  }

  const queryTokens = significantTokens(normalizedQuery);
  if (queryTokens.length > 1) {
    const termTokens = terms.flatMap((term) =>
      term.value.split(" ").map((value) => ({ value, kind: term.kind }))
    );
    const tokenQuality = queryTokens.map((queryToken) => {
      return Math.max(0, ...termTokens.map((termToken) => {
        if (termToken.kind === "keyword") return queryToken === termToken.value ? 0.82 : 0;
        return fuzzyTokenMatch(queryToken, termToken.value);
      }));
    });
    const matched = tokenQuality.filter((quality) => quality > 0).length;
    const average = tokenQuality.reduce((sum, quality) => sum + quality, 0) / queryTokens.length;

    if (matched === queryTokens.length) {
      const score = 72 + average * 27;
      useMatch(score, "tokens");
    } else if (matched >= Math.ceil(queryTokens.length / 2)) {
      const score = 45 + average * 25;
      useMatch(score, "partial");
    }
  }

  return { score: Math.round(best * 10) / 10, reason, matchedTerm };
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

  const ranked = items
    .filter((item) => !isExcludedQuery(item, normalizedQuery))
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
    .filter((result) => result.score >= 68)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.item.name.localeCompare(right.item.name, "de");
    });
  const direct = ranked.filter(isDirectSearchMatch);
  return (direct.length > 0 ? direct : ranked).slice(0, options.limit ?? 8);
}

const DIRECT_MATCH_REASONS = new Set(["exact", "spacing", "keyword", "question", "intent"]);

export function isDirectSearchMatch(result) {
  return DIRECT_MATCH_REASONS.has(result?.reason);
}

function sharedPrefixLength(left, right) {
  const length = Math.min(left.length, right.length);
  let index = 0;
  while (index < length && left[index] === right[index]) index += 1;
  return index;
}

function insertedCharacter(longer, shorter) {
  if (longer.length !== shorter.length + 1) return null;
  let index = 0;
  while (index < shorter.length && longer[index] === shorter[index]) index += 1;
  return {
    value: longer[index],
    previous: longer[index - 1] ?? "",
    next: longer[index + 1] ?? ""
  };
}

function isPlausibleCorrectionPair(query, term, distance) {
  const prefix = sharedPrefixLength(query, term);
  if (distance === 1 && query.length === term.length) {
    return prefix >= 2 || isAdjacentTransposition(query, term);
  }
  if (distance === 1 && query.length === term.length + 1) {
    const inserted = insertedCharacter(query, term);
    return prefix >= 1 && Boolean(inserted) && (
      prefix >= 3 ||
      /[aeiou]/.test(inserted.value) ||
      inserted.value === inserted.previous ||
      inserted.value === inserted.next
    );
  }
  if (distance === 1 && term.length === query.length + 1) return prefix >= 2;
  if (distance === 2 && term.length === query.length + 1) return prefix >= 3;
  return distance > 1 && query.length === term.length && prefix >= 3;
}

export function suggestCorrections(items, query, options = {}) {
  const normalizedQuery = normalizeText(query).slice(0, 120);
  if (normalizedQuery.length < 3) return [];

  const termsByItem = items.map((item) => ({
    item,
    terms: itemTerms(item).filter((term) => term.kind !== "keyword")
  }));
  const hasExactTerm = termsByItem.some(({ terms }) => terms.some((term) => (
    term.value === normalizedQuery ||
    (normalizedQuery.length >= 4 && term.value.replaceAll(" ", "") === normalizedQuery.replaceAll(" ", ""))
  )));
  if (hasExactTerm) return [];

  const candidates = [];
  const addCandidate = (item, term, distance, score, reason) => {
    if (isExcludedQuery(item, normalizedQuery)) return;
    if (!term?.label || normalizeText(term.label) === normalizedQuery) return;
    candidates.push({ item, term: term.label, distance, score, reason });
  };

  const uncertainMatches = searchItems(items, normalizedQuery, { limit: 20 })
    .filter((result) => !isDirectSearchMatch(result) && result.matchedTerm);
  for (const result of uncertainMatches) {
    const term = itemTerms(result.item).find((candidate) => candidate.label === result.matchedTerm);
    if (!term || term.kind === "keyword") continue;
    const compactQuery = normalizedQuery.replaceAll(" ", "");
    const compactTerm = term.value.replaceAll(" ", "");
    const distance = damerauLevenshtein(compactQuery, compactTerm);
    if (result.reason !== "prefix" && !isPlausibleCorrectionPair(compactQuery, compactTerm, distance)) continue;
    addCandidate(result.item, term, distance, result.score, result.reason);
  }

  for (const { item, terms } of termsByItem) {
    for (const term of terms) {
      const compactTerm = term.value.replaceAll(" ", "");
      const compactQuery = normalizedQuery.replaceAll(" ", "");
      const longest = Math.max(compactTerm.length, compactQuery.length);
      const shortest = Math.min(compactTerm.length, compactQuery.length);
      if (longest < 4 || shortest / longest < 0.68) continue;

      if (compactTerm.startsWith(compactQuery) && compactQuery.length >= 3) {
        const prefixScore = 78 + Math.round((compactQuery.length / compactTerm.length) * 12);
        addCandidate(item, term, compactTerm.length - compactQuery.length, prefixScore, "prefix");
        continue;
      }

      const distance = damerauLevenshtein(compactQuery, compactTerm);
      const allowed = longest >= 12 ? 3 : longest >= 7 ? 2 : 1;
      if (
        distance === 0 ||
        distance > allowed ||
        !isPlausibleCorrectionPair(compactQuery, compactTerm, distance)
      ) continue;
      const prefix = sharedPrefixLength(compactQuery, compactTerm);
      const score = 120 - distance * 16 - Math.abs(compactQuery.length - compactTerm.length) * 2 + Math.min(prefix, 4);
      addCandidate(item, term, distance, score, "typo");
    }
  }

  const bestByItem = new Map();
  for (const candidate of candidates) {
    const current = bestByItem.get(candidate.item.id);
    if (!current || candidate.score > current.score || (
      candidate.score === current.score && candidate.term.length < current.term.length
    )) {
      bestByItem.set(candidate.item.id, candidate);
    }
  }

  return [...bestByItem.values()]
    .sort((left, right) => right.score - left.score || left.term.localeCompare(right.term, "de"))
    .slice(0, options.limit ?? 4);
}

export function suggestedAlternatives(items, primaryItem, query) {
  const normalizedQuery = normalizeText(query);
  const itemIds = (primaryItem.guidedAlternatives ?? [])
    .filter((entry) => (entry.queries ?? []).some((candidate) => normalizeText(candidate) === normalizedQuery))
    .flatMap((entry) => entry.itemIds ?? []);
  const byId = new Map(items.map((item) => [item.id, item]));
  return [...new Set(itemIds)].map((id) => byId.get(id)).filter(Boolean);
}

export function isAmbiguous(results) {
  if (results.length < 2) return false;
  const [first, second] = results;
  if (first.score >= 125 && first.score - second.score >= 18) return false;
  return first.score - second.score < 20;
}
