import { desc, eq } from "drizzle-orm";

import type { Database, DatabaseExecutor } from "../../db";
import { quickResponseSessions } from "../../db/schema";
import type { CreateQuickResponseSessionInput } from "./quick-responses.types";

export interface QuickResponsesRepository {
  createQuickResponseSession(
    input: CreateQuickResponseSessionInput,
    executor?: DatabaseExecutor,
  ): Promise<typeof quickResponseSessions.$inferSelect>;
  findSessionsByComplaintId(
    complaintId: string,
  ): Promise<Array<typeof quickResponseSessions.$inferSelect>>;
}

export const createQuickResponsesRepository = (
  db: Database,
): QuickResponsesRepository => ({
  async createQuickResponseSession(input, executor = db) {
    const [createdSession] = await executor
      .insert(quickResponseSessions)
      .values({ ...input, ticketId: null })
      .returning();

    if (!createdSession) {
      throw new Error("Quick response insert returned no row");
    }

    return createdSession;
  },

  async findSessionsByComplaintId(complaintId) {
    return db
      .select()
      .from(quickResponseSessions)
      .where(eq(quickResponseSessions.complaintId, complaintId))
      .orderBy(desc(quickResponseSessions.createdAt));
  },
});
