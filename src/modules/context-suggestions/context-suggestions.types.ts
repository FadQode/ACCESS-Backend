import type { ComplaintCategory } from "../complaints/complaints.types";

export interface ContextSuggestionsInput {
  category?: ComplaintCategory;
  complaintText: string;
}

export interface RelevantReferencePreview {
  id: string;
  title: string;
  category: ComplaintCategory | null;
  sourceType: string;
  snippet: string;
  fileName: string | null;
  score: number;
}

export interface SimilarResolvedCasePreview {
  category: ComplaintCategory;
  complaintTextPreview: string;
  finalResponsePreview: string;
  resolvedAt: string | null;
}

export interface ContextSuggestionsResult {
  relevantReferences: RelevantReferencePreview[];
  similarResolvedCases: SimilarResolvedCasePreview[];
}

export interface ReferenceCandidate {
  id: string;
  title: string;
  category: ComplaintCategory | null;
  content: string | null;
  fileName: string | null;
  searchText: string | null;
  sourceType: string;
  status: string;
  updatedAt: Date;
  createdAt: Date;
}

export interface ResolvedCaseCandidate {
  complaintId: string;
  category: ComplaintCategory;
  complaintText: string;
  finalResponse: string | null;
  resolvedAt: Date | null;
  quickResponseCreatedAt: Date;
}

export interface ContextSuggestionsRepository {
  findReferenceCandidates(input: {
    category?: ComplaintCategory;
    keywords: string[];
    limit: number;
  }): Promise<ReferenceCandidate[]>;
  findResolvedCaseCandidates(input: {
    category?: ComplaintCategory;
    keywords: string[];
    limit: number;
  }): Promise<ResolvedCaseCandidate[]>;
}

export interface ContextSuggestionsService {
  getContextSuggestions(
    input: ContextSuggestionsInput,
  ): Promise<ContextSuggestionsResult>;
}

export const emptyContextSuggestions = (): ContextSuggestionsResult => ({
  relevantReferences: [],
  similarResolvedCases: [],
});
