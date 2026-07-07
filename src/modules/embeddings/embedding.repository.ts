import { sql } from "drizzle-orm";

import type { Database } from "../../db";
import {
  referenceSourceEmbeddings,
  resolvedCaseEmbeddings,
} from "../../db/schema";
import { toPgVectorLiteral } from "./embedding-vector.util";
import type {
  EmbeddingRepository,
  ReferenceEmbeddingSource,
  ResolvedCaseEmbeddingSource,
  UpsertReferenceEmbeddingInput,
  UpsertResolvedCaseEmbeddingInput,
} from "./embedding.types";

const DEFAULT_BACKFILL_LIMIT = 500;

const rowsFrom = async <T>(query: Promise<unknown>): Promise<T[]> =>
  (await query) as T[];

export const createEmbeddingRepository = (db: Database): EmbeddingRepository => ({
  async findReferencesNeedingEmbedding({
    embeddingVersion,
    limit = DEFAULT_BACKFILL_LIMIT,
    modelName,
  }) {
    return rowsFrom<ReferenceEmbeddingSource>(
      db.execute(sql`
        select
          rs.id,
          rs.title,
          rs.category,
          rs.content,
          rs.file_name as "fileName",
          rs.source_type as "sourceType",
          coalesce(
            array_agg(rt.name order by lower(rt.name))
              filter (where rt.name is not null and btrim(rt.name) <> ''),
            '{}'
          ) as tags,
          rs.updated_at as "updatedAt"
        from reference_sources rs
        left join reference_source_tags rst
          on rst.reference_source_id = rs.id
        left join reference_tags rt
          on rt.id = rst.tag_id
        left join reference_source_embeddings rse
          on rse.reference_source_id = rs.id
          and rse.model_name = ${modelName}
          and rse.embedding_version = ${embeddingVersion}
        where rs.status = 'active'
          and (
            rse.id is null
            or rs.updated_at > rse.updated_at
          )
        group by
          rs.id,
          rs.title,
          rs.category,
          rs.content,
          rs.created_at,
          rs.file_name,
          rs.source_type,
          rs.updated_at
        order by rs.updated_at asc, rs.created_at asc
        limit ${limit}
      `),
    );
  },

  async findResolvedCasesNeedingEmbedding({
    embeddingVersion,
    limit = DEFAULT_BACKFILL_LIMIT,
    modelName,
  }) {
    return rowsFrom<ResolvedCaseEmbeddingSource>(
      db.execute(sql`
        with latest_valid_resolved_case as (
          select
            c.id as "complaintId",
            c.category,
            c.complaint_text as "complaintText",
            c.updated_at as "complaintUpdatedAt",
            c.resolved_at as "resolvedAt",
            qrs.id as "quickResponseSessionId",
            qrs.final_response as "finalResponse",
            qrs.created_at as "quickResponseCreatedAt",
            qrs.updated_at as "quickResponseUpdatedAt",
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
          latest."complaintUpdatedAt",
          latest."resolvedAt",
          latest."quickResponseSessionId",
          latest."finalResponse",
          latest."quickResponseCreatedAt",
          latest."quickResponseUpdatedAt"
        from latest_valid_resolved_case latest
        left join resolved_case_embeddings rce
          on rce.complaint_id = latest."complaintId"
          and rce.quick_response_session_id = latest."quickResponseSessionId"
          and rce.model_name = ${modelName}
          and rce.embedding_version = ${embeddingVersion}
        where latest.row_number = 1
          and (
            rce.id is null
            or latest."quickResponseUpdatedAt" > rce.updated_at
            or latest."complaintUpdatedAt" > rce.updated_at
          )
        order by latest."quickResponseCreatedAt" asc
        limit ${limit}
      `),
    );
  },

  async upsertReferenceEmbedding(input: UpsertReferenceEmbeddingInput) {
    const embedding = sql`${toPgVectorLiteral(input.embedding)}::vector`;

    await db
      .insert(referenceSourceEmbeddings)
      .values({
        embeddedText: input.embeddedText,
        embedding,
        embeddingVersion: input.embeddingVersion,
        modelName: input.modelName,
        referenceSourceId: input.referenceSourceId,
      })
      .onConflictDoUpdate({
        target: [
          referenceSourceEmbeddings.referenceSourceId,
          referenceSourceEmbeddings.modelName,
          referenceSourceEmbeddings.embeddingVersion,
        ],
        set: {
          embeddedText: input.embeddedText,
          embedding,
          updatedAt: sql`now()`,
        },
      });
  },

  async upsertResolvedCaseEmbedding(input: UpsertResolvedCaseEmbeddingInput) {
    const embedding = sql`${toPgVectorLiteral(input.embedding)}::vector`;

    await db
      .insert(resolvedCaseEmbeddings)
      .values({
        complaintId: input.complaintId,
        embeddedText: input.embeddedText,
        embedding,
        embeddingVersion: input.embeddingVersion,
        modelName: input.modelName,
        quickResponseSessionId: input.quickResponseSessionId,
      })
      .onConflictDoUpdate({
        target: [
          resolvedCaseEmbeddings.complaintId,
          resolvedCaseEmbeddings.quickResponseSessionId,
          resolvedCaseEmbeddings.modelName,
          resolvedCaseEmbeddings.embeddingVersion,
        ],
        set: {
          embeddedText: input.embeddedText,
          embedding,
          updatedAt: sql`now()`,
        },
      });
  },
});
