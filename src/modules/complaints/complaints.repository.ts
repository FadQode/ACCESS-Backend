import {
  and,
  count,
  desc,
  eq,
  ilike,
  or,
  type SQL,
} from "drizzle-orm";

import type { Database, DatabaseExecutor } from "../../db";
import { complaints, quickResponseSessions, users } from "../../db/schema";
import type {
  ComplaintFilters,
  CreateComplaintInput,
  UpdateComplaintInput,
} from "./complaints.types";

export interface ComplaintsRepository {
  createComplaint(
    input: CreateComplaintInput & {
      referenceNo: string;
      trackingToken: string;
    },
    executor?: DatabaseExecutor,
  ): Promise<typeof complaints.$inferSelect>;
  findComplaints(filters: Required<Pick<ComplaintFilters, "page" | "limit">> & ComplaintFilters): Promise<{
    items: Array<typeof complaints.$inferSelect>;
    total: number;
  }>;
  findComplaintById(
    id: string,
    executor?: DatabaseExecutor,
  ): Promise<typeof complaints.$inferSelect | null>;
  findComplaintDetailById(id: string): Promise<{
    complaint: typeof complaints.$inferSelect;
    quickResponseSessions: Array<{
      id: string;
      agentId: string;
      agentName: string;
      agentEmail: string;
      sourceChannel: typeof quickResponseSessions.$inferSelect.sourceChannel;
      sourceHandle: string | null;
      responseTone: string | null;
      responseTarget: typeof quickResponseSessions.$inferSelect.responseTarget;
      selectedHear: string | null;
      selectedEmpathize: string | null;
      selectedApologize: string | null;
      selectedTakeAction: string | null;
      finalResponse: string | null;
      outcome: typeof quickResponseSessions.$inferSelect.outcome;
      createdAt: Date;
      updatedAt: Date;
    }>;
  } | null>;
  isReferenceNoInUse(
    referenceNo: string,
    executor?: DatabaseExecutor,
  ): Promise<boolean>;
  updateComplaint(
    id: string,
    input: UpdateComplaintInput,
  ): Promise<typeof complaints.$inferSelect | null>;
  updateComplaintStatus(
    id: string,
    status: typeof complaints.$inferSelect.status,
    resolvedAt: Date | null,
    executor?: DatabaseExecutor,
  ): Promise<typeof complaints.$inferSelect | null>;
}

export const createComplaintsRepository = (
  db: Database,
): ComplaintsRepository => ({
  async createComplaint(input, executor = db) {
    const [createdComplaint] = await executor
      .insert(complaints)
      .values({
        ...input,
        source: input.source ?? "other",
        status: input.status ?? "submitted",
      })
      .returning();

    if (!createdComplaint) {
      throw new Error("Complaint insert returned no row");
    }

    return createdComplaint;
  },

  async findComplaints(filters) {
    const conditions: SQL[] = [];

    if (filters.status) conditions.push(eq(complaints.status, filters.status));
    if (filters.category) {
      conditions.push(eq(complaints.category, filters.category));
    }
    if (filters.source) conditions.push(eq(complaints.source, filters.source));
    if (filters.search?.trim()) {
      const pattern = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(complaints.complaintText, pattern),
          ilike(complaints.referenceNo, pattern),
          ilike(complaints.sourceHandle, pattern),
          ilike(complaints.complainerName, pattern),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.limit;
    const [items, [totalResult]] = await Promise.all([
      db
        .select()
        .from(complaints)
        .where(where)
        .orderBy(desc(complaints.submittedAt), desc(complaints.createdAt))
        .limit(filters.limit)
        .offset(offset),
      db.select({ value: count() }).from(complaints).where(where),
    ]);

    return { items, total: totalResult?.value ?? 0 };
  },

  async findComplaintById(id, executor = db) {
    const [complaint] = await executor
      .select()
      .from(complaints)
      .where(eq(complaints.id, id))
      .limit(1);
    return complaint ?? null;
  },

  async findComplaintDetailById(id) {
    const [complaint] = await db
      .select()
      .from(complaints)
      .where(eq(complaints.id, id))
      .limit(1);

    if (!complaint) return null;

    const sessions = await db
      .select({
        id: quickResponseSessions.id,
        agentId: users.id,
        agentName: users.name,
        agentEmail: users.email,
        sourceChannel: quickResponseSessions.sourceChannel,
        sourceHandle: quickResponseSessions.sourceHandle,
        responseTone: quickResponseSessions.responseTone,
        responseTarget: quickResponseSessions.responseTarget,
        selectedHear: quickResponseSessions.selectedHear,
        selectedEmpathize: quickResponseSessions.selectedEmpathize,
        selectedApologize: quickResponseSessions.selectedApologize,
        selectedTakeAction: quickResponseSessions.selectedTakeAction,
        finalResponse: quickResponseSessions.finalResponse,
        outcome: quickResponseSessions.outcome,
        createdAt: quickResponseSessions.createdAt,
        updatedAt: quickResponseSessions.updatedAt,
      })
      .from(quickResponseSessions)
      .innerJoin(users, eq(quickResponseSessions.agentId, users.id))
      .where(eq(quickResponseSessions.complaintId, id))
      .orderBy(desc(quickResponseSessions.createdAt));

    return { complaint, quickResponseSessions: sessions };
  },

  async isReferenceNoInUse(referenceNo, executor = db) {
    const [result] = await executor
      .select({ id: complaints.id })
      .from(complaints)
      .where(eq(complaints.referenceNo, referenceNo))
      .limit(1);
    return Boolean(result);
  },

  async updateComplaint(id, input) {
    const [updatedComplaint] = await db
      .update(complaints)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(complaints.id, id))
      .returning();
    return updatedComplaint ?? null;
  },

  async updateComplaintStatus(id, status, resolvedAt, executor = db) {
    const [updatedComplaint] = await executor
      .update(complaints)
      .set({ status, resolvedAt, updatedAt: new Date() })
      .where(eq(complaints.id, id))
      .returning();
    return updatedComplaint ?? null;
  },
});
