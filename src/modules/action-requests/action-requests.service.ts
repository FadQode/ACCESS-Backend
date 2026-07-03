import type { DatabaseExecutor, DatabaseTransactionManager } from "../../db";
import type { ActionRequest, Complaint, Ticket } from "../../db/schema";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors";
import { normalizeText } from "../../shared/utils/normalize-text";
import { generateActionRequestReferenceNo } from "../../shared/utils/reference-number";
import type { AuthUser } from "../auth/auth.types";
import type { ActionRequestGroupingService } from "./action-request-grouping.service";
import {
  toActionRequestReferenceItem,
} from "./action-request-references.service";
import type { ActionRequestReferencesRepository } from "./action-request-references.repository";
import type { ActionRequestsRepository } from "./action-requests.repository";
import type {
  ActionRequestDetail,
  ActionRequestFilters,
  ActionRequestListItem,
  TakeActionInput,
} from "./action-requests.types";

const iso = (date: Date): string => date.toISOString();
const nullableIso = (date: Date | null): string | null =>
  date ? date.toISOString() : null;

const assertCanManageActionRequests = (currentUser: AuthUser): void => {
  if (currentUser.role !== "manager" && currentUser.role !== "admin") {
    throw new ForbiddenError(
      "Only managers can manage action requests",
      "ACTION_REQUEST_FORBIDDEN",
    );
  }
};

const toListItem = (request: ActionRequest): ActionRequestListItem => ({
  id: request.id,
  referenceNo: request.referenceNo,
  category: request.category,
  issueKey: request.issueKey,
  groupingKey: request.groupingKey,
  clusterLabel: request.clusterLabel,
  status: request.status,
  issueSummary: request.issueSummary,
  raisedAt: iso(request.raisedAt),
  resolvedAt: nullableIso(request.resolvedAt),
  createdAt: iso(request.createdAt),
  updatedAt: iso(request.updatedAt),
});

export interface ActionRequestsService {
  createOrReuseForTicket(
    input: {
      ticket: Ticket;
      complaint: Complaint;
      agentId: string | null;
    },
    executor?: DatabaseExecutor,
  ): Promise<{ actionRequest: ActionRequestListItem; reused: boolean }>;
  listActionRequests(
    filters: ActionRequestFilters,
    currentUser: AuthUser,
  ): Promise<{
    items: ActionRequestListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>;
  getActionRequestDetail(
    id: string,
    currentUser: AuthUser,
  ): Promise<ActionRequestDetail>;
  takeAction(
    id: string,
    input: TakeActionInput,
    currentUser: AuthUser,
  ): Promise<{ actionRequest: ActionRequestDetail; updatedTickets: number }>;
}

export const createActionRequestsService = (
  transactionManager: DatabaseTransactionManager,
  repository: ActionRequestsRepository,
  groupingService: ActionRequestGroupingService,
  referencesRepository: ActionRequestReferencesRepository,
): ActionRequestsService => ({
  async createOrReuseForTicket(input, executor) {
    const issueKey = groupingService.detectIssueKey({
      category: input.complaint.category,
      complaintText: input.complaint.complaintText,
    });
    const groupingKey = groupingService.buildGroupingKey({
      category: input.complaint.category,
      issueKey,
    });
    const windowDays = groupingService.getGroupingWindowDays(
      input.complaint.category,
    );

    const existing = await repository.findActiveActionRequestByGroupingKey(
      groupingKey,
      windowDays,
      executor,
    );

    if (existing) {
      await repository.linkComplaintToActionRequest(
        {
          actionRequestId: existing.id,
          complaintId: input.complaint.id,
          ticketId: input.ticket.id,
          agentId: input.agentId,
        },
        executor,
      );
      return { actionRequest: toListItem(existing), reused: true };
    }

    const actionRequest = await repository.createActionRequest(
      {
        referenceNo: generateActionRequestReferenceNo(),
        category: input.complaint.category,
        issueKey,
        groupingKey,
        clusterLabel: groupingService.buildClusterLabel({
          category: input.complaint.category,
          issueKey,
        }),
        issueSummary: groupingService.buildIssueSummary(input),
      },
      executor,
    );

    await repository.linkComplaintToActionRequest(
      {
        actionRequestId: actionRequest.id,
        complaintId: input.complaint.id,
        ticketId: input.ticket.id,
        agentId: input.agentId,
      },
      executor,
    );

    return { actionRequest: toListItem(actionRequest), reused: false };
  },

  async listActionRequests(filters, currentUser) {
    assertCanManageActionRequests(currentUser);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const result = await repository.findActionRequests({
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

  async getActionRequestDetail(id, currentUser) {
    assertCanManageActionRequests(currentUser);
    const detail = await repository.findActionRequestDetailById(id);

    if (!detail) {
      throw new NotFoundError(
        "Action request not found",
        "ACTION_REQUEST_NOT_FOUND",
      );
    }

    const references = await referencesRepository.findActionRequestReferences(id);

    return {
      ...toListItem(detail.actionRequest),
      actionTaken: detail.actionRequest.actionTaken,
      closureMessage: detail.actionRequest.closureMessage,
      linkedComplaints: detail.linkedComplaints.map((link) => ({
        ...link,
          linkedAt: iso(link.linkedAt),
      })),
      references: references.map(toActionRequestReferenceItem),
    };
  },

  async takeAction(id, input, currentUser) {
    assertCanManageActionRequests(currentUser);
    const actionTaken = normalizeText(input.actionTaken);
    const closureMessage = normalizeText(input.closureMessage);

    if (!actionTaken || !closureMessage) {
      throw new BadRequestError(
        "Action taken and closure message are required",
        "ACTION_REQUEST_ACTION_REQUIRED",
      );
    }

    const updatedTickets = await transactionManager.transaction(
      async (executor) => {
      const existing = await repository.findActionRequestById(id, executor);

      if (!existing) {
        throw new NotFoundError(
          "Action request not found",
          "ACTION_REQUEST_NOT_FOUND",
        );
      }

      const updated = await repository.updateActionRequest(
        id,
        {
          status: "action_taken",
          actionTaken,
          closureMessage,
        },
        executor,
      );

      if (!updated) {
        throw new NotFoundError(
          "Action request not found",
          "ACTION_REQUEST_NOT_FOUND",
        );
      }

      const updatedTickets = await repository.updateLinkedTicketsStatus(
        id,
        "manager_action_done",
        executor,
      );

        return updatedTickets;
      },
    );
    const actionRequest = await this.getActionRequestDetail(id, currentUser);

    return { actionRequest, updatedTickets };
  },
});
