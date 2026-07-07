import type { ComplaintCategory } from "../complaints/complaints.types";

export interface RelevantReference {
  category: ComplaintCategory | null;
  fileName: string | null;
  id: string;
  snippet: string;
  sourceType: string;
  title: string;
}

export interface SimilarResolvedCase {
  category: ComplaintCategory;
  complaintTextPreview: string;
  finalResponsePreview: string;
  resolvedAt: string | null;
}

export interface SemanticContextInput {
  category?: ComplaintCategory;
  complaintText: string;
}

export interface SemanticContextResult {
  relevantReferences: RelevantReference[];
  similarResolvedCases: SimilarResolvedCase[];
}

export interface SemanticReferenceCandidate {
  category: ComplaintCategory | null;
  content: string | null;
  embeddedText: string;
  fileName: string | null;
  id: string;
  similarity: number;
  sourceType: string;
  title: string;
  updatedAt: Date;
}

export interface SemanticResolvedCaseCandidate {
  category: ComplaintCategory;
  complaintId: string;
  complaintText: string;
  finalResponse: string;
  quickResponseSessionId: string;
  resolvedAt: Date | null;
  similarity: number;
}

export interface SemanticContextRepository {
  findRelevantReferenceCandidates(input: {
    embedding: number[];
    embeddingVersion: number;
    limit: number;
    modelName: string;
  }): Promise<SemanticReferenceCandidate[]>;
  findSimilarResolvedCaseCandidates(input: {
    embedding: number[];
    embeddingVersion: number;
    limit: number;
    modelName: string;
  }): Promise<SemanticResolvedCaseCandidate[]>;
}

export interface SemanticContextService {
  getSemanticContextSuggestions(
    input: SemanticContextInput,
  ): Promise<SemanticContextResult>;
}

export const emptySemanticContext = (): SemanticContextResult => ({
  relevantReferences: [],
  similarResolvedCases: [],
});
