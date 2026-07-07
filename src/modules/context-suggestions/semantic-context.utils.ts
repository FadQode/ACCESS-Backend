import { redactSensitiveText } from "./context-suggestions.utils";

const normalizePreviewText = (value: string | null | undefined): string =>
  redactSensitiveText(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

export const makeSnippet = (
  value: string | null | undefined,
  maxChars = 220,
): string => {
  const normalized = normalizePreviewText(value);

  if (normalized.length <= maxChars) {
    return normalized;
  }

  const suffix = "...";
  return `${normalized.slice(0, maxChars - suffix.length).trim()}${suffix}`;
};

export const sanitizeResolvedCasePreview = (
  value: string | null | undefined,
): string => makeSnippet(value);

export const isRecentWithinDays = (
  value: Date | null,
  days: number,
): boolean => {
  if (!value) return false;

  return Date.now() - value.getTime() <= days * 24 * 60 * 60 * 1000;
};
