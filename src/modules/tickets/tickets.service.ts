import type { DatabaseExecutor, DatabaseTransactionManager } from "../../db";
import type { Ticket } from "../../db/schema";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors";
import { normalizeText } from "../../shared/utils/normalize-text";
import type { ActionRequestsService } from "../action-requests/action-requests.service";
import type { AuthUser } from "../auth/auth.types";
import type { ComplaintsRepository } from "../complaints/complaints.repository";
import type {
  TicketDetail,
  TicketFilters,
  TicketListItem,
} from "./tickets.types";
import type {
  TicketJoinedRecord,
  TicketsRepository,
} from "./tickets.repository";

const iso = (date: Date): string => date.toISOString();
const nullableIso = (date: Date | null): string | null =>
  date ? date.toISOString() : null;

const assertCanHandleTickets = (currentUser: AuthUser): void => {
  if (currentUser.role !== "agent" && currentUser.role !== "admin") {
    throw new ForbiddenError(
      "Only agents can handle tickets in this phase",
      "TICKET_HANDLE_FORBIDDEN",
    );
  }
};

const assertCanReadTickets = (currentUser: AuthUser): void => {
  if (!["agent", "manager", "admin"].includes(currentUser.role)) {
    throw new ForbiddenError(
      "You cannot access tickets",
      "TICKET_READ_FORBIDDEN",
    );
  }
};

const toListItem = (ticket: TicketJoinedRecord): TicketListItem => ({
  id: ticket.id,
  complaintId: ticket.complaintId,
  agentId: ticket.agentId,
  status: ticket.status,
  priority: ticket.priority,
  category: ticket.category,
  complaintStatus: ticket.complaintStatus,
  complaintText: ticket.complaintText,
  referenceNo: ticket.referenceNo,
  createdAt: iso(ticket.createdAt),
  updatedAt: iso(ticket.updatedAt),
});

const toDetail = (ticket: TicketJoinedRecord): TicketDetail => ({
  ...toListItem(ticket),
  heaResponse: ticket.heaResponse,
  heaSentAt: nullableIso(ticket.heaSentAt),
  closureMessage: ticket.closureMessage,
  closureSentAt: nullableIso(ticket.closureSentAt),
  agent:
    ticket.agentId && ticket.agentName && ticket.agentEmail
      ? {
          id: ticket.agentId,
          name: ticket.agentName,
          email: ticket.agentEmail,
        }
      : null,
});

export interface TicketsService {
  createTicketFromComplaint(
    input: {
      complaintId: string;
      agentId: string | null;
      heaResponse: string;
      heaSentAt?: Date;
    },
    executor?: DatabaseExecutor,
  ): Promise<Ticket>;
  listTickets(
    filters: TicketFilters,
    currentUser: AuthUser,
  ): Promise<{
    items: TicketListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>;
  getTicketDetail(id: string, currentUser: AuthUser): Promise<TicketDetail>;
  escalateTicket(
    id: string,
    currentUser: AuthUser,
  ): Promise<{
    ticket: TicketDetail;
    actionRequest: Awaited<
      ReturnType<ActionRequestsService["createOrReuseForTicket"]>
    >["actionRequest"];
    actionRequestReused: boolean;
  }>;
  closeTicketFromQuickResponse(
    input: {
      ticketId: string;
      complaintId: string;
      closureMessage: string;
    },
    currentUser: AuthUser,
    executor?: DatabaseExecutor,
  ): Promise<Ticket>;
  findTicketById(id: string, executor?: DatabaseExecutor): Promise<Ticket | null>;
}

export const createTicketsService = (
  transactionManager: DatabaseTransactionManager,
  ticketsRepository: TicketsRepository,
  complaintsRepository: ComplaintsRepository,
  actionRequestsService: ActionRequestsService,
): TicketsService => ({
  async createTicketFromComplaint(input, executor) {
    const existing = await ticketsRepository.findTicketByComplaintId(
      input.complaintId,
      executor,
    );

    if (existing) return existing;

    return ticketsRepository.createTicket(
      {
        complaintId: input.complaintId,
        agentId: input.agentId,
        status: "hea_sent",
        priority: "medium",
        heaResponse: normalizeText(input.heaResponse),
        heaSentAt: input.heaSentAt ?? new Date(),
      },
      executor,
    );
  },

  async listTickets(filters, currentUser) {
    assertCanReadTickets(currentUser);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const result = await ticketsRepository.findTickets({
      ...filters,
      page,
      limit,
    });

    return {
      items: result.items.map(toListItem),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  },

  async getTicketDetail(id, currentUser) {
    assertCanReadTickets(currentUser);
    const ticket = await ticketsRepository.findTicketDetailById(id);

    if (!ticket) {
      throw new NotFoundError("Ticket not found", "TICKET_NOT_FOUND");
    }

    return toDetail(ticket);
  },

  async escalateTicket(id, currentUser) {
    assertCanHandleTickets(currentUser);

    const result = await transactionManager.transaction(async (executor) => {
      const ticket = await ticketsRepository.findTicketById(id, executor);

      if (!ticket) {
        throw new NotFoundError("Ticket not found", "TICKET_NOT_FOUND");
      }

      if (ticket.status === "closed") {
        throw new BadRequestError(
          "Closed tickets cannot be escalated",
          "TICKET_ALREADY_CLOSED",
        );
      }

      const complaint = await complaintsRepository.findComplaintById(
        ticket.complaintId,
        executor,
      );

      if (!complaint) {
        throw new NotFoundError("Complaint not found", "COMPLAINT_NOT_FOUND");
      }

      const actionRequest = await actionRequestsService.createOrReuseForTicket(
        {
          ticket,
          complaint,
          agentId: currentUser.id,
        },
        executor,
      );

      await ticketsRepository.updateTicketStatus(
        ticket.id,
        "waiting_manager_action",
        executor,
      );

      return {
        ticketId: ticket.id,
        actionRequest: actionRequest.actionRequest,
        actionRequestReused: actionRequest.reused,
      };
    });

    const detail = await ticketsRepository.findTicketDetailById(result.ticketId);

    if (!detail) {
      throw new NotFoundError("Ticket not found", "TICKET_NOT_FOUND");
    }

    return {
      ticket: toDetail(detail),
      actionRequest: result.actionRequest,
      actionRequestReused: result.actionRequestReused,
    };
  },

  async closeTicketFromQuickResponse(input, currentUser, executor) {
    assertCanHandleTickets(currentUser);
    const ticket = await ticketsRepository.findTicketById(
      input.ticketId,
      executor,
    );

    if (!ticket || ticket.complaintId !== input.complaintId) {
      throw new NotFoundError("Ticket not found", "TICKET_NOT_FOUND");
    }

    if (ticket.status === "waiting_manager_action") {
      throw new BadRequestError(
        "Manager action has not been completed yet",
        "MANAGER_ACTION_NOT_COMPLETED",
      );
    }

    if (ticket.status !== "manager_action_done") {
      throw new BadRequestError(
        "Ticket is not ready for final closure",
        "TICKET_NOT_READY_TO_CLOSE",
      );
    }

    const closed = await ticketsRepository.closeTicket(
      input.ticketId,
      normalizeText(input.closureMessage),
      executor,
    );

    if (!closed) {
      throw new NotFoundError("Ticket not found", "TICKET_NOT_FOUND");
    }

    return closed;
  },

  async findTicketById(id, executor) {
    return ticketsRepository.findTicketById(id, executor);
  },
});
