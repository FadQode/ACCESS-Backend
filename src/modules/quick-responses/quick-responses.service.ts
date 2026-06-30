import type { DatabaseTransactionManager } from "../../db";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors";
import { normalizeOptionalText } from "../../shared/utils/normalize-text";
import type { AuthUser } from "../auth/auth.types";
import type { ComplaintsRepository } from "../complaints/complaints.repository";
import type { ComplaintsService } from "../complaints/complaints.service";
import type { ComplaintStatus } from "../complaints/complaints.types";
import type { TicketsService } from "../tickets/tickets.service";
import type { QuickResponsesRepository } from "./quick-responses.repository";
import type {
  SaveQuickResponseInput,
  StableQuickResponseOutcome,
} from "./quick-responses.types";

const statusByOutcome: Record<StableQuickResponseOutcome, ComplaintStatus> = {
  sent_resolved: "resolved",
  sent_hea_action: "waiting_action",
  copy_only: "submitted",
};

const iso = (date: Date): string => date.toISOString();
const nullableIso = (date: Date | null): string | null =>
  date ? date.toISOString() : null;

const assertCanSaveQuickResponse = (currentUser: AuthUser): void => {
  if (currentUser.role !== "agent" && currentUser.role !== "admin") {
    throw new ForbiddenError(
      "Managers cannot save quick responses",
      "QUICK_RESPONSE_SAVE_FORBIDDEN",
    );
  }
};

const normalizeFinalResponse = (input: SaveQuickResponseInput): string | null => {
  const finalResponse = normalizeOptionalText(input.response.finalResponse);
  if (input.response.outcome !== "copy_only" && !finalResponse) {
    throw new ValidationError(
      "Final response is required for sent outcomes",
      { field: "response.finalResponse" },
      "FINAL_RESPONSE_REQUIRED",
    );
  }

  return finalResponse;
};

export interface QuickResponsesService {
  saveQuickResponse(
    input: SaveQuickResponseInput,
    currentUser: AuthUser,
  ): Promise<{
    complaint: {
      id: string;
      referenceNo: string;
      status: ComplaintStatus;
      category: SaveQuickResponseInput["complaint"]["category"];
      complaintText: string;
      submittedAt: string;
      resolvedAt: string | null;
    };
    quickResponseSession: {
      id: string;
      outcome: StableQuickResponseOutcome;
      finalResponse: string | null;
      createdAt: string;
    };
    ticket: {
      id: string;
      status: string;
    } | null;
    requiresFollowUp: boolean;
  }>;
  saveQuickResponseForComplaint(
    complaintId: string,
    input: SaveQuickResponseInput["response"] & { ticketId?: string | null },
    currentUser: AuthUser,
  ): Promise<{
    quickResponseSession: {
      id: string;
      outcome: StableQuickResponseOutcome;
      finalResponse: string | null;
      createdAt: string;
    };
    ticket: {
      id: string;
      status: string;
    } | null;
    complaint: {
      id: string;
      status: ComplaintStatus;
      resolvedAt: string | null;
    };
  }>;
}

