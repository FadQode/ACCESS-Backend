import { BadRequestError, ConflictError, NotFoundError } from "../../shared/errors";
import { normalizeOptionalText } from "../../shared/utils/normalize-text";
import type { AuthUser } from "../auth/auth.types";
import type { ActionRequestReferencesRepository } from "../action-requests/action-request-references.repository";
import { buildReferenceSnapshotText } from "../references/reference-snapshot";
import type { ReferencesRepository } from "../references/references.repository";
import type {
  CreateQuickResponseReferenceInput,
  QuickResponseReferencesRepository,
} from "./quick-response-references.repository";

export interface QuickResponseReferenceUsageInput {
  note?: string | null;
  referenceSourceId: string;
  selectionSource?: CreateQuickResponseReferenceInput["selectionSource"];
  usageType: CreateQuickResponseReferenceInput["usageType"];
}

export interface QuickResponseReferencesService {
  buildReferenceUsageRows(input: {
    actionRequestId: string;
    currentUser: AuthUser;
    quickResponseSessionId: string;
    references: QuickResponseReferenceUsageInput[];
  }): Promise<CreateQuickResponseReferenceInput[]>;
  createReferenceUsage(
    rows: CreateQuickResponseReferenceInput[],
    executor: Parameters<
      QuickResponseReferencesRepository["createQuickResponseReferences"]
    >[1],
  ): Promise<void>;
}

export const createQuickResponseReferencesService = (
  referencesRepository: ReferencesRepository,
  actionRequestReferencesRepository: ActionRequestReferencesRepository,
  repository: QuickResponseReferencesRepository,
): QuickResponseReferencesService => ({
  async buildReferenceUsageRows({
    actionRequestId,
    currentUser,
    quickResponseSessionId,
    references,
  }) {
    const seen = new Set<string>();
    const rows: CreateQuickResponseReferenceInput[] = [];

    for (const referenceInput of references) {
      if (seen.has(referenceInput.referenceSourceId)) {
        throw new ConflictError(
          "Reference is already included in this quick response",
          "QUICK_RESPONSE_REFERENCE_DUPLICATE",
        );
      }
      seen.add(referenceInput.referenceSourceId);

      const reference = await referencesRepository.findReferenceById(
        referenceInput.referenceSourceId,
      );

      if (!reference) {
        throw new NotFoundError("Reference not found", "REFERENCE_NOT_FOUND");
      }

      if (reference.status !== "active") {
        throw new BadRequestError(
          "Only active references can be used in a quick response",
          "REFERENCE_NOT_ACTIVE",
        );
      }

      const selectionSource =
        referenceInput.selectionSource ?? "agent_selected";

      if (
        selectionSource !== "agent_selected" &&
        selectionSource !== "manager_attached"
      ) {
        throw new BadRequestError(
          "Unsupported quick response reference selection source",
          "QUICK_RESPONSE_REFERENCE_SELECTION_SOURCE_INVALID",
        );
      }

      if (selectionSource === "manager_attached") {
        const attached =
          await actionRequestReferencesRepository.findActionRequestReferenceBySource(
            actionRequestId,
            referenceInput.referenceSourceId,
          );

        if (!attached) {
          throw new BadRequestError(
            "Manager-attached reference is not attached to this action request",
            "REFERENCE_NOT_ATTACHED_TO_ACTION_REQUEST",
          );
        }
      }

      rows.push({
        quickResponseSessionId,
        referenceSourceId: referenceInput.referenceSourceId,
        referencedBy: currentUser.id,
        selectionSource,
        usageType: referenceInput.usageType,
        note: normalizeOptionalText(referenceInput.note),
        snapshotText: buildReferenceSnapshotText(reference),
      });
    }

    return rows;
  },

  async createReferenceUsage(rows, executor) {
    try {
      await repository.createQuickResponseReferences(rows, executor);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("quick_response_references_session_source_unique")
      ) {
        throw new ConflictError(
          "Reference is already included in this quick response",
          "QUICK_RESPONSE_REFERENCE_DUPLICATE",
        );
      }

      throw error;
    }
  },
});
