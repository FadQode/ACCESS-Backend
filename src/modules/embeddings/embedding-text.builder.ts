import type { ComplaintCategory } from "../complaints/complaints.types";

const normalizeEmbeddedText = (parts: Array<string | null | undefined>): string =>
  parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeTags = (tags: string[] | undefined): string[] =>
  [...new Set(
    (tags ?? [])
      .map((tag) => tag.trim())
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right));

export const buildReferenceEmbeddedText = (input: {
  category: ComplaintCategory | null;
  content: string | null;
  fileName: string | null;
  sourceType: string;
  tags?: string[];
  title: string;
}): string =>
  normalizeEmbeddedText([
    input.title,
    input.category,
    input.sourceType,
    normalizeTags(input.tags).join(" "),
    input.content,
    input.fileName,
  ]);

export const buildResolvedCaseEmbeddedText = (input: {
  complaintText: string;
  finalResponse: string;
}): string =>
  normalizeEmbeddedText([input.complaintText, input.finalResponse]);

export const buildQueryEmbeddedText = (input: {
  category?: ComplaintCategory;
  complaintText: string;
}): string => normalizeEmbeddedText([input.category, input.complaintText]);