export const createQuickResponsesService = (
  transactionManager: DatabaseTransactionManager,
  complaintsService: ComplaintsService,
  complaintsRepository: ComplaintsRepository,
  repository: QuickResponsesRepository,
  ticketsService: TicketsService,
): QuickResponsesService => ({
  async saveQuickResponse(input, currentUser) {
    assertCanSaveQuickResponse(currentUser);
    const finalResponse = normalizeFinalResponse(input);

    return transactionManager.transaction(async (executor) => {
      const status = statusByOutcome[input.response.outcome];
      const complaint = await complaintsService.createComplaint(
        {
          ...input.complaint,
          status,
          resolvedAt: status === "resolved" ? new Date() : null,
        },
        executor,
      );
      const ticket =
        input.response.outcome === "sent_hea_action" && finalResponse
          ? await ticketsService.createTicketFromComplaint(
              {
                complaintId: complaint.id,
                agentId: currentUser.id,
                heaResponse: finalResponse,
                heaSentAt: new Date(),
              },
              executor,
            )
          : null;
      const session = await repository.createQuickResponseSession(
        {
          agentId: currentUser.id,
          complaintId: complaint.id,
          ticketId: ticket?.id ?? null,
          sourceChannel: input.complaint.source ?? "other",
          sourceHandle: normalizeOptionalText(input.complaint.sourceHandle),
          responseTone: normalizeOptionalText(input.response.responseTone),
          responseTarget: input.response.responseTarget,
          selectedHear: normalizeOptionalText(input.response.selectedHear),
          selectedEmpathize: normalizeOptionalText(
            input.response.selectedEmpathize,
          ),
          selectedApologize: normalizeOptionalText(
            input.response.selectedApologize,
          ),
          selectedTakeAction: normalizeOptionalText(
            input.response.selectedTakeAction,
          ),
          finalResponse,
          outcome: input.response.outcome,
        },
        executor,
      );

      return {
        complaint: {
          id: complaint.id,
          referenceNo: complaint.referenceNo,
          status: complaint.status,
          category: complaint.category,
          complaintText: complaint.complaintText,
          submittedAt: complaint.submittedAt,
          resolvedAt: complaint.resolvedAt,
        },
        quickResponseSession: {
          id: session.id,
          outcome: input.response.outcome,
          finalResponse: session.finalResponse,
          createdAt: iso(session.createdAt),
        },
        ticket: ticket ? { id: ticket.id, status: ticket.status } : null,
        requiresFollowUp: input.response.outcome === "sent_hea_action",
      };
    });
  },

  async saveQuickResponseForComplaint(complaintId, input, currentUser) {
    assertCanSaveQuickResponse(currentUser);
    const finalResponse = normalizeOptionalText(input.finalResponse);

    if (input.outcome !== "copy_only" && !finalResponse) {
      throw new ValidationError(
        "Final response is required for sent outcomes",
        { field: "response.finalResponse" },
        "FINAL_RESPONSE_REQUIRED",
      );
    }

    return transactionManager.transaction(async (executor) => {
      const complaint = await complaintsRepository.findComplaintById(
        complaintId,
        executor,
      );

      if (!complaint) {
        throw new NotFoundError("Complaint not found", "COMPLAINT_NOT_FOUND");
      }

      const ticket = input.ticketId
        ? await ticketsService.findTicketById(input.ticketId, executor)
        : null;

      if (input.ticketId && (!ticket || ticket.complaintId !== complaintId)) {
        throw new NotFoundError("Ticket not found", "TICKET_NOT_FOUND");
      }

      if (ticket) {
        ticketsService.assertCanAccessTicket(ticket, currentUser);
      }

      if (input.outcome === "sent_resolved" && ticket) {
        if (ticket.status === "waiting_manager_action") {
          throw new BadRequestError(
            "Manager action has not been completed yet",
            "MANAGER_ACTION_NOT_COMPLETED",
          );
        }

        await ticketsService.closeTicketFromQuickResponse(
          {
            ticketId: ticket.id,
            complaintId,
            closureMessage: finalResponse ?? "",
          },
          currentUser,
          executor,
        );
      }

      const updatedComplaint =
        input.outcome === "sent_resolved"
          ? await complaintsRepository.updateComplaintStatus(
              complaintId,
              "resolved",
              complaint.resolvedAt ?? new Date(),
              executor,
            )
          : complaint;

      if (!updatedComplaint) {
        throw new NotFoundError("Complaint not found", "COMPLAINT_NOT_FOUND");
      }

      const session = await repository.createQuickResponseSession(
        {
          agentId: currentUser.id,
          complaintId,
          ticketId: ticket?.id ?? null,
          sourceChannel: complaint.source,
          sourceHandle: complaint.sourceHandle,
          responseTone: normalizeOptionalText(input.responseTone),
          responseTarget: input.responseTarget,
          selectedHear: normalizeOptionalText(input.selectedHear),
          selectedEmpathize: normalizeOptionalText(input.selectedEmpathize),
          selectedApologize: normalizeOptionalText(input.selectedApologize),
          selectedTakeAction: normalizeOptionalText(input.selectedTakeAction),
          finalResponse,
          outcome: input.outcome,
        },
        executor,
      );
      const closedTicket = ticket
        ? await ticketsService.findTicketById(ticket.id, executor)
        : null;

      return {
        quickResponseSession: {
          id: session.id,
          outcome: input.outcome,
          finalResponse: session.finalResponse,
          createdAt: iso(session.createdAt),
        },
        ticket: closedTicket
          ? { id: closedTicket.id, status: closedTicket.status }
          : null,
        complaint: {
          id: updatedComplaint.id,
          status: updatedComplaint.status,
          resolvedAt: nullableIso(updatedComplaint.resolvedAt),
        },
      };
    });
  },
});
