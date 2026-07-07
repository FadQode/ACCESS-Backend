import { sql } from "drizzle-orm";

import type { Database } from "../../db";
import { toPgVectorLiteral } from "../embeddings";
import type {
  SemanticContextRepository,
  SemanticReferenceCandidate,
  SemanticResolvedCaseCandidate,
} from "./semantic-context.types";

const rowsFrom = async <T>(query: Promise<unknown>): Promise<T[]> =>
  (await query) as T[];

const toDate = (value: Date | string | null): Date | null => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

const normalizeReferenceRows = (
  rows: Array<Omit<SemanticReferenceCandidate, "similarity" | "updatedAt"> & {
    similarity: number | string;
    updatedAt: Date | string;
  }>,
): SemanticReferenceCandidate[] =>
  rows.map((row) => ({
    ...row,
    similarity: Number(row.similarity),
    updatedAt: toDate(row.updatedAt) ?? new Date(0),
  }));

const normalizeResolvedCaseRows = (
  rows: Array<Omit<SemanticResolvedCaseCandidate, "resolvedAt" | "similarity"> & {
    resolvedAt: Date | string | null;
    similarity: number | string;
  }>,
): SemanticResolvedCaseCandidate[] =>
  rows.map((row) => ({
    ...row,
    resolvedAt: toDate(row.resolvedAt),
    similarity: Number(row.similarity),
  }));

export const createSemanticContextRepository = (
  db: Database,
): SemanticContextRepository => ({
  async findRelevantReferenceCandidates({
    embedding,
    embeddingVersion,
    limit,
    modelName,
  }) {
    const queryVector = toPgVectorLiteral(embedding);
    const rows = await rowsFrom<
      Omit<SemanticReferenceCandidate, "similarity" | "updatedAt"> & {
        similarity: number | string;
        updatedAt: Date | string;
      }
    >(
      db.execute(sql`
        select
          rs.id,
          rs.title,
          rs.category,
          rs.source_type as "sourceType",
          rs.file_name as "fileName",
          rs.content,
          rs.updated_at as "updatedAt",
          rse.embedded_text as "embeddedText",
          1 - (rse.embedding <=> ${queryVector}::vector) as similarity
        from reference_source_embeddings rse
        inner join reference_sources rs
          on rs.id = rse.reference_source_id
        where rs.status = 'active'
          and rse.model_name = ${modelName}
          and rse.embedding_version = ${embeddingVersion}
        order by rse.embedding <=> ${queryVector}::vector
        limit ${limit}
      `),
    );

    return normalizeReferenceRows(rows);
  },

  async findSimilarResolvedCaseCandidates({
    embedding,
    embeddingVersion,
    limit,
    modelName,
  }) {
    const queryVector = toPgVectorLiteral(embedding);
    const rows = await rowsFrom<
      Omit<SemanticResolvedCaseCandidate, "resolvedAt" | "similarity"> & {
        resolvedAt: Date | string | null;
        similarity: number | string;
      }
    >(
      db.execute(sql`
        with latest_valid_resolved_case as (
          select
            c.id as "complaintId",
            c.category,
            c.complaint_text as "complaintText",
            c.resolved_at as "resolvedAt",
            qrs.id as "quickResponseSessionId",
            qrs.final_response as "finalResponse",
            row_number() over (
              partition by c.id
              order by qrs.created_at desc, qrs.id desc
            ) as row_number
          from complaints c
          inner join quick_response_sessions qrs
            on qrs.complaint_id = c.id
          where c.status = 'resolved'
            and qrs.outcome = 'sent_resolved'
            and qrs.final_response is not null
            and btrim(qrs.final_response) <> ''
        )
        select
          latest."complaintId",
          latest.category,
          latest."complaintText",
          latest."resolvedAt",
          latest."quickResponseSessionId",
          latest."finalResponse",
          1 - (rce.embedding <=> ${queryVector}::vector) as similarity
        from latest_valid_resolved_case latest
        inner join resolved_case_embeddings rce
          on rce.complaint_id = latest."complaintId"
          and rce.quick_response_session_id = latest."quickResponseSessionId"
        where latest.row_number = 1
          and rce.model_name = ${modelName}
          and rce.embedding_version = ${embeddingVersion}
        order by rce.embedding <=> ${queryVector}::vector
        limit ${limit}
      `),
    );

    return normalizeResolvedCaseRows(rows);
  },
});
