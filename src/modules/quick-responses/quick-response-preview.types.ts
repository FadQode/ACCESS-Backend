import type { ComplaintCategory } from "../complaints/complaints.types";
import type {
  RelevantReferencePreview,
  SimilarResolvedCasePreview,
} from "../context-suggestions";
import type { ResponseTarget } from "./quick-responses.types";

export interface HeatSuggestions {
  hear: string[];
  empathize: string[];
  apologize: string[];
  takeAction: string[];
}

export type QuickResponseSuggestionSource = "ai" | "fallback";

export interface QuickResponsePreviewInput {
  complaintText: string;
  category?: ComplaintCategory;
  responseTarget?: ResponseTarget;
  responseTone?: string | null;
}

export interface QuickResponsePreviewResult {
  relevantReferences: RelevantReferencePreview[];
  suggestionSource: QuickResponseSuggestionSource;
  suggestions: HeatSuggestions;
  similarResolvedCases: SimilarResolvedCasePreview[];
}
