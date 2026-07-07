import type {
  EmbeddingConfig,
  SemanticContextConfig,
} from "../../config/env";
import type { EmbeddingClient } from "../../integrations/embeddings/embedding.types";
import {
  buildQueryEmbeddedText,
  assertEmbeddingDimension,
} from "../embeddings";
import type { ComplaintCategory } from "../complaints/complaints.types";
import {
  isRecentWithinDays,
  makeSnippet,
  sanitizeResolvedCasePreview,
} from "./semantic-context.utils";
import {
  emptySemanticContext,
  type RelevantReference,
  type SemanticContextInput,
  type SemanticContextRepository,
  type SemanticContextResult,
  type SemanticContextService,
  type SemanticReferenceCandidate,
  type SemanticResolvedCaseCandidate,
  type SimilarResolvedCase,
} from "./semantic-context.types";

const weightedSourceTypes = new Set(["sop", "policy", "known_issue"]);

interface ScoredReference {
  finalScore: number;
  result: RelevantReference;
  similarity: number;
  updatedAt: Date;
}

interface ScoredResolvedCase {
  complaintId: string;
  finalScore: number;
  result: SimilarResolvedCase;
  similarity: number;
  sortDate: Date | null;
}

const hasCategoryMatch = (
  candidateCategory: ComplaintCategory | null,
  inputCategory?: ComplaintCategory,
): boolean => Boolean(inputCategory && candidateCategory === inputCategory);

const toIsoString = (value: Date | null): string | null =>
  value ? value.toISOString() : null;

const scoreReference = (
  candidate: SemanticReferenceCandidate,
  input: SemanticContextInput,
  config: SemanticContextConfig,
): ScoredReference | null => {
  if (candidate.similarity < config.minRawSimilarity) return null;

  const categoryBoost = hasCategoryMatch(candidate.category, input.category)
    ? config.categoryBoost
    : 0;
  const sourceTypeBoost = weightedSourceTypes.has(candidate.sourceType)
    ? config.referenceSourceTypeBoost
    : 0;
  const finalScore = candidate.similarity * 10 + categoryBoost + sourceTypeBoost;

  if (finalScore < config.minScore) return null;

  return {
    finalScore,
    result: {
      category: candidate.category,
      fileName: candidate.fileName,
      id: candidate.id,
      snippet: makeSnippet(
        candidate.content ??
          candidate.embeddedText ??
          candidate.title ??
          candidate.fileName,
      ),
      sourceType: candidate.sourceType,
      title: candidate.title,
    },
    similarity: candidate.similarity,
    updatedAt: candidate.updatedAt,
  };
};

const scoreResolvedCase = (
  candidate: SemanticResolvedCaseCandidate,
  input: SemanticContextInput,
  config: SemanticContextConfig,
): ScoredResolvedCase | null => {
  if (candidate.similarity < config.minRawSimilarity) return null;

  const categoryBoost = hasCategoryMatch(candidate.category, input.category)
    ? config.categoryBoost
    : 0;
  const recencyBoost = isRecentWithinDays(candidate.resolvedAt, 30)
    ? config.resolvedCaseRecencyBoost
    : 0;
  const finalScore = candidate.similarity * 10 + categoryBoost + recencyBoost;

  if (finalScore < config.minScore) return null;

  return {
    complaintId: candidate.complaintId,
    finalScore,
    result: {
      category: candidate.category,
      complaintTextPreview: sanitizeResolvedCasePreview(
        candidate.complaintText,
      ),
      finalResponsePreview: sanitizeResolvedCasePreview(candidate.finalResponse),
      resolvedAt: toIsoString(candidate.resolvedAt),
    },
    similarity: candidate.similarity,
    sortDate: candidate.resolvedAt,
  };
};

const compareScored = <T extends { finalScore: number; similarity: number }>(
  getDate: (value: T) => Date | null,
) => (left: T, right: T): number => {
  if (right.finalScore !== left.finalScore) {
    return right.finalScore - left.finalScore;
  }

  if (right.similarity !== left.similarity) {
    return right.similarity - left.similarity;
  }

  return (
    (getDate(right)?.getTime() ?? 0) - (getDate(left)?.getTime() ?? 0)
  );
};

const safely = async <T>(operation: () => Promise<T>): Promise<T | null> => {
  try {
    return await operation();
  } catch {
    return null;
  }
};

export const createSemanticContextService = (
  semanticConfig: SemanticContextConfig,
  embeddingConfig: EmbeddingConfig,
  embeddingClient: EmbeddingClient,
  repository: SemanticContextRepository,
): SemanticContextService => ({
  async getSemanticContextSuggestions(
    input: SemanticContextInput,
  ): Promise<SemanticContextResult> {
    if (!semanticConfig.enabled || !embeddingConfig.enabled) {
      return emptySemanticContext();
    }

    const embeddedText = buildQueryEmbeddedText(input);
    if (!embeddedText) {
      return emptySemanticContext();
    }

    const embeddingResponse = await safely(() =>
      embeddingClient.embed({ text: embeddedText }),
    );

    if (!embeddingResponse) {
      return emptySemanticContext();
    }

    try {
      assertEmbeddingDimension(
        embeddingResponse.embedding,
        embeddingConfig.dimension,
      );
    } catch {
      return emptySemanticContext();
    }

    const [referenceCandidates, resolvedCaseCandidates] = await Promise.all([
      safely(() =>
        repository.findRelevantReferenceCandidates({
          embedding: embeddingResponse.embedding,
          embeddingVersion: embeddingConfig.version,
          limit: semanticConfig.candidateLimit,
          modelName: embeddingConfig.model,
        }),
      ),
      safely(() =>
        repository.findSimilarResolvedCaseCandidates({
          embedding: embeddingResponse.embedding,
          embeddingVersion: embeddingConfig.version,
          limit: semanticConfig.candidateLimit,
          modelName: embeddingConfig.model,
        }),
      ),
    ]);

    const relevantReferences = (referenceCandidates ?? [])
      .map((candidate) => scoreReference(candidate, input, semanticConfig))
      .filter((candidate): candidate is ScoredReference => Boolean(candidate))
      .sort(compareScored((candidate) => candidate.updatedAt))
      .slice(0, semanticConfig.referenceLimit)
      .map((candidate) => candidate.result);

    const seenComplaintIds = new Set<string>();
    const similarResolvedCases = (resolvedCaseCandidates ?? [])
      .map((candidate) => scoreResolvedCase(candidate, input, semanticConfig))
      .filter((candidate): candidate is ScoredResolvedCase =>
        Boolean(candidate),
      )
      .sort(compareScored((candidate) => candidate.sortDate))
      .filter((candidate) => {
        if (seenComplaintIds.has(candidate.complaintId)) return false;

        seenComplaintIds.add(candidate.complaintId);
        return true;
      })
      .slice(0, semanticConfig.caseLimit)
      .map((candidate) => candidate.result);

    return { relevantReferences, similarResolvedCases };
  },
});
