import { and, desc, eq } from "drizzle-orm";

import type { Database, DatabaseExecutor } from "../../db";
import {
  actionRequestReferences,
  referenceSources,
  users,
} from "../../db/schema";

type ActionRequestReferenceRecord =
  typeof actionRequestReferences.$inferSelect;
type ReferenceSourceRecord = typeof referenceSources.$inferSelect;

export type ActionRequestReferenceWithSource = ActionRequestReferenceRecord & {
  attachedByEmail: string;
  attachedByName: string;
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

export interface CreateActionRequestReferenceInput {
  actionRequestId: string;
  attachedBy: string;
  note?: string | null;
  referenceSourceId: string;
  snapshotText: string;
  usageType: ActionRequestReferenceRecord["usageType"];
}

export interface ActionRequestReferencesRepository {
  createActionRequestReference(
    input: CreateActionRequestReferenceInput,
    executor?: DatabaseExecutor,
  ): Promise<ActionRequestReferenceRecord>;
  deleteActionRequestReference(
    actionRequestId: string,
    referenceLinkId: string,
    executor?: DatabaseExecutor,
  ): Promise<ActionRequestReferenceRecord | null>;
  findActionRequestReferenceBySource(
    actionRequestId: string,
    referenceSourceId: string,
    executor?: DatabaseExecutor,
  ): Promise<ActionRequestReferenceRecord | null>;
  findActionRequestReferenceById(
    actionRequestId: string,
    referenceLinkId: string,
    executor?: DatabaseExecutor,
  ): Promise<ActionRequestReferenceRecord | null>;
  findActionRequestReferences(
    actionRequestId: string,
    executor?: DatabaseExecutor,
  ): Promise<ActionRequestReferenceWithSource[]>;
}

const selection = {
  id: actionRequestReferences.id,
  actionRequestId: actionRequestReferences.actionRequestId,
  referenceSourceId: actionRequestReferences.referenceSourceId,
  attachedBy: actionRequestReferences.attachedBy,
  usageType: actionRequestReferences.usageType,
  snapshotText: actionRequestReferences.snapshotText,
  note: actionRequestReferences.note,
  createdAt: actionRequestReferences.createdAt,
  attachedByName: users.name,
  attachedByEmail: users.email,
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

export const createActionRequestReferencesRepository = (
  db: Database,
): ActionRequestReferencesRepository => ({
  async createActionRequestReference(input, executor = db) {
    const [link] = await executor
      .insert(actionRequestReferences)
      .values(input)
      .returning();

    if (!link) throw new Error("Action request reference insert returned no row");
    return link;
  },

  async deleteActionRequestReference(
    actionRequestId,
    referenceLinkId,
    executor = db,
  ) {
    const [deleted] = await executor
      .delete(actionRequestReferences)
      .where(
        and(
          eq(actionRequestReferences.actionRequestId, actionRequestId),
          eq(actionRequestReferences.id, referenceLinkId),
        ),
      )
      .returning();
    return deleted ?? null;
  },

  async findActionRequestReferenceBySource(
    actionRequestId,
    referenceSourceId,
    executor = db,
  ) {
    const [link] = await executor
      .select()
      .from(actionRequestReferences)
      .where(
        and(
          eq(actionRequestReferences.actionRequestId, actionRequestId),
          eq(actionRequestReferences.referenceSourceId, referenceSourceId),
        ),
      )
      .limit(1);
    return link ?? null;
  },

  async findActionRequestReferenceById(
    actionRequestId,
    referenceLinkId,
    executor = db,
  ) {
    const [link] = await executor
      .select()
      .from(actionRequestReferences)
      .where(
        and(
          eq(actionRequestReferences.actionRequestId, actionRequestId),
          eq(actionRequestReferences.id, referenceLinkId),
        ),
      )
      .limit(1);
    return link ?? null;
  },

  async findActionRequestReferences(actionRequestId, executor = db) {
    return executor
      .select(selection)
      .from(actionRequestReferences)
      .innerJoin(
        referenceSources,
        eq(actionRequestReferences.referenceSourceId, referenceSources.id),
      )
      .innerJoin(users, eq(actionRequestReferences.attachedBy, users.id))
      .where(eq(actionRequestReferences.actionRequestId, actionRequestId))
      .orderBy(desc(actionRequestReferences.createdAt));
  },
});
