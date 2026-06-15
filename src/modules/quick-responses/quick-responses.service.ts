import type { DatabaseTransactionManager } from "../../db";
import { ForbiddenError, ValidationError } from "../../shared/errors";
import { normalizeOptionalText } from "../../shared/utils/normalize-text";
import type { AuthUser } from "../auth/auth.types";
import type { ComplaintsService } from "../complaints/complaints.service";
import type { ComplaintStatus } from "../complaints/complaints.types";
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
    requiresFollowUp: boolean;
  }>;
}

export const createQuickResponsesService = (
  transactionManager: DatabaseTransactionManager,
  complaintsService: ComplaintsService,
  repository: QuickResponsesRepository,
): QuickResponsesService => ({
  async saveQuickResponse(input, currentUser) {
    if (currentUser.role !== "agent" && currentUser.role !== "admin") {
      throw new ForbiddenError(
        "Managers cannot save quick responses",
        "QUICK_RESPONSE_SAVE_FORBIDDEN",
      );
    }

    const finalResponse = normalizeOptionalText(input.response.finalResponse);
    if (input.response.outcome !== "copy_only" && !finalResponse) {
      throw new ValidationError(
        "Final response is required for sent outcomes",
        { field: "response.finalResponse" },
        "FINAL_RESPONSE_REQUIRED",
      );
    }

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
      const session = await repository.createQuickResponseSession(
        {
          agentId: currentUser.id,
          complaintId: complaint.id,
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
          createdAt: session.createdAt.toISOString(),
        },
        requiresFollowUp: input.response.outcome === "sent_hea_action",
      };
    });
  },
});
