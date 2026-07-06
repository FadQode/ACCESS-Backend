const stopwords = new Set([
  "ada",
  "agar",
  "aku",
  "akan",
  "atau",
  "bagi",
  "banget",
  "belum",
  "bisa",
  "buat",
  "dalam",
  "dan",
  "dari",
  "dengan",
  "di",
  "dia",
  "ini",
  "itu",
  "jadi",
  "juga",
  "kalau",
  "kami",
  "karena",
  "ke",
  "kok",
  "lagi",
  "lebih",
  "mau",
  "mohon",
  "nggak",
  "nya",
  "pada",
  "saat",
  "saja",
  "saya",
  "sudah",
  "supaya",
  "tadi",
  "takut",
  "tapi",
  "telah",
  "terkait",
  "tidak",
  "untuk",
  "yang",
]);

export const normalizeSearchText = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const extractKeywords = (
  value: string,
  maxKeywords = 12,
): string[] => {
  const keywords: string[] = [];
  const seen = new Set<string>();

  for (const token of normalizeSearchText(value).split(" ")) {
    if (token.length < 3 || stopwords.has(token) || seen.has(token)) {
      continue;
    }

    seen.add(token);
    keywords.push(token);

    if (keywords.length >= maxKeywords) break;
  }

  return keywords;
};

export const buildSearchPhrase = (keywords: string[]): string =>
  keywords.slice(0, 5).join(" ");

export const redactSensitiveText = (value: string): string =>
  value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/@[a-z0-9_]{3,}/gi, "[redacted-handle]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[redacted-phone]")
    .replace(/\s+/g, " ")
    .trim();

export const countKeywordMatches = (
  value: string,
  keywords: string[],
): number => {
  const normalized = normalizeSearchText(value);
  return keywords.reduce(
    (count, keyword) => count + (normalized.includes(keyword) ? 1 : 0),
    0,
  );
};

export const containsPhrase = (value: string, phrase: string): boolean =>
  phrase.length > 0 && normalizeSearchText(value).includes(phrase);

export const createSnippet = (
  value: string,
  keywords: string[],
  maxChars = 220,
): string => {
  const redacted = redactSensitiveText(value);

  if (redacted.length <= maxChars) {
    return redacted;
  }

  const lowerRedacted = redacted.toLowerCase();
  const keywordIndex = keywords
    .map((keyword) => lowerRedacted.indexOf(keyword))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  const center = keywordIndex ?? 0;
  const start = Math.max(0, center - Math.floor(maxChars / 3));
  const slice = redacted.slice(start, start + maxChars).trim();
  const prefix = start > 0 ? "... " : "";
  const suffix = start + maxChars < redacted.length ? " ..." : "";
  const available = maxChars - prefix.length - suffix.length;

  return `${prefix}${slice.slice(0, available).trim()}${suffix}`;
};
