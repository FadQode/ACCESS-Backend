import type { ComplaintCategory } from "../complaints/complaints.types";
import {
  buildSearchPhrase,
  containsPhrase,
  countKeywordMatches,
  createSnippet,
  extractKeywords,
} from "./context-suggestions.utils";
import type {
  ContextSuggestionsInput,
  ContextSuggestionsRepository,
  ContextSuggestionsResult,
  ContextSuggestionsService,
  ReferenceCandidate,
  RelevantReferencePreview,
  ResolvedCaseCandidate,
  SimilarResolvedCasePreview,
} from "./context-suggestions.types";

const TOP_REFERENCES = 3;
const TOP_SIMILAR_CASES = 3;
const MIN_SCORE = 10;
const REFERENCE_CANDIDATES = 30;
const RESOLVED_CASE_CANDIDATES = 50;
const SNIPPET_CHARS = 220;

const weightedSourceTypes = new Set(["sop", "policy", "known_issue"]);

type ScoredResolvedCasePreview = SimilarResolvedCasePreview & {
  score: number;
};

type ScoredReferencePreview = {
  result: RelevantReferencePreview;
  score: number;
};

const toIsoString = (value: Date | null): string | null =>
  value ? value.toISOString() : null;

const hasCategoryMatch = (
  candidateCategory: ComplaintCategory | null,
  inputCategory?: ComplaintCategory,
): boolean => Boolean(inputCategory && candidateCategory === inputCategory);

const hasRecentResolvedDate = (value: Date | null): boolean => {
  if (!value) return false;

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - value.getTime() <= thirtyDaysMs;
};

const scoreReference = (
  candidate: ReferenceCandidate,
  input: ContextSuggestionsInput,
  keywords: string[],
  phrase: string,
): ScoredReferencePreview | null => {
  const titleMatches = countKeywordMatches(candidate.title, keywords);
  const searchableText = [
    candidate.content ?? "",
    candidate.searchText ?? "",
    candidate.fileName ?? "",
  ].join(" ");
  const contentMatches = countKeywordMatches(searchableText, keywords);
  const categoryMatch = hasCategoryMatch(candidate.category, input.category);
  const phraseMatch = containsPhrase(`${candidate.title} ${searchableText}`, phrase);

  const score =
    (categoryMatch ? 6 : 0) +
    Math.min(titleMatches * 3, 9) +
    Math.min(contentMatches, 8) +
    (weightedSourceTypes.has(candidate.sourceType) ? 2 : 0) +
    (phraseMatch ? 2 : 0) +
    (candidate.content || candidate.searchText || candidate.fileName ? 1 : 0);

  const passesGate =
    (categoryMatch && titleMatches + contentMatches > 0) ||
    titleMatches >= 2 ||
    phraseMatch;

  if (!passesGate || score < MIN_SCORE) return null;

  return {
    result: {
      id: candidate.id,
      title: candidate.title,
      category: candidate.category,
      sourceType: candidate.sourceType,
      snippet: createSnippet(
        candidate.content ??
          candidate.searchText ??
          candidate.fileName ??
          candidate.title,
        keywords,
        SNIPPET_CHARS,
      ),
      fileName: candidate.fileName,
    },
    score,
  };
};

const scoreResolvedCase = (
  candidate: ResolvedCaseCandidate,
  input: ContextSuggestionsInput,
  keywords: string[],
  phrase: string,
): ScoredResolvedCasePreview | null => {
  if (!candidate.finalResponse?.trim()) return null;

  const complaintMatches = countKeywordMatches(candidate.complaintText, keywords);
  const responseMatches = countKeywordMatches(candidate.finalResponse, keywords);
  const categoryMatch = hasCategoryMatch(candidate.category, input.category);
  const phraseMatch = containsPhrase(
    `${candidate.complaintText} ${candidate.finalResponse}`,
    phrase,
  );

  const score =
    (categoryMatch ? 6 : 0) +
    Math.min(complaintMatches * 3, 9) +
    Math.min(responseMatches, 5) +
    (phraseMatch ? 2 : 0) +
    (hasRecentResolvedDate(candidate.resolvedAt) ? 1 : 0);

  const passesGate =
    (categoryMatch && complaintMatches + responseMatches > 0) ||
    complaintMatches >= 2 ||
    phraseMatch;

  if (!passesGate || score < MIN_SCORE) return null;

  return {
    category: candidate.category,
    complaintTextPreview: createSnippet(
      candidate.complaintText,
      keywords,
      SNIPPET_CHARS,
    ),
    finalResponsePreview: createSnippet(
      candidate.finalResponse,
      keywords,
      SNIPPET_CHARS,
    ),
    resolvedAt: toIsoString(candidate.resolvedAt),
    score,
  };
};

const compareByScoreThenDate =
  <T extends { score: number }>(
    getDate: (value: T) => Date | string | null,
  ) =>
  (left: T, right: T): number => {
    if (right.score !== left.score) return right.score - left.score;

    const leftTime = new Date(getDate(left) ?? 0).getTime();
    const rightTime = new Date(getDate(right) ?? 0).getTime();
    return rightTime - leftTime;
  };

export const createContextSuggestionsService = (
  repository: ContextSuggestionsRepository,
): ContextSuggestionsService => ({
  async getContextSuggestions(
    input: ContextSuggestionsInput,
  ): Promise<ContextSuggestionsResult> {
    const keywords = extractKeywords(input.complaintText);
    const phrase = buildSearchPhrase(keywords);
    const [referenceCandidates, resolvedCaseCandidates] = await Promise.all([
      repository.findReferenceCandidates({
        category: input.category,
        keywords,
        limit: REFERENCE_CANDIDATES,
      }),
      repository.findResolvedCaseCandidates({
        category: input.category,
        keywords,
        limit: RESOLVED_CASE_CANDIDATES,
      }),
    ]);

    const relevantReferences = referenceCandidates
      .map((candidate) => scoreReference(candidate, input, keywords, phrase))
      .filter((candidate): candidate is ScoredReferencePreview =>
        Boolean(candidate),
      )
      .sort(
        compareByScoreThenDate((candidate) => {
          const source = referenceCandidates.find(
            (item) => item.id === candidate.result.id,
          );
          return source?.updatedAt ?? null;
        }),
      )
      .slice(0, TOP_REFERENCES)
      .map((candidate) => candidate.result);

    const seenComplaintIds = new Set<string>();
    const similarResolvedCases = resolvedCaseCandidates
      .filter((candidate) => {
        if (seenComplaintIds.has(candidate.complaintId)) return false;

        seenComplaintIds.add(candidate.complaintId);
        return true;
      })
      .map((candidate) => scoreResolvedCase(candidate, input, keywords, phrase))
      .filter((candidate): candidate is ScoredResolvedCasePreview =>
        Boolean(candidate),
      )
      .sort(compareByScoreThenDate((candidate) => candidate.resolvedAt))
      .slice(0, TOP_SIMILAR_CASES)
      .map(({ score: _score, ...candidate }) => candidate);

    return { relevantReferences, similarResolvedCases };
  },
});
