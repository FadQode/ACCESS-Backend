import { describe, expect, test } from "bun:test";

import type {
  Complaint,
  Ticket,
} from "../src/db/schema";
import type {
  DatabaseExecutor,
  DatabaseTransactionManager,
} from "../src/db";
import type { ActionRequestsService } from "../src/modules/action-requests/action-requests.service";
import type { AuthUser } from "../src/modules/auth/auth.types";
import type { ComplaintsRepository } from "../src/modules/complaints/complaints.repository";
import { createTicketsService } from "../src/modules/tickets/tickets.service";
import type {
  TicketJoinedRecord,
  TicketsRepository,
} from "../src/modules/tickets/tickets.repository";

const now = new Date("2026-06-15T10:00:00.000Z");
const executor = {} as DatabaseExecutor;
const agentA: AuthUser = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "Agent A",
  email: "agent-a@access.test",
  role: "agent",
};
const agentB: AuthUser = {
  id: "00000000-0000-4000-8000-000000000005",
  name: "Agent B",
  email: "agent-b@access.test",
  role: "agent",
};
const admin: AuthUser = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Admin",
  email: "admin@access.test",
  role: "admin",
};
const manager: AuthUser = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Manager",
  email: "manager@access.test",
  role: "manager",
};

const complaint: Complaint = {
  id: "10000000-0000-4000-8000-000000000001",
  referenceNo: "ACC-20260615-TEST",
  trackingToken: "trk_test",
  source: "app_store",
  sourceHandle: null,
  sourceUrl: null,
  complainerName: null,
  complainerContact: null,
  category: "payment",
  complaintText: "Saldo sudah terpotong tapi tiket tidak muncul.",
  status: "waiting_action",
  submittedAt: now,
  resolvedAt: null,
  createdAt: now,
  updatedAt: now,
};

const ticket: Ticket = {
  id: "30000000-0000-4000-8000-000000000001",
  complaintId: complaint.id,
  agentId: "00000000-0000-4000-8000-000000000004",
  status: "hea_sent",
  priority: "medium",
  heaResponse: "Mohon maaf atas kendala.",
  heaSentAt: now,
  closureMessage: null,
  closureSentAt: null,
  createdAt: now,
  updatedAt: now,
};

const ticketRecord = (input: Partial<TicketJoinedRecord> = {}): TicketJoinedRecord => ({
  id: ticket.id,
  complaintId: ticket.complaintId,
  agentId: ticket.agentId,
  status: ticket.status,
  priority: ticket.priority,
  heaResponse: ticket.heaResponse,
  heaSentAt: ticket.heaSentAt,
  closureMessage: ticket.closureMessage,
  closureSentAt: ticket.closureSentAt,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  category: complaint.category,
  complaintStatus: complaint.status,
  complaintText: complaint.complaintText,
  referenceNo: complaint.referenceNo,
  agentName: "Agent A",
  agentEmail: "agent-a@access.test",
  ...input,
});

const createTransactionManager = (): DatabaseTransactionManager => ({
  async transaction(callback) {
    return callback(executor);
  },
});

