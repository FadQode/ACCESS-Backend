import type { ComplaintCategory } from "../complaints/complaints.types";

export interface ReferenceEmbeddingSource {
  category: ComplaintCategory | null;
  content: string | null;
  fileName: string | null;
  id: string;
  sourceType: string;
  tags: string[];
  title: string;
  updatedAt: Date;
}

export interface ResolvedCaseEmbeddingSource {
  category: ComplaintCategory;
  complaintId: string;
  complaintText: string;
  complaintUpdatedAt: Date;
  finalResponse: string;
  quickResponseCreatedAt: Date;
  quickResponseSessionId: string;
  quickResponseUpdatedAt: Date;
  resolvedAt: Date | null;
}

export interface UpsertReferenceEmbeddingInput {
  embeddedText: string;
  embedding: number[];
  embeddingVersion: number;
  modelName: string;
  referenceSourceId: string;
}

export interface UpsertResolvedCaseEmbeddingInput {
  complaintId: string;
  embeddedText: string;
  embedding: number[];
  embeddingVersion: number;
  modelName: string;
  quickResponseSessionId: string;
}

export interface EmbeddingBackfillSummary {
  batchSize: number;
  embedded: number;
  failed: number;
  scanned: number;
  skipped: number;
  status: "ok";
}

export interface EmbeddingRepository {
  findReferencesNeedingEmbedding(input: {
    embeddingVersion: number;
    limit?: number;
    modelName: string;
  }): Promise<ReferenceEmbeddingSource[]>;
  findResolvedCasesNeedingEmbedding(input: {
    embeddingVersion: number;
    limit?: number;
    modelName: string;
  }): Promise<ResolvedCaseEmbeddingSource[]>;
  upsertReferenceEmbedding(input: UpsertReferenceEmbeddingInput): Promise<void>;
  upsertResolvedCaseEmbedding(input: UpsertResolvedCaseEmbeddingInput): Promise<void>;
}
