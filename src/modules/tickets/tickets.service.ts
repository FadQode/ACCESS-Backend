import type { DatabaseExecutor, DatabaseTransactionManager } from "../../db";
import type { Ticket } from "../../db/schema";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors";
import { normalizeText } from "../../shared/utils/normalize-text";
import type { ActionRequestsService } from "../action-requests/action-requests.service";
import {
  toActionRequestReferenceItem,
} from "../action-requests/action-request-references.service";
import type { ActionRequestReferencesRepository } from "../action-requests/action-request-references.repository";
import type { AuthUser } from "../auth/auth.types";
import type { ComplaintsRepository } from "../complaints/complaints.repository";
import type {
  TicketDetail,
  TicketClosureContext,
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

const applyTicketListScope = (
  filters: TicketFilters,
  currentUser: AuthUser,
): TicketFilters => {
  if (currentUser.role === "agent") {
    return { ...filters, agentId: currentUser.id };
  }

  if (currentUser.role === "admin") {
    return filters;
  }

  const { agentId: _agentId, ...safeFilters } = filters;
  return safeFilters;
};

const assertAgentOwnsTicket = (
  ticket: Pick<Ticket, "agentId">,
  currentUser: AuthUser,
): void => {
  if (currentUser.role === "agent" && ticket.agentId !== currentUser.id) {
    throw new NotFoundError("Ticket not found", "TICKET_NOT_FOUND");
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
  managerAction: ticket.actionRequestId
    ? {
        actionRequestId: ticket.actionRequestId,
        actionTaken: ticket.actionTaken,
        closureMessage: ticket.managerClosureMessage,
      }
    : null,
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
  getClosureContext(
    id: string,
    currentUser: AuthUser,
  ): Promise<TicketClosureContext>;
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
  assertCanAccessTicket(ticket: Pick<Ticket, "agentId">, currentUser: AuthUser): void;
}

export const createTicketsService = (
  transactionManager: DatabaseTransactionManager,
  ticketsRepository: TicketsRepository,
  complaintsRepository: ComplaintsRepository,
  actionRequestsService: ActionRequestsService,
  actionRequestReferencesRepository: ActionRequestReferencesRepository = {
    async createActionRequestReference() {
      throw new Error("Action request reference repository is not configured");
    },
    async deleteActionRequestReference() {
      return null;
    },
    async findActionRequestReferenceById() {
      return null;
    },
    async findActionRequestReferenceBySource() {
      return null;
    },
    async findActionRequestReferences() {
      return [];
    },
  },
): TicketsService => ({
  async createTicketFromComplaint(input, executor) {
    const existing = await ticketsRepository.findTicketByComplaintId(
      input.complaintId,
      executor,
    );

    const ticket =
      existing ??
      (await ticketsRepository.createTicket(
        {
          complaintId: input.complaintId,
          agentId: input.agentId,
          status: "hea_sent",
          priority: "medium",
          heaResponse: normalizeText(input.heaResponse),
          heaSentAt: input.heaSentAt ?? new Date(),
        },
        executor,
      ));

    const complaint = await complaintsRepository.findComplaintById(
      ticket.complaintId,
      executor,
    );

    if (!complaint) {
      throw new NotFoundError("Complaint not found", "COMPLAINT_NOT_FOUND");
    }

    await actionRequestsService.createOrReuseForTicket(
      {
        ticket,
        complaint,
        agentId: input.agentId,
      },
      executor,
    );

    return ticket;
  },

  async listTickets(filters, currentUser) {
    assertCanReadTickets(currentUser);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const scopedFilters = applyTicketListScope(filters, currentUser);
    const result = await ticketsRepository.findTickets({
      ...scopedFilters,
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

    assertAgentOwnsTicket(ticket, currentUser);

    return toDetail(ticket);
  },

  async getClosureContext(id, currentUser) {
    if (currentUser.role !== "agent" && currentUser.role !== "admin") {
      throw new ForbiddenError(
        "Only agents can access ticket closure context",
        "TICKET_CLOSURE_CONTEXT_FORBIDDEN",
      );
    }

    const context = await ticketsRepository.findTicketClosureContextById(id);

    if (!context) {
      throw new NotFoundError("Ticket not found", "TICKET_NOT_FOUND");
    }

    assertAgentOwnsTicket({ agentId: context.ticketAgentId }, currentUser);

    if (context.ticketStatus !== "manager_action_done") {
      throw new BadRequestError(
        "Manager action has not been completed yet",
        "MANAGER_ACTION_NOT_COMPLETED",
      );
    }

    if (!context.actionRequestId) {
      throw new BadRequestError(
        "Ticket is not linked to an action request",
        "TICKET_ACTION_REQUEST_NOT_LINKED",
      );
    }

    if (context.actionRequestStatus !== "action_taken") {
      throw new BadRequestError(
        "Manager action has not been completed yet",
        "MANAGER_ACTION_NOT_COMPLETED",
      );
    }

    const attachedReferences =
      await actionRequestReferencesRepository.findActionRequestReferences(
        context.actionRequestId,
      );

    return {
      ticket: {
        id: context.ticketId,
        status: context.ticketStatus,
        priority: context.ticketPriority,
      },
      complaint: {
        id: context.complaintId,
        referenceNo: context.complaintReferenceNo,
        category: context.complaintCategory,
        complaintText: context.complaintText,
        status: context.complaintStatus,
      },
      actionRequest: {
        id: context.actionRequestId,
        referenceNo: context.actionRequestReferenceNo ?? "",
        clusterLabel: context.actionRequestClusterLabel,
        actionTaken: context.actionRequestActionTaken,
        closureMessage: context.actionRequestClosureMessage,
        status: context.actionRequestStatus,
      },
      attachedReferences: attachedReferences.map(toActionRequestReferenceItem),
    };
  },

  async escalateTicket(id, currentUser) {
    assertCanHandleTickets(currentUser);

    const result = await transactionManager.transaction(async (executor) => {
      const ticket = await ticketsRepository.findTicketById(id, executor);

      if (!ticket) {
        throw new NotFoundError("Ticket not found", "TICKET_NOT_FOUND");
      }

      assertAgentOwnsTicket(ticket, currentUser);

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

    assertAgentOwnsTicket(ticket, currentUser);

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

  assertCanAccessTicket(ticket, currentUser) {
    assertAgentOwnsTicket(ticket, currentUser);
  },
});
