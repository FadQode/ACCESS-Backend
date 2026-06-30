import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import type { Database, DatabaseExecutor } from "../../db";
import {
  actionRequestComplaints,
  actionRequests,
  complaints,
  tickets,
} from "../../db/schema";
import type {
  ActionRequestFilters,
  ActionRequestLinkInput,
  CreateActionRequestInput,
} from "./action-requests.types";

export interface ActionRequestsRepository {
  createActionRequest(
    input: CreateActionRequestInput,
    executor?: DatabaseExecutor,
  ): Promise<typeof actionRequests.$inferSelect>;
  findActionRequestById(
    id: string,
    executor?: DatabaseExecutor,
  ): Promise<typeof actionRequests.$inferSelect | null>;
  findActionRequestDetailById(id: string): Promise<{
    actionRequest: typeof actionRequests.$inferSelect;
    linkedComplaints: Array<typeof actionRequestComplaints.$inferSelect & {
      complaintText: string;
      ticketStatus: typeof tickets.$inferSelect.status | null;
    }>;
  } | null>;
  findActionRequests(filters: Required<Pick<ActionRequestFilters, "page" | "limit">> & ActionRequestFilters): Promise<{
    items: Array<typeof actionRequests.$inferSelect>;
    total: number;
  }>;
  findActiveActionRequestByGroupingKey(
    groupingKey: string,
    withinDays: number,
    executor?: DatabaseExecutor,
  ): Promise<typeof actionRequests.$inferSelect | null>;
  linkComplaintToActionRequest(
    input: ActionRequestLinkInput,
    executor?: DatabaseExecutor,
  ): Promise<typeof actionRequestComplaints.$inferSelect>;
  findLinkedComplaints(
    actionRequestId: string,
  ): Promise<Array<typeof actionRequestComplaints.$inferSelect>>;
  updateActionRequest(
    id: string,
    input: {
      status?: typeof actionRequests.$inferSelect.status;
      actionTaken?: string | null;
      closureMessage?: string | null;
      resolvedAt?: Date | null;
    },
    executor?: DatabaseExecutor,
  ): Promise<typeof actionRequests.$inferSelect | null>;
  updateLinkedTicketsStatus(
    actionRequestId: string,
    status: typeof tickets.$inferSelect.status,
    executor?: DatabaseExecutor,
  ): Promise<number>;
}

export const createActionRequestsRepository = (
  db: Database,
): ActionRequestsRepository => ({
  async createActionRequest(input, executor = db) {
    const [request] = await executor
      .insert(actionRequests)
      .values(input)
      .returning();

    if (!request) throw new Error("Action request insert returned no row");
    return request;
  },

  async findActionRequestById(id, executor = db) {
    const [request] = await executor
      .select()
      .from(actionRequests)
      .where(eq(actionRequests.id, id))
      .limit(1);
    return request ?? null;
  },

  async findActionRequestDetailById(id) {
    const [actionRequest] = await db
      .select()
      .from(actionRequests)
      .where(eq(actionRequests.id, id))
      .limit(1);

    if (!actionRequest) return null;

    const linkedComplaints = await db
      .select({
        id: actionRequestComplaints.id,
        actionRequestId: actionRequestComplaints.actionRequestId,
        complaintId: actionRequestComplaints.complaintId,
        ticketId: actionRequestComplaints.ticketId,
        agentId: actionRequestComplaints.agentId,
        linkedAt: actionRequestComplaints.linkedAt,
        complaintText: complaints.complaintText,
        ticketStatus: tickets.status,
      })
      .from(actionRequestComplaints)
      .innerJoin(
        complaints,
        eq(actionRequestComplaints.complaintId, complaints.id),
      )
      .leftJoin(tickets, eq(actionRequestComplaints.ticketId, tickets.id))
      .where(eq(actionRequestComplaints.actionRequestId, id))
      .orderBy(desc(actionRequestComplaints.linkedAt));

    return { actionRequest, linkedComplaints };
  },

  async findActionRequests(filters) {
    const conditions: SQL[] = [];

    if (filters.status) conditions.push(eq(actionRequests.status, filters.status));
    if (filters.category) conditions.push(eq(actionRequests.category, filters.category));
    if (filters.search?.trim()) {
      const pattern = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(actionRequests.referenceNo, pattern),
          ilike(actionRequests.clusterLabel, pattern),
          ilike(actionRequests.issueSummary, pattern),
          ilike(actionRequests.issueKey, pattern),
          ilike(actionRequests.groupingKey, pattern),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.limit;
    const [items, [totalResult]] = await Promise.all([
      db
        .select()
        .from(actionRequests)
        .where(where)
        .orderBy(desc(actionRequests.raisedAt))
        .limit(filters.limit)
        .offset(offset),
      db.select({ value: count() }).from(actionRequests).where(where),
    ]);

    return { items, total: totalResult?.value ?? 0 };
  },

  async findActiveActionRequestByGroupingKey(groupingKey, withinDays, executor = db) {
    const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
    const [request] = await executor
      .select()
      .from(actionRequests)
      .where(
        and(
          eq(actionRequests.groupingKey, groupingKey),
          inArray(actionRequests.status, ["open", "reviewing", "action_planned"]),
          or(
            eq(actionRequests.status, "action_planned"),
            gte(actionRequests.raisedAt, since),
          )!,
        ),
      )
      .orderBy(desc(actionRequests.raisedAt))
      .limit(1);
    return request ?? null;
  },

  async linkComplaintToActionRequest(input, executor = db) {
    const [link] = await executor
      .insert(actionRequestComplaints)
      .values(input)
      .onConflictDoUpdate({
        target: [
          actionRequestComplaints.actionRequestId,
          actionRequestComplaints.complaintId,
        ],
        set: {
          ticketId: input.ticketId,
          agentId: input.agentId,
        },
      })
      .returning();

    if (!link) throw new Error("Action request link insert returned no row");
    return link;
  },

  async findLinkedComplaints(actionRequestId) {
    return db
      .select()
      .from(actionRequestComplaints)
      .where(eq(actionRequestComplaints.actionRequestId, actionRequestId));
  },

  async updateActionRequest(id, input, executor = db) {
    const [request] = await executor
      .update(actionRequests)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(actionRequests.id, id))
      .returning();
    return request ?? null;
  },

  async updateLinkedTicketsStatus(actionRequestId, status, executor = db) {
    const linkedTickets = await executor
      .select({ ticketId: actionRequestComplaints.ticketId })
      .from(actionRequestComplaints)
      .where(eq(actionRequestComplaints.actionRequestId, actionRequestId));
    const ticketIds = linkedTickets
      .map((link) => link.ticketId)
      .filter((ticketId): ticketId is string => Boolean(ticketId));

    if (ticketIds.length === 0) return 0;

    const updated = await executor
      .update(tickets)
      .set({ status, updatedAt: new Date() })
      .where(inArray(tickets.id, ticketIds))
      .returning({ id: tickets.id });
    return updated.length;
  },
});
