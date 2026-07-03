import type { DatabaseExecutor } from "../../db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors";
import {
  normalizeOptionalText,
  normalizeText,
} from "../../shared/utils/normalize-text";
import { generateComplaintReferenceNo } from "../../shared/utils/reference-number";
import { generateTrackingToken } from "../../shared/utils/tracking-token";
import type { AuthUser } from "../auth/auth.types";
import type { ComplaintsRepository } from "./complaints.repository";
import type {
  ComplaintDetail,
  ComplaintFilters,
  ComplaintListItem,
  ComplaintQuickResponseDetail,
  ComplaintStatus,
  CreateComplaintInput,
  UpdateComplaintInput,
} from "./complaints.types";

const iso = (date: Date): string => date.toISOString();
const nullableIso = (date: Date | null): string | null =>
  date ? date.toISOString() : null;

const toListItem = (complaint: {
  id: string;
  referenceNo: string;
  source: ComplaintListItem["source"];
  sourceHandle: string | null;
  category: ComplaintListItem["category"];
  complaintText: string;
  status: ComplaintStatus;
  submittedAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ComplaintListItem => ({
  ...complaint,
  submittedAt: iso(complaint.submittedAt),
  resolvedAt: nullableIso(complaint.resolvedAt),
  createdAt: iso(complaint.createdAt),
  updatedAt: iso(complaint.updatedAt),
});

const assertCanUpdate = (currentUser: AuthUser): void => {
  if (currentUser.role !== "agent" && currentUser.role !== "admin") {
    throw new ForbiddenError(
      "Managers cannot update complaints in this phase",
      "COMPLAINT_UPDATE_FORBIDDEN",
    );
  }
};

export interface ComplaintsService {
  createComplaint(
    input: CreateComplaintInput,
    executor?: DatabaseExecutor,
  ): Promise<ComplaintListItem & { trackingToken: string }>;
  listComplaints(filters: ComplaintFilters): Promise<{
    items: ComplaintListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>;
  getComplaintDetail(id: string): Promise<{
    complaint: ComplaintDetail;
    quickResponseSessions: ComplaintQuickResponseDetail[];
  }>;
  updateComplaint(
    id: string,
    input: UpdateComplaintInput,
    currentUser: AuthUser,
  ): Promise<ComplaintDetail>;
  updateComplaintStatus(
    id: string,
    status: ComplaintStatus,
    currentUser: AuthUser,
  ): Promise<ComplaintDetail>;
}

export const createComplaintsService = (
  repository: ComplaintsRepository,
): ComplaintsService => ({
  async createComplaint(input, executor) {
    let referenceNo = "";

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = generateComplaintReferenceNo();
      if (!(await repository.isReferenceNoInUse(candidate, executor))) {
        referenceNo = candidate;
        break;
      }
    }

    if (!referenceNo) {
      throw new ConflictError(
        "Unable to generate a unique complaint reference",
        "COMPLAINT_REFERENCE_CONFLICT",
      );
    }

    const created = await repository.createComplaint(
      {
        ...input,
        complaintText: normalizeText(input.complaintText),
        sourceHandle: normalizeOptionalText(input.sourceHandle),
        sourceUrl: normalizeOptionalText(input.sourceUrl),
        complainerName: normalizeOptionalText(input.complainerName),
        complainerContact: normalizeOptionalText(input.complainerContact),
        referenceNo,
        trackingToken: generateTrackingToken(),
      },
      executor,
    );

    return { ...toListItem(created), trackingToken: created.trackingToken };
  },

  async listComplaints(filters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const result = await repository.findComplaints({ ...filters, page, limit });

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

  async getComplaintDetail(id) {
    const detail = await repository.findComplaintDetailById(id);

    if (!detail) {
      throw new NotFoundError("Complaint not found", "COMPLAINT_NOT_FOUND");
    }

    const complaint: ComplaintDetail = {
      ...toListItem(detail.complaint),
      trackingToken: detail.complaint.trackingToken,
      sourceUrl: detail.complaint.sourceUrl,
      complainerName: detail.complaint.complainerName,
      complainerContact: detail.complaint.complainerContact,
    };
    const quickResponseSessions = detail.quickResponseSessions.map(
      (session): ComplaintQuickResponseDetail => ({
        id: session.id,
        agent: {
          id: session.agentId,
          name: session.agentName,
          email: session.agentEmail,
        },
        sourceChannel: session.sourceChannel,
        sourceHandle: session.sourceHandle,
        responseTone: session.responseTone,
        responseTarget: session.responseTarget,
        selectedHear: session.selectedHear,
        selectedEmpathize: session.selectedEmpathize,
        selectedApologize: session.selectedApologize,
        selectedTakeAction: session.selectedTakeAction,
        finalResponse: session.finalResponse,
        outcome: session.outcome,
        references: session.references.map((reference) => ({
          id: reference.id,
          referenceSourceId: reference.referenceSourceId,
          selectionSource: reference.selectionSource,
          usageType: reference.usageType,
          snapshotText: reference.snapshotText,
          note: reference.note,
          createdAt: iso(reference.createdAt),
          referenceSource: reference.referenceSource,
        })),
        createdAt: iso(session.createdAt),
        updatedAt: iso(session.updatedAt),
      }),
    );

    return { complaint, quickResponseSessions };
  },

  async updateComplaint(id, input, currentUser) {
    assertCanUpdate(currentUser);

    const normalized: UpdateComplaintInput = {
      ...(input.source === undefined ? {} : { source: input.source }),
      ...(input.sourceHandle === undefined
        ? {}
        : { sourceHandle: normalizeOptionalText(input.sourceHandle) }),
      ...(input.sourceUrl === undefined
        ? {}
        : { sourceUrl: normalizeOptionalText(input.sourceUrl) }),
      ...(input.complainerName === undefined
        ? {}
        : { complainerName: normalizeOptionalText(input.complainerName) }),
      ...(input.complainerContact === undefined
        ? {}
        : {
            complainerContact: normalizeOptionalText(input.complainerContact),
          }),
      ...(input.category === undefined ? {} : { category: input.category }),
      ...(input.complaintText === undefined
        ? {}
        : { complaintText: normalizeText(input.complaintText) }),
    };
    const updated = await repository.updateComplaint(id, normalized);

    if (!updated) {
      throw new NotFoundError("Complaint not found", "COMPLAINT_NOT_FOUND");
    }

    return {
      ...toListItem(updated),
      trackingToken: updated.trackingToken,
      sourceUrl: updated.sourceUrl,
      complainerName: updated.complainerName,
      complainerContact: updated.complainerContact,
    };
  },

  async updateComplaintStatus(id, status, currentUser) {
    assertCanUpdate(currentUser);
    const current = await repository.findComplaintById(id);

    if (!current) {
      throw new NotFoundError("Complaint not found", "COMPLAINT_NOT_FOUND");
    }

    const resolvedAt =
      status === "resolved" || status === "closed"
        ? (current.resolvedAt ?? new Date())
        : null;
    const updated = await repository.updateComplaintStatus(
      id,
      status,
      resolvedAt,
    );

    if (!updated) {
      throw new NotFoundError("Complaint not found", "COMPLAINT_NOT_FOUND");
    }

    return {
      ...toListItem(updated),
      trackingToken: updated.trackingToken,
      sourceUrl: updated.sourceUrl,
      complainerName: updated.complainerName,
      complainerContact: updated.complainerContact,
    };
  },
});
