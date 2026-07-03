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
import {
  actionRequestComplaints,
  actionRequests,
  complaints,
  tickets,
  users,
} from "../../db/schema";
import type { CreateTicketInput, TicketFilters } from "./tickets.types";

export interface TicketJoinedRecord {
  id: string;
  complaintId: string;
  agentId: string | null;
  status: typeof tickets.$inferSelect.status;
  priority: typeof tickets.$inferSelect.priority;
  heaResponse: string | null;
  heaSentAt: Date | null;
  closureMessage: string | null;
  closureSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category: typeof complaints.$inferSelect.category;
  complaintStatus: typeof complaints.$inferSelect.status;
  complaintText: string;
  referenceNo: string;
  agentName: string | null;
  agentEmail: string | null;
  actionRequestId: string | null;
  actionTaken: string | null;
  managerClosureMessage: string | null;
}

export interface TicketClosureContextRecord {
  actionRequestActionTaken: string | null;
  actionRequestClosureMessage: string | null;
  actionRequestClusterLabel: string | null;
  actionRequestId: string | null;
  actionRequestReferenceNo: string | null;
  actionRequestStatus: typeof actionRequests.$inferSelect.status | null;
  complaintCategory: typeof complaints.$inferSelect.category;
  complaintId: string;
  complaintReferenceNo: string;
  complaintStatus: typeof complaints.$inferSelect.status;
  complaintText: string;
  ticketAgentId: string | null;
  ticketId: string;
  ticketPriority: typeof tickets.$inferSelect.priority;
  ticketStatus: typeof tickets.$inferSelect.status;
}

export interface TicketsRepository {
  createTicket(
    input: CreateTicketInput,
    executor?: DatabaseExecutor,
  ): Promise<typeof tickets.$inferSelect>;
  findTicketById(
    id: string,
    executor?: DatabaseExecutor,
  ): Promise<typeof tickets.$inferSelect | null>;
  findTicketByComplaintId(
    complaintId: string,
    executor?: DatabaseExecutor,
  ): Promise<typeof tickets.$inferSelect | null>;
  findTicketDetailById(id: string): Promise<TicketJoinedRecord | null>;
  findTicketClosureContextById(
    id: string,
  ): Promise<TicketClosureContextRecord | null>;
  findTickets(filters: Required<Pick<TicketFilters, "page" | "limit">> & TicketFilters): Promise<{
    items: TicketJoinedRecord[];
    total: number;
  }>;
  updateTicketStatus(
    id: string,
    status: typeof tickets.$inferSelect.status,
    executor?: DatabaseExecutor,
  ): Promise<typeof tickets.$inferSelect | null>;
  assignTicket(
    id: string,
    agentId: string | null,
    executor?: DatabaseExecutor,
  ): Promise<typeof tickets.$inferSelect | null>;
  closeTicket(
    id: string,
    closureMessage: string,
    executor?: DatabaseExecutor,
  ): Promise<typeof tickets.$inferSelect | null>;
}

const ticketJoinSelection = {
  id: tickets.id,
  complaintId: tickets.complaintId,
  agentId: tickets.agentId,
  status: tickets.status,
  priority: tickets.priority,
  heaResponse: tickets.heaResponse,
  heaSentAt: tickets.heaSentAt,
  closureMessage: tickets.closureMessage,
  closureSentAt: tickets.closureSentAt,
  createdAt: tickets.createdAt,
  updatedAt: tickets.updatedAt,
  category: complaints.category,
  complaintStatus: complaints.status,
  complaintText: complaints.complaintText,
  referenceNo: complaints.referenceNo,
  agentName: users.name,
  agentEmail: users.email,
  actionRequestId: actionRequests.id,
  actionTaken: actionRequests.actionTaken,
  managerClosureMessage: actionRequests.closureMessage,
};

