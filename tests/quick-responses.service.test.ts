import { describe, expect, test } from "bun:test";

import type {
  DatabaseExecutor,
  DatabaseTransactionManager,
} from "../src/db";
import type { QuickResponseSession } from "../src/db/schema";
import type { AuthUser } from "../src/modules/auth/auth.types";
import type { ComplaintsRepository } from "../src/modules/complaints/complaints.repository";
import type { ComplaintsService } from "../src/modules/complaints/complaints.service";
import type { QuickResponsesRepository } from "../src/modules/quick-responses/quick-responses.repository";
import type { QuickResponseReferencesService } from "../src/modules/quick-responses/quick-response-references.service";
import { createQuickResponsesService } from "../src/modules/quick-responses/quick-responses.service";
import type { StableQuickResponseOutcome } from "../src/modules/quick-responses/quick-responses.types";
import type { TicketsService } from "../src/modules/tickets/tickets.service";

const agent: AuthUser = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "Agent One",
  email: "agent1@access.test",
  role: "agent",
};
const now = new Date("2026-06-15T10:00:00.000Z");

const inputFor = (outcome: StableQuickResponseOutcome) => ({
  complaint: {
    complaintText: "Kereta terlambat dua jam tanpa pemberitahuan.",
    source: "app_store" as const,
    category: "delay" as const,
  },
  response: {
    responseTarget: "app_review" as const,
    finalResponse: outcome === "copy_only" ? null : "Mohon maaf atas kendala.",
    outcome,
  },
});

