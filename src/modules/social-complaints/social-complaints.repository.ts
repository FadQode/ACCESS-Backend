import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";

import type { Database, DatabaseExecutor } from "../../db";
import {
  socialComplaints,
  type NewSocialComplaint,
  type SocialComplaint,
} from "../../db/schema";
import type { SocialComplaintFilters } from "./social-complaints.types";

export interface SocialComplaintsRepository {
  findSocialComplaints(
    filters: Required<Pick<SocialComplaintFilters, "page" | "limit">> &
      SocialComplaintFilters,
  ): Promise<{ items: SocialComplaint[]; total: number }>;
  findSocialComplaintById(id: string): Promise<SocialComplaint | null>;
  findExistingSourceReferences(
    source: SocialComplaint["source"],
    references: string[],
  ): Promise<Set<string>>;
  insertSocialComplaints(
    rows: NewSocialComplaint[],
    executor?: DatabaseExecutor,
  ): Promise<{ created: number; skipped: number }>;
}

export const createSocialComplaintsRepository = (
  db: Database,
): SocialComplaintsRepository => ({
  async findSocialComplaints(filters) {
    const conditions: SQL[] = [];
    if (filters.source) {
      conditions.push(eq(socialComplaints.source, filters.source));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.limit;
    const [items, [totalResult]] = await Promise.all([
      db
        .select()
        .from(socialComplaints)
        .where(where)
        .orderBy(
          desc(socialComplaints.publishedAt),
          desc(socialComplaints.createdAt),
        )
        .limit(filters.limit)
        .offset(offset),
      db.select({ value: count() }).from(socialComplaints).where(where),
    ]);

    return { items, total: totalResult?.value ?? 0 };
  },

  async findSocialComplaintById(id) {
    const [socialComplaint] = await db
      .select()
      .from(socialComplaints)
      .where(eq(socialComplaints.id, id))
      .limit(1);
    return socialComplaint ?? null;
  },

  async findExistingSourceReferences(source, references) {
    if (references.length === 0) return new Set();

    const rows = await db
      .select({ sourceReference: socialComplaints.sourceReference })
      .from(socialComplaints)
      .where(
        and(
          eq(socialComplaints.source, source),
          inArray(socialComplaints.sourceReference, references),
        ),
      );

    return new Set(rows.map((row) => row.sourceReference));
  },

  async insertSocialComplaints(rows, executor = db) {
    if (rows.length === 0) return { created: 0, skipped: 0 };

    const inserted = await executor
      .insert(socialComplaints)
      .values(rows)
      .onConflictDoNothing({
        target: [socialComplaints.source, socialComplaints.sourceReference],
      })
      .returning({ id: socialComplaints.id });

    return {
      created: inserted.length,
      skipped: rows.length - inserted.length,
    };
  },
});
