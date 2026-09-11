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
import type { ActionRequestReferencesRepository } from "../src/modules/action-requests/action-request-references.repository";
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
  socialComplaintId: null,
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
  actionRequestId: null,
  actionTaken: null,
  managerClosureMessage: null,
  ...input,
});

const closureContextRecord = (
  input: Partial<
    Awaited<ReturnType<TicketsRepository["findTicketClosureContextById"]>>
  > = {},
) => ({
  ticketId: ticket.id,
  ticketAgentId: ticket.agentId,
  ticketStatus: "manager_action_done" as const,
  ticketPriority: "medium" as const,
  complaintId: complaint.id,
  complaintReferenceNo: complaint.referenceNo,
  complaintCategory: complaint.category,
  complaintText: complaint.complaintText,
  complaintStatus: complaint.status,
  actionRequestId: "40000000-0000-4000-8000-000000000001",
  actionRequestReferenceNo: "AR-2026-TEST",
  actionRequestClusterLabel: "Payment failed after customer was charged",
  actionRequestActionTaken: "Refund sudah disetujui manager.",
  actionRequestClosureMessage:
    "Sampaikan bahwa refund akan masuk maksimal 1x24 jam.",
  actionRequestStatus: "action_taken" as const,
  ...input,
});

const actionRequestReferenceLink = {
  id: "60000000-0000-4000-8000-000000000001",
  actionRequestId: "40000000-0000-4000-8000-000000000001",
  referenceSourceId: "50000000-0000-4000-8000-000000000001",
  attachedBy: manager.id,
  attachedByEmail: manager.email,
  attachedByName: manager.name,
  usageType: "closure_support",
  snapshotText: "SOP Refund - Refund saldo terpotong.",
  note: null,
  createdAt: now,
  referenceSource: {
    id: "50000000-0000-4000-8000-000000000001",
    title: "SOP Refund",
    sourceType: "sop",
    category: "payment",
    content: "Refund saldo terpotong.",
    url: null,
    fileUrl: null,
    storageProvider: null,
    storageKey: null,
    fileName: null,
    fileMimeType: null,
    fileSize: null,
    status: "active",
  },
} as const;

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

  test("includes manager action guidance in ticket lists", async () => {
    const ticketsRepository = {
      async findTickets() {
        return {
          items: [
            ticketRecord({
              status: "manager_action_done",
              actionRequestId: "40000000-0000-4000-8000-000000000001",
              actionTaken: "Refund sudah disetujui manager.",
              managerClosureMessage:
                "Sampaikan bahwa refund akan masuk maksimal 1x24 jam.",
            }),
          ],
          total: 1,
        };
      },
    } as unknown as TicketsRepository;
    const service = createTicketsService(
      createTransactionManager(),
      ticketsRepository,
      {} as ComplaintsRepository,
      {} as ActionRequestsService,
    );

    const result = await service.listTickets({}, agentA);

    expect(result.items[0]?.managerAction).toEqual({
      actionRequestId: "40000000-0000-4000-8000-000000000001",
      actionTaken: "Refund sudah disetujui manager.",
      closureMessage: "Sampaikan bahwa refund akan masuk maksimal 1x24 jam.",
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

  test("includes manager action guidance in ticket detail", async () => {
    const ticketsRepository = {
      async findTicketDetailById() {
        return ticketRecord({
          status: "manager_action_done",
          actionRequestId: "40000000-0000-4000-8000-000000000001",
          actionTaken: "Tim operasional sudah memproses kompensasi.",
          managerClosureMessage:
            "Minta pelanggan mengecek notifikasi kompensasi di aplikasi.",
        });
      },
    } as unknown as TicketsRepository;
    const service = createTicketsService(
      createTransactionManager(),
      ticketsRepository,
      {} as ComplaintsRepository,
      {} as ActionRequestsService,
    );

    const result = await service.getTicketDetail(ticket.id, agentA);

    expect(result.managerAction).toEqual({
      actionRequestId: "40000000-0000-4000-8000-000000000001",
      actionTaken: "Tim operasional sudah memproses kompensasi.",
      closureMessage: "Minta pelanggan mengecek notifikasi kompensasi di aplikasi.",
    });
  });

  test("returns closure context with manager-attached references for agents", async () => {
    const ticketsRepository = {
      async findTicketClosureContextById() {
        return closureContextRecord();
      },
    } as unknown as TicketsRepository;
    const actionRequestReferencesRepository = {
      async findActionRequestReferences(actionRequestId: string) {
        expect(actionRequestId).toBe(actionRequestReferenceLink.actionRequestId);
        return [actionRequestReferenceLink];
      },
    } as unknown as ActionRequestReferencesRepository;
    const service = createTicketsService(
      createTransactionManager(),
      ticketsRepository,
      {} as ComplaintsRepository,
      {} as ActionRequestsService,
      actionRequestReferencesRepository,
    );

    const result = await service.getClosureContext(ticket.id, agentA);

    expect(result.ticket).toMatchObject({
      id: ticket.id,
      status: "manager_action_done",
    });
    expect(result.actionRequest).toMatchObject({
      id: actionRequestReferenceLink.actionRequestId,
      status: "action_taken",
    });
    expect(result.attachedReferences).toHaveLength(1);
    expect(result.attachedReferences[0]).toMatchObject({
      id: actionRequestReferenceLink.id,
      usageType: "closure_support",
      referenceSource: {
        id: actionRequestReferenceLink.referenceSourceId,
        title: "SOP Refund",
      },
    });
  });

  test("guards closure context by role, ownership, and ready statuses", async () => {
    const readyRepository = {
      async findTicketClosureContextById() {
        return closureContextRecord();
      },
    } as unknown as TicketsRepository;
    const service = createTicketsService(
      createTransactionManager(),
      readyRepository,
      {} as ComplaintsRepository,
      {} as ActionRequestsService,
    );

    await expect(service.getClosureContext(ticket.id, manager)).rejects.toMatchObject({
      statusCode: 403,
      code: "TICKET_CLOSURE_CONTEXT_FORBIDDEN",
    });
    await expect(service.getClosureContext(ticket.id, agentB)).rejects.toMatchObject({
      statusCode: 404,
      code: "TICKET_NOT_FOUND",
    });

    const pendingTicketService = createTicketsService(
      createTransactionManager(),
      {
        async findTicketClosureContextById() {
          return closureContextRecord({ ticketStatus: "hea_sent" });
        },
      } as unknown as TicketsRepository,
      {} as ComplaintsRepository,
      {} as ActionRequestsService,
    );
    await expect(
      pendingTicketService.getClosureContext(ticket.id, agentA),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "MANAGER_ACTION_NOT_COMPLETED",
    });

    const pendingActionService = createTicketsService(
      createTransactionManager(),
      {
        async findTicketClosureContextById() {
          return closureContextRecord({ actionRequestStatus: "reviewing" });
        },
      } as unknown as TicketsRepository,
      {} as ComplaintsRepository,
      {} as ActionRequestsService,
    );
    await expect(
      pendingActionService.getClosureContext(ticket.id, agentA),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "MANAGER_ACTION_NOT_COMPLETED",
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