describe("quick responses service", () => {
  test.each([
    ["sent_resolved", "resolved", false],
    ["sent_hea_action", "waiting_action", true],
    ["copy_only", "submitted", false],
  ] as const)(
    "maps %s to complaint status %s inside one transaction",
    async (outcome, expectedStatus, requiresFollowUp) => {
      let transactionCount = 0;
      let createdStatus = "";
      let createdSessionOutcome = "";
      let createdSessionTicketId: string | null | undefined;
      let createdTicketComplaintId = "";
      const transactionManager: DatabaseTransactionManager = {
        async transaction(callback) {
          transactionCount += 1;
          return callback({} as DatabaseExecutor);
        },
      };
      const complaintsService = {
        async createComplaint(input) {
          createdStatus = input.status ?? "";
          return {
            id: "10000000-0000-4000-8000-000000000001",
            referenceNo: "ACC-20260615-TEST",
            trackingToken: "trk_test",
            source: input.source ?? "other",
            sourceHandle: null,
            category: input.category,
            complaintText: input.complaintText,
            status: input.status ?? "submitted",
            submittedAt: now.toISOString(),
            resolvedAt: input.resolvedAt?.toISOString() ?? null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };
        },
      } as ComplaintsService;
      const repository = {
        async createQuickResponseSession(input) {
          createdSessionOutcome = input.outcome;
          createdSessionTicketId = input.ticketId;
          return {
            ...input,
            id: "20000000-0000-4000-8000-000000000001",
            ticketId: input.ticketId ?? null,
            createdAt: now,
            updatedAt: now,
          } as QuickResponseSession;
        },
        async findSessionsByComplaintId() {
          return [];
        },
      } as QuickResponsesRepository;
      const ticketsService = {
        async createTicketFromComplaint(input) {
          createdTicketComplaintId = input.complaintId;
          return {
            id: "30000000-0000-4000-8000-000000000001",
            complaintId: input.complaintId,
            agentId: input.agentId,
            status: "hea_sent",
            priority: "medium",
            heaResponse: input.heaResponse,
            heaSentAt: input.heaSentAt ?? now,
            closureMessage: null,
            closureSentAt: null,
            createdAt: now,
            updatedAt: now,
          };
        },
      } as TicketsService;
      const service = createQuickResponsesService(
        transactionManager,
        complaintsService,
        {} as ComplaintsRepository,
        repository,
        ticketsService,
      );

      const result = await service.saveQuickResponse(inputFor(outcome), agent);

      expect(transactionCount).toBe(1);
      expect(createdStatus).toBe(expectedStatus);
      expect(createdSessionOutcome).toBe(outcome);
      expect(result.requiresFollowUp).toBe(requiresFollowUp);
      expect(result.ticket?.id ?? null).toBe(
        outcome === "sent_hea_action"
          ? "30000000-0000-4000-8000-000000000001"
          : null,
      );
      expect(createdSessionTicketId ?? null).toBe(
        outcome === "sent_hea_action"
          ? "30000000-0000-4000-8000-000000000001"
          : null,
      );
      expect(createdTicketComplaintId).toBe(
        outcome === "sent_hea_action"
          ? "10000000-0000-4000-8000-000000000001"
          : "",
      );
    },
  );

  test("rejects managers and missing final responses for sent outcomes", async () => {
    const transactionManager: DatabaseTransactionManager = {
      transaction: async () => {
        throw new Error("transaction should not run");
      },
    };
    const service = createQuickResponsesService(
      transactionManager,
      {} as ComplaintsService,
      {} as ComplaintsRepository,
      {} as QuickResponsesRepository,
      {} as TicketsService,
    );

    await expect(
      service.saveQuickResponse(inputFor("copy_only"), {
        ...agent,
        role: "manager",
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "QUICK_RESPONSE_SAVE_FORBIDDEN",
    });
    await expect(
      service.saveQuickResponse(
        {
          ...inputFor("sent_resolved"),
          response: {
            ...inputFor("sent_resolved").response,
            finalResponse: "   ",
          },
        },
        agent,
      ),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: "FINAL_RESPONSE_REQUIRED",
    });
  });

  test("rejects an existing complaint quick response when the ticket belongs to another agent", async () => {
    let sessionWasCreated = false;
    const transactionManager: DatabaseTransactionManager = {
      async transaction(callback) {
        return callback({} as DatabaseExecutor);
      },
    };
    const complaintsRepository = {
      async findComplaintById() {
        return {
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
      },
    } as unknown as ComplaintsRepository;
    const repository = {
      async createQuickResponseSession() {
        sessionWasCreated = true;
        throw new Error("session should not be created");
      },
    } as unknown as QuickResponsesRepository;
    const ticketsService = {
      async findTicketById() {
        return {
          id: "30000000-0000-4000-8000-000000000001",
          complaintId: "10000000-0000-4000-8000-000000000001",
          agentId: "00000000-0000-4000-8000-000000000005",
          status: "manager_action_done",
          priority: "medium",
          heaResponse: "Mohon maaf atas kendala.",
          heaSentAt: now,
          closureMessage: null,
          closureSentAt: null,
          createdAt: now,
          updatedAt: now,
        };
      },
      assertCanAccessTicket() {
        throw Object.assign(new Error("Ticket not found"), {
          statusCode: 404,
          code: "TICKET_NOT_FOUND",
        });
      },
    } as unknown as TicketsService;
    const service = createQuickResponsesService(
      transactionManager,
      {} as ComplaintsService,
      complaintsRepository,
      repository,
      ticketsService,
    );

    await expect(
      service.saveQuickResponseForComplaint(
        "10000000-0000-4000-8000-000000000001",
        {
          ticketId: "30000000-0000-4000-8000-000000000001",
          responseTarget: "app_review",
          finalResponse: null,
          outcome: "copy_only",
        },
        agent,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "TICKET_NOT_FOUND",
    });
    expect(sessionWasCreated).toBe(false);
  });

  test("requires ticketId when saving quick response references", async () => {
    let sessionWasCreated = false;
    const transactionManager: DatabaseTransactionManager = {
      async transaction(callback) {
        return callback({} as DatabaseExecutor);
      },
    };
    const complaintsRepository = {
      async findComplaintById() {
        return {
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
      },
    } as unknown as ComplaintsRepository;
    const repository = {
      async createQuickResponseSession() {
        sessionWasCreated = true;
        throw new Error("session should not be created");
      },
    } as unknown as QuickResponsesRepository;
    const service = createQuickResponsesService(
      transactionManager,
      {} as ComplaintsService,
      complaintsRepository,
      repository,
      {} as TicketsService,
    );

    await expect(
      service.saveQuickResponseForComplaint(
        "10000000-0000-4000-8000-000000000001",
        {
          responseTarget: "app_review",
          finalResponse: null,
          outcome: "copy_only",
          references: [
            {
              referenceSourceId: "50000000-0000-4000-8000-000000000001",
              usageType: "closure_support",
            },
          ],
        },
        agent,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "QUICK_RESPONSE_REFERENCE_TICKET_REQUIRED",
    });
    expect(sessionWasCreated).toBe(false);
  });

  test("saves quick response references after validating closure context", async () => {
    let createdRows: unknown[] = [];
    let usageActionRequestId = "";
    let usageSessionId = "";
    const transactionManager: DatabaseTransactionManager = {
      async transaction(callback) {
        return callback({ tx: true } as unknown as DatabaseExecutor);
      },
    };
    const complaintsRepository = {
      async findComplaintById() {
        return {
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
      },
    } as unknown as ComplaintsRepository;
    const repository = {
      async createQuickResponseSession(
        input: Parameters<
          QuickResponsesRepository["createQuickResponseSession"]
        >[0],
      ) {
        return {
          ...input,
          id: "20000000-0000-4000-8000-000000000001",
          ticketId: input.ticketId ?? null,
          createdAt: now,
          updatedAt: now,
        } as QuickResponseSession;
      },
    } as unknown as QuickResponsesRepository;
    const ticketsService = {
      async findTicketById() {
        return {
          id: "30000000-0000-4000-8000-000000000001",
          complaintId: "10000000-0000-4000-8000-000000000001",
          agentId: agent.id,
          status: "manager_action_done",
          priority: "medium",
          heaResponse: "Mohon maaf atas kendala.",
          heaSentAt: now,
          closureMessage: null,
          closureSentAt: null,
          createdAt: now,
          updatedAt: now,
        };
      },
      assertCanAccessTicket() {},
      async getClosureContext() {
        return {
          actionRequest: {
            id: "40000000-0000-4000-8000-000000000001",
          },
        };
      },
    } as unknown as TicketsService;
    const quickResponseReferencesService = {
      async buildReferenceUsageRows(
        input: Parameters<
          QuickResponseReferencesService["buildReferenceUsageRows"]
        >[0],
      ) {
        usageActionRequestId = input.actionRequestId;
        usageSessionId = input.quickResponseSessionId;
        return [
          {
            quickResponseSessionId: input.quickResponseSessionId,
            referenceSourceId: input.references[0]?.referenceSourceId ?? "",
            referencedBy: input.currentUser.id,
            selectionSource: "manager_attached",
            usageType: input.references[0]?.usageType ?? "closure_support",
            snapshotText: "SOP Refund",
          },
        ];
      },
      async createReferenceUsage(
        rows: Parameters<
          QuickResponseReferencesService["createReferenceUsage"]
        >[0],
      ) {
        createdRows = rows;
      },
    } as unknown as QuickResponseReferencesService;
    const service = createQuickResponsesService(
      transactionManager,
      {} as ComplaintsService,
      complaintsRepository,
      repository,
      ticketsService,
      quickResponseReferencesService,
    );

    const result = await service.saveQuickResponseForComplaint(
      "10000000-0000-4000-8000-000000000001",
      {
        ticketId: "30000000-0000-4000-8000-000000000001",
        responseTarget: "app_review",
        finalResponse: null,
        outcome: "copy_only",
        references: [
          {
            referenceSourceId: "50000000-0000-4000-8000-000000000001",
            selectionSource: "manager_attached",
            usageType: "closure_support",
          },
        ],
      },
      agent,
    );

    expect(result.quickResponseSession.id).toBe(
      "20000000-0000-4000-8000-000000000001",
    );
    expect(usageActionRequestId).toBe(
      "40000000-0000-4000-8000-000000000001",
    );
    expect(usageSessionId).toBe("20000000-0000-4000-8000-000000000001");
    expect(createdRows).toHaveLength(1);
  });
});