export const createTicketsRepository = (db: Database): TicketsRepository => ({
  async createTicket(input, executor = db) {
    const [ticket] = await executor
      .insert(tickets)
      .values({
        complaintId: input.complaintId,
        agentId: input.agentId,
        status: input.status ?? "open",
        priority: input.priority ?? "medium",
        heaResponse: input.heaResponse ?? null,
        heaSentAt: input.heaSentAt ?? null,
      })
      .returning();

    if (!ticket) throw new Error("Ticket insert returned no row");
    return ticket;
  },

  async findTicketById(id, executor = db) {
    const [ticket] = await executor
      .select()
      .from(tickets)
      .where(eq(tickets.id, id))
      .limit(1);
    return ticket ?? null;
  },

  async findTicketByComplaintId(complaintId, executor = db) {
    const [ticket] = await executor
      .select()
      .from(tickets)
      .where(eq(tickets.complaintId, complaintId))
      .limit(1);
    return ticket ?? null;
  },

  async findTicketDetailById(id) {
    const [ticket] = await db
      .select(ticketJoinSelection)
      .from(tickets)
      .innerJoin(complaints, eq(tickets.complaintId, complaints.id))
      .leftJoin(users, eq(tickets.agentId, users.id))
      .leftJoin(
        actionRequestComplaints,
        eq(actionRequestComplaints.ticketId, tickets.id),
      )
      .leftJoin(
        actionRequests,
        eq(actionRequestComplaints.actionRequestId, actionRequests.id),
      )
      .where(eq(tickets.id, id))
      .limit(1);
    return ticket ?? null;
  },

  async findTicketClosureContextById(id) {
    const [context] = await db
      .select({
        ticketId: tickets.id,
        ticketAgentId: tickets.agentId,
        ticketStatus: tickets.status,
        ticketPriority: tickets.priority,
        complaintId: complaints.id,
        complaintReferenceNo: complaints.referenceNo,
        complaintCategory: complaints.category,
        complaintText: complaints.complaintText,
        complaintStatus: complaints.status,
        actionRequestId: actionRequests.id,
        actionRequestReferenceNo: actionRequests.referenceNo,
        actionRequestClusterLabel: actionRequests.clusterLabel,
        actionRequestActionTaken: actionRequests.actionTaken,
        actionRequestClosureMessage: actionRequests.closureMessage,
        actionRequestStatus: actionRequests.status,
      })
      .from(tickets)
      .innerJoin(complaints, eq(tickets.complaintId, complaints.id))
      .leftJoin(
        actionRequestComplaints,
        eq(actionRequestComplaints.ticketId, tickets.id),
      )
      .leftJoin(
        actionRequests,
        eq(actionRequestComplaints.actionRequestId, actionRequests.id),
      )
      .where(eq(tickets.id, id))
      .limit(1);
    return context ?? null;
  },

  async findTickets(filters) {
    const conditions: SQL[] = [];

    if (filters.status) conditions.push(eq(tickets.status, filters.status));
    if (filters.priority) conditions.push(eq(tickets.priority, filters.priority));
    if (filters.agentId) conditions.push(eq(tickets.agentId, filters.agentId));
    if (filters.category) conditions.push(eq(complaints.category, filters.category));
    if (filters.search?.trim()) {
      const pattern = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(complaints.complaintText, pattern),
          ilike(complaints.referenceNo, pattern),
          ilike(tickets.heaResponse, pattern),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.limit;
    const base = db
      .select(ticketJoinSelection)
      .from(tickets)
      .innerJoin(complaints, eq(tickets.complaintId, complaints.id))
      .leftJoin(users, eq(tickets.agentId, users.id))
      .leftJoin(
        actionRequestComplaints,
        eq(actionRequestComplaints.ticketId, tickets.id),
      )
      .leftJoin(
        actionRequests,
        eq(actionRequestComplaints.actionRequestId, actionRequests.id),
      )
      .where(where);

    const [items, [totalResult]] = await Promise.all([
      base.orderBy(desc(tickets.createdAt)).limit(filters.limit).offset(offset),
      db
        .select({ value: count() })
        .from(tickets)
        .innerJoin(complaints, eq(tickets.complaintId, complaints.id))
        .where(where),
    ]);

    return { items, total: totalResult?.value ?? 0 };
  },

  async updateTicketStatus(id, status, executor = db) {
    const [ticket] = await executor
      .update(tickets)
      .set({ status, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return ticket ?? null;
  },

  async assignTicket(id, agentId, executor = db) {
    const [ticket] = await executor
      .update(tickets)
      .set({ agentId, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return ticket ?? null;
  },

  async closeTicket(id, closureMessage, executor = db) {
    const [ticket] = await executor
      .update(tickets)
      .set({
        status: "closed",
        closureMessage,
        closureSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, id))
      .returning();
    return ticket ?? null;
  },
});
