import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  type SQL,
} from "drizzle-orm";

import type { Database, DatabaseExecutor } from "../../db";
import {
  referenceSources,
  referenceSourceTags,
  referenceTags,
} from "../../db/schema";
import type {
  ReferenceFilters,
  ReferenceSourceType,
  ReferenceStatus,
} from "./references.types";

type ReferenceSourceRecord = typeof referenceSources.$inferSelect;
type ReferenceTagRecord = typeof referenceTags.$inferSelect;

export type ReferenceSourceWithTags = ReferenceSourceRecord & {
  tags: string[];
};

export interface CreateReferenceSourceRecordInput {
  category?: ReferenceSourceRecord["category"];
  content?: string | null;
  createdBy: string;
  fileMimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  searchText: string;
  sourceType: ReferenceSourceType;
  status?: ReferenceStatus;
  storageBucket?: string | null;
  storageKey?: string | null;
  storageProvider?: string | null;
  title: string;
  url?: string | null;
  version?: string;
}

export interface UpdateReferenceSourceRecordInput {
  category?: ReferenceSourceRecord["category"] | null;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  searchText?: string;
  status?: ReferenceStatus;
  title?: string;
  url?: string | null;
  version?: string;
}

export interface ReferencesRepository {
  archiveReference(
    id: string,
    executor?: DatabaseExecutor,
  ): Promise<ReferenceSourceRecord | null>;
  attachTagsToReference(
    referenceId: string,
    tagIds: string[],
    executor?: DatabaseExecutor,
  ): Promise<void>;
  createReferenceSource(
    input: CreateReferenceSourceRecordInput,
    executor?: DatabaseExecutor,
  ): Promise<ReferenceSourceRecord>;
  createTag(
    name: string,
    executor?: DatabaseExecutor,
  ): Promise<ReferenceTagRecord>;
  findReferenceById(
    id: string,
    executor?: DatabaseExecutor,
  ): Promise<ReferenceSourceWithTags | null>;
  findReferences(
    filters: Required<Pick<ReferenceFilters, "page" | "limit">> &
      ReferenceFilters,
  ): Promise<{ items: ReferenceSourceWithTags[]; total: number }>;
  findTags(): Promise<ReferenceTagRecord[]>;
  findTagsByNames(names: string[]): Promise<ReferenceTagRecord[]>;
  replaceReferenceTags(
    referenceId: string,
    tagIds: string[],
    executor?: DatabaseExecutor,
  ): Promise<void>;
  updateReference(
    id: string,
    input: UpdateReferenceSourceRecordInput,
    executor?: DatabaseExecutor,
  ): Promise<ReferenceSourceRecord | null>;
}

export const createReferencesRepository = (
  db: Database,
): ReferencesRepository => {
  const hydrateTags = async (
    sources: ReferenceSourceRecord[],
  ): Promise<ReferenceSourceWithTags[]> => {
    if (sources.length === 0) return [];

    const ids = sources.map((source) => source.id);
    const tagRows = await db
      .select({
        referenceSourceId: referenceSourceTags.referenceSourceId,
        name: referenceTags.name,
      })
      .from(referenceSourceTags)
      .innerJoin(referenceTags, eq(referenceSourceTags.tagId, referenceTags.id))
      .where(inArray(referenceSourceTags.referenceSourceId, ids))
      .orderBy(asc(referenceTags.name));

    const tagsByReference = new Map<string, string[]>();
    for (const row of tagRows) {
      const tags = tagsByReference.get(row.referenceSourceId) ?? [];
      tags.push(row.name);
      tagsByReference.set(row.referenceSourceId, tags);
    }

    return sources.map((source) => ({
      ...source,
      tags: tagsByReference.get(source.id) ?? [],
    }));
  };

  return {
    async archiveReference(id, executor = db) {
      const [reference] = await executor
        .update(referenceSources)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(referenceSources.id, id))
        .returning();
      return reference ?? null;
    },

    async attachTagsToReference(referenceId, tagIds, executor = db) {
      if (tagIds.length === 0) return;

      await executor
        .insert(referenceSourceTags)
        .values(
          tagIds.map((tagId) => ({
            referenceSourceId: referenceId,
            tagId,
          })),
        )
        .onConflictDoNothing();
    },

    async createReferenceSource(input, executor = db) {
      const [reference] = await executor
        .insert(referenceSources)
        .values(input)
        .returning();

      if (!reference) throw new Error("Reference insert returned no row");
      return reference;
    },

    async createTag(name, executor = db) {
      const [tag] = await executor
        .insert(referenceTags)
        .values({ name })
        .onConflictDoUpdate({
          target: referenceTags.name,
          set: { name },
        })
        .returning();

      if (!tag) throw new Error("Reference tag insert returned no row");
      return tag;
    },

    async findReferenceById(id, executor = db) {
      const [reference] = await executor
        .select()
        .from(referenceSources)
        .where(eq(referenceSources.id, id))
        .limit(1);

      if (!reference) return null;
      if (executor === db) {
        const [hydrated] = await hydrateTags([reference]);
        return hydrated ?? null;
      }

      return { ...reference, tags: [] };
    },

    async findReferences(filters) {
      const conditions: SQL[] = [];

      if (filters.status) {
        conditions.push(eq(referenceSources.status, filters.status));
      }

      if (filters.category) {
        conditions.push(eq(referenceSources.category, filters.category));
      }

      if (filters.sourceType) {
        conditions.push(eq(referenceSources.sourceType, filters.sourceType));
      }

      if (filters.query?.trim()) {
        conditions.push(
          ilike(
            referenceSources.searchText,
            `%${filters.query.trim().toLowerCase()}%`,
          ),
        );
      }

      if (filters.tag?.trim()) {
        const linkedReferences = await db
          .select({ referenceSourceId: referenceSourceTags.referenceSourceId })
          .from(referenceSourceTags)
          .innerJoin(referenceTags, eq(referenceSourceTags.tagId, referenceTags.id))
          .where(eq(referenceTags.name, filters.tag.trim()));

        if (linkedReferences.length === 0) {
          return { items: [], total: 0 };
        }

        conditions.push(
          inArray(
            referenceSources.id,
            linkedReferences.map((link) => link.referenceSourceId),
          ),
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (filters.page - 1) * filters.limit;
      const [items, [totalResult]] = await Promise.all([
        db
          .select()
          .from(referenceSources)
          .where(where)
          .orderBy(desc(referenceSources.updatedAt), desc(referenceSources.createdAt))
          .limit(filters.limit)
          .offset(offset),
        db.select({ value: count() }).from(referenceSources).where(where),
      ]);

      return {
        items: await hydrateTags(items),
        total: totalResult?.value ?? 0,
      };
    },

    async findTags() {
      return db.select().from(referenceTags).orderBy(asc(referenceTags.name));
    },

    async findTagsByNames(names) {
      if (names.length === 0) return [];

      return db
        .select()
        .from(referenceTags)
        .where(inArray(referenceTags.name, names))
        .orderBy(asc(referenceTags.name));
    },

    async replaceReferenceTags(referenceId, tagIds, executor = db) {
      await executor
        .delete(referenceSourceTags)
        .where(eq(referenceSourceTags.referenceSourceId, referenceId));
      await this.attachTagsToReference(referenceId, tagIds, executor);
    },

    async updateReference(id, input, executor = db) {
      const [reference] = await executor
        .update(referenceSources)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(referenceSources.id, id))
        .returning();
      return reference ?? null;
    },
  };
};