describe("tickets service", () => {
  test("creates a HEA ticket and immediately creates or reuses an action request", async () => {
    let createdTicketInput: Parameters<TicketsRepository["createTicket"]>[0] | null =
      null;
    const actionRequestCalls: Array<
      Parameters<ActionRequestsService["createOrReuseForTicket"]>[0]
    > = [];

    const ticketsRepository = {
      async findTicketByComplaintId() {
        return null;
      },
      async createTicket(input: Parameters<TicketsRepository["createTicket"]>[0]) {
        createdTicketInput = input;
        return ticket;
      },
    } as unknown as TicketsRepository;
    const complaintsRepository = {
      async findComplaintById(id: string) {
        expect(id).toBe(complaint.id);
        return complaint;
      },
    } as unknown as ComplaintsRepository;
    const actionRequestsService = {
      async createOrReuseForTicket(
        input: Parameters<ActionRequestsService["createOrReuseForTicket"]>[0],
      ) {
        actionRequestCalls.push(input);
        return {
          actionRequest: {
            id: "40000000-0000-4000-8000-000000000001",
            referenceNo: "AR-2026-TEST",
            category: input.complaint.category,
            issueKey: "payment_failed",
            groupingKey: "payment:payment_failed",
            clusterLabel: "Payment failed after customer was charged",
            status: "open",
            issueSummary: "Payment issue",
            raisedAt: now.toISOString(),
            resolvedAt: null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          },
          reused: false,
        };
      },
    } as unknown as ActionRequestsService;
    const service = createTicketsService(
      createTransactionManager(),
      ticketsRepository,
      complaintsRepository,
      actionRequestsService,
    );

    const result = await service.createTicketFromComplaint(
      {
        complaintId: complaint.id,
        agentId: ticket.agentId,
        heaResponse: ticket.heaResponse ?? "",
        heaSentAt: now,
      },
      executor,
    );

    expect(result).toBe(ticket);
    expect(createdTicketInput).toMatchObject({
      complaintId: complaint.id,
      agentId: ticket.agentId,
      status: "hea_sent",
      priority: "medium",
      heaResponse: ticket.heaResponse,
      heaSentAt: now,
    });
    expect(actionRequestCalls).toHaveLength(1);
    expect(actionRequestCalls[0]).toEqual({
      ticket,
      complaint,
      agentId: ticket.agentId,
    });
  });

  test("links an existing complaint ticket to an action request when the ticket already exists", async () => {
    let createTicketCalled = false;
    const actionRequestCalls: Array<
      Parameters<ActionRequestsService["createOrReuseForTicket"]>[0]
    > = [];

    const ticketsRepository = {
      async findTicketByComplaintId() {
        return ticket;
      },
      async createTicket() {
        createTicketCalled = true;
        return ticket;
      },
    } as unknown as TicketsRepository;
    const complaintsRepository = {
      async findComplaintById() {
        return complaint;
      },
    } as unknown as ComplaintsRepository;
    const actionRequestsService = {
      async createOrReuseForTicket(
        input: Parameters<ActionRequestsService["createOrReuseForTicket"]>[0],
      ) {
        actionRequestCalls.push(input);
        return {
          actionRequest: {
            id: "40000000-0000-4000-8000-000000000001",
            referenceNo: "AR-2026-TEST",
            category: input.complaint.category,
            issueKey: "payment_failed",
            groupingKey: "payment:payment_failed",
            clusterLabel: "Payment failed after customer was charged",
            status: "open",
            issueSummary: "Payment issue",
            raisedAt: now.toISOString(),
            resolvedAt: null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          },
          reused: true,
        };
      },
    } as unknown as ActionRequestsService;
    const service = createTicketsService(
      createTransactionManager(),
      ticketsRepository,
      complaintsRepository,
      actionRequestsService,
    );

    const result = await service.createTicketFromComplaint(
      {
        complaintId: complaint.id,
        agentId: ticket.agentId,
        heaResponse: ticket.heaResponse ?? "",
      },
      executor,
    );

    expect(result).toBe(ticket);
    expect(createTicketCalled).toBe(false);
    expect(actionRequestCalls).toHaveLength(1);
    expect(actionRequestCalls[0]).toEqual({
      ticket,
      complaint,
      agentId: ticket.agentId,
    });
  });

  test("forces agent ticket lists to the current user even when agentId is tampered", async () => {
    let receivedFilters: Parameters<TicketsRepository["findTickets"]>[0] | null =
      null;
    const ticketsRepository = {
      async findTickets(filters: Parameters<TicketsRepository["findTickets"]>[0]) {
        receivedFilters = filters;
        return { items: [], total: 0 };
      },
    } as unknown as TicketsRepository;
    const service = createTicketsService(
      createTransactionManager(),
      ticketsRepository,
      {} as ComplaintsRepository,
      {} as ActionRequestsService,
    );

    await service.listTickets(
      { agentId: agentB.id, page: 2, limit: 10 },
      agentA,
    );

    expect(receivedFilters).toMatchObject({
      agentId: agentA.id,
      page: 2,
      limit: 10,
    });
  });

  test("allows admin ticket lists to keep the requested agent filter", async () => {
    let receivedFilters: Parameters<TicketsRepository["findTickets"]>[0] | null =
      null;
    const ticketsRepository = {
      async findTickets(filters: Parameters<TicketsRepository["findTickets"]>[0]) {
        receivedFilters = filters;
        return { items: [], total: 0 };
      },
    } as unknown as TicketsRepository;
    const service = createTicketsService(
      createTransactionManager(),
      ticketsRepository,
      {} as ComplaintsRepository,
      {} as ActionRequestsService,
    );

    await service.listTickets({ agentId: agentB.id }, admin);

    expect(receivedFilters).toMatchObject({
      agentId: agentB.id,
      page: 1,
      limit: 20,
    });
  });

  test("does not trust agentId ticket list filters from managers", async () => {
    let receivedFilters: Parameters<TicketsRepository["findTickets"]>[0] | null =
      null;
    const ticketsRepository = {
      async findTickets(filters: Parameters<TicketsRepository["findTickets"]>[0]) {
        receivedFilters = filters;
        return { items: [], total: 0 };
      },
    } as unknown as TicketsRepository;
    const service = createTicketsService(
      createTransactionManager(),
      ticketsRepository,
      {} as ComplaintsRepository,
      {} as ActionRequestsService,
    );

    await service.listTickets({ agentId: agentB.id }, manager);

    expect(
      receivedFilters as unknown as Parameters<TicketsRepository["findTickets"]>[0],
    ).toEqual({
      page: 1,
      limit: 20,
    });
  });

  test("returns not found when an agent opens another agent's ticket detail", async () => {
    const ticketsRepository = {
      async findTicketDetailById() {
        return ticketRecord({ agentId: agentB.id });
      },
    } as unknown as TicketsRepository;
    const service = createTicketsService(
      createTransactionManager(),
      ticketsRepository,
      {} as ComplaintsRepository,
      {} as ActionRequestsService,
    );

    await expect(service.getTicketDetail(ticket.id, agentA)).rejects.toMatchObject({
      statusCode: 404,
      code: "TICKET_NOT_FOUND",
    });
    await expect(service.getTicketDetail(ticket.id, admin)).resolves.toMatchObject({
      id: ticket.id,
      agentId: agentB.id,
    });
  });

  test("returns not found when an agent escalates another agent's ticket", async () => {
    let complaintWasLoaded = false;
    const ticketsRepository = {
      async findTicketById() {
        return { ...ticket, agentId: agentB.id };
      },
    } as unknown as TicketsRepository;
    const complaintsRepository = {
      async findComplaintById() {
        complaintWasLoaded = true;
        return complaint;
      },
    } as unknown as ComplaintsRepository;
    const service = createTicketsService(
      createTransactionManager(),
      ticketsRepository,
      complaintsRepository,
      {} as ActionRequestsService,
    );

    await expect(service.escalateTicket(ticket.id, agentA)).rejects.toMatchObject({
      statusCode: 404,
      code: "TICKET_NOT_FOUND",
    });
    expect(complaintWasLoaded).toBe(false);
  });

  test("returns not found when an agent closes another agent's ticket", async () => {
    let closeTicketCalled = false;
    const ticketsRepository = {
      async findTicketById() {
        return {
          ...ticket,
          agentId: agentB.id,
          status: "manager_action_done" as const,
        };
      },
      async closeTicket() {
        closeTicketCalled = true;
        return null;
      },
    } as unknown as TicketsRepository;
    const service = createTicketsService(
      createTransactionManager(),
      ticketsRepository,
      {} as ComplaintsRepository,
      {} as ActionRequestsService,
    );

    await expect(
      service.closeTicketFromQuickResponse(
        {
          ticketId: ticket.id,
          complaintId: ticket.complaintId,
          closureMessage: "Sudah ditutup.",
        },
        agentA,
        executor,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "TICKET_NOT_FOUND",
    });
    expect(closeTicketCalled).toBe(false);
  });
});
