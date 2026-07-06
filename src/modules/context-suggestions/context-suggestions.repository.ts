import {
  and,
  desc,
  eq,
  ilike,
  isNotNull,
  or,
  type SQL,
} from "drizzle-orm";

import type { Database } from "../../db";
import {
  complaints,
  quickResponseSessions,
  referenceSources,
} from "../../db/schema";
import type {
  ContextSuggestionsRepository,
  ReferenceCandidate,
  ResolvedCaseCandidate,
} from "./context-suggestions.types";

const keywordConditions = (
  columns: Array<Parameters<typeof ilike>[0]>,
  keywords: string[],
): SQL[] =>
  keywords.flatMap((keyword) =>
    columns.map((column) => ilike(column, `%${keyword}%`)),
  );

export const createContextSuggestionsRepository = (
  db: Database,
): ContextSuggestionsRepository => ({
  async findReferenceCandidates({ category, keywords, limit }) {
    const relevanceConditions: SQL[] = [
      ...keywordConditions(
        [
          referenceSources.title,
          referenceSources.content,
          referenceSources.searchText,
        ],
        keywords,
      ),
    ];

    if (category) {
      relevanceConditions.push(eq(referenceSources.category, category));
    }

    if (relevanceConditions.length === 0) {
      return [];
    }

    const rows = await db
      .select({
        id: referenceSources.id,
        title: referenceSources.title,
        category: referenceSources.category,
        content: referenceSources.content,
        fileName: referenceSources.fileName,
        searchText: referenceSources.searchText,
        sourceType: referenceSources.sourceType,
        status: referenceSources.status,
        updatedAt: referenceSources.updatedAt,
        createdAt: referenceSources.createdAt,
      })
      .from(referenceSources)
      .where(
        and(eq(referenceSources.status, "active"), or(...relevanceConditions)),
      )
      .orderBy(desc(referenceSources.updatedAt), desc(referenceSources.createdAt))
      .limit(limit);

    return rows;
  },

  async findResolvedCaseCandidates({ category, keywords, limit }) {
    const relevanceConditions: SQL[] = [
      ...keywordConditions(
        [complaints.complaintText, quickResponseSessions.finalResponse],
        keywords,
      ),
    ];

    if (category) {
      relevanceConditions.push(eq(complaints.category, category));
    }

    if (relevanceConditions.length === 0) {
      return [];
    }

    const rows = await db
      .select({
        complaintId: complaints.id,
        category: complaints.category,
        complaintText: complaints.complaintText,
        finalResponse: quickResponseSessions.finalResponse,
        resolvedAt: complaints.resolvedAt,
        quickResponseCreatedAt: quickResponseSessions.createdAt,
      })
      .from(complaints)
      .innerJoin(
        quickResponseSessions,
        eq(quickResponseSessions.complaintId, complaints.id),
      )
      .where(
        and(
          eq(complaints.status, "resolved"),
          eq(quickResponseSessions.outcome, "sent_resolved"),
          isNotNull(quickResponseSessions.finalResponse),
          or(...relevanceConditions),
        ),
      )
      .orderBy(desc(quickResponseSessions.createdAt), desc(complaints.resolvedAt))
      .limit(limit);

    return rows;
  },
});
