import { desc, eq, inArray } from "drizzle-orm";

import type { Database, DatabaseExecutor } from "../../db";
import {
  quickResponseReferences,
  referenceSources,
} from "../../db/schema";

type QuickResponseReferenceRecord =
  typeof quickResponseReferences.$inferSelect;
type ReferenceSourceRecord = typeof referenceSources.$inferSelect;

export interface CreateQuickResponseReferenceInput {
  note?: string | null;
  quickResponseSessionId: string;
  referenceSourceId: string;
  referencedBy: string;
  selectionSource: QuickResponseReferenceRecord["selectionSource"];
  snapshotText: string;
  usageType: QuickResponseReferenceRecord["usageType"];
}

export type QuickResponseReferenceWithSource = QuickResponseReferenceRecord & {
  referenceSource: Pick<
    ReferenceSourceRecord,
    | "category"
    | "content"
    | "fileMimeType"
    | "fileName"
    | "fileSize"
    | "fileUrl"
    | "id"
    | "sourceType"
    | "status"
    | "storageKey"
    | "storageProvider"
    | "title"
    | "url"
  >;
};

export interface QuickResponseReferencesRepository {
  createQuickResponseReferences(
    inputs: CreateQuickResponseReferenceInput[],
    executor?: DatabaseExecutor,
  ): Promise<QuickResponseReferenceRecord[]>;
  findReferencesBySessionIds(
    sessionIds: string[],
  ): Promise<QuickResponseReferenceWithSource[]>;
}

const selection = {
  id: quickResponseReferences.id,
  quickResponseSessionId: quickResponseReferences.quickResponseSessionId,
  referenceSourceId: quickResponseReferences.referenceSourceId,
  referencedBy: quickResponseReferences.referencedBy,
  selectionSource: quickResponseReferences.selectionSource,
  usageType: quickResponseReferences.usageType,
  relevanceScore: quickResponseReferences.relevanceScore,
  snapshotText: quickResponseReferences.snapshotText,
  note: quickResponseReferences.note,
  createdAt: quickResponseReferences.createdAt,
  referenceSource: {
    id: referenceSources.id,
    title: referenceSources.title,
    sourceType: referenceSources.sourceType,
    category: referenceSources.category,
    content: referenceSources.content,
    url: referenceSources.url,
    fileUrl: referenceSources.fileUrl,
    storageProvider: referenceSources.storageProvider,
    storageKey: referenceSources.storageKey,
    fileName: referenceSources.fileName,
    fileMimeType: referenceSources.fileMimeType,
    fileSize: referenceSources.fileSize,
    status: referenceSources.status,
  },
};

export const createQuickResponseReferencesRepository = (
  db: Database,
): QuickResponseReferencesRepository => ({
  async createQuickResponseReferences(inputs, executor = db) {
    if (inputs.length === 0) return [];

    return executor.insert(quickResponseReferences).values(inputs).returning();
  },

  async findReferencesBySessionIds(sessionIds) {
    if (sessionIds.length === 0) return [];

    return db
      .select(selection)
      .from(quickResponseReferences)
      .innerJoin(
        referenceSources,
        eq(quickResponseReferences.referenceSourceId, referenceSources.id),
      )
      .where(inArray(quickResponseReferences.quickResponseSessionId, sessionIds))
      .orderBy(desc(quickResponseReferences.createdAt));
  },
});
