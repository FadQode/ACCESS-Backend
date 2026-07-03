import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors";
import { normalizeOptionalText } from "../../shared/utils/normalize-text";
import type { AuthUser } from "../auth/auth.types";
import { buildReferenceSnapshotText } from "../references/reference-snapshot";
import type { ReferencesRepository } from "../references/references.repository";
import type { ActionRequestsRepository } from "./action-requests.repository";
import type { ActionRequestReferenceWithSource } from "./action-request-references.repository";
import type { ActionRequestReferencesRepository } from "./action-request-references.repository";

const iso = (date: Date): string => date.toISOString();

const assertCanManageActionRequestReferences = (currentUser: AuthUser): void => {
  if (currentUser.role !== "manager" && currentUser.role !== "admin") {
    throw new ForbiddenError(
      "Only managers can manage action request references",
      "ACTION_REQUEST_REFERENCE_FORBIDDEN",
    );
  }
};

export const toActionRequestReferenceItem = (
  link: ActionRequestReferenceWithSource,
) => ({
  id: link.id,
  actionRequestId: link.actionRequestId,
  referenceSourceId: link.referenceSourceId,
  usageType: link.usageType,
  snapshotText: link.snapshotText,
  note: link.note,
  createdAt: iso(link.createdAt),
  attachedBy: {
    id: link.attachedBy,
    name: link.attachedByName,
    email: link.attachedByEmail,
  },
  referenceSource: link.referenceSource,
});

export interface AttachActionRequestReferenceInput {
  note?: string | null;
  referenceSourceId: string;
  usageType: ActionRequestReferenceWithSource["usageType"];
}

export interface ActionRequestReferencesService {
  attachReference(
    actionRequestId: string,
    input: AttachActionRequestReferenceInput,
    currentUser: AuthUser,
  ): Promise<ReturnType<typeof toActionRequestReferenceItem>>;
  listReferences(
    actionRequestId: string,
    currentUser: AuthUser,
  ): Promise<Array<ReturnType<typeof toActionRequestReferenceItem>>>;
  removeReference(
    actionRequestId: string,
    referenceLinkId: string,
    currentUser: AuthUser,
  ): Promise<void>;
}

export const createActionRequestReferencesService = (
  actionRequestsRepository: ActionRequestsRepository,
  referencesRepository: ReferencesRepository,
  repository: ActionRequestReferencesRepository,
): ActionRequestReferencesService => ({
  async attachReference(actionRequestId, input, currentUser) {
    assertCanManageActionRequestReferences(currentUser);
    const actionRequest =
      await actionRequestsRepository.findActionRequestById(actionRequestId);

    if (!actionRequest) {
      throw new NotFoundError(
        "Action request not found",
        "ACTION_REQUEST_NOT_FOUND",
      );
    }

    const reference = await referencesRepository.findReferenceById(
      input.referenceSourceId,
    );

    if (!reference) {
      throw new NotFoundError("Reference not found", "REFERENCE_NOT_FOUND");
    }

    if (reference.status !== "active") {
      throw new BadRequestError(
        "Only active references can be attached",
        "REFERENCE_NOT_ACTIVE",
      );
    }

    const duplicate = await repository.findActionRequestReferenceBySource(
      actionRequestId,
      input.referenceSourceId,
    );

    if (duplicate) {
      throw new ConflictError(
        "Reference is already attached to this action request",
        "ACTION_REQUEST_REFERENCE_DUPLICATE",
      );
    }

    let created;
    try {
      created = await repository.createActionRequestReference({
        actionRequestId,
        referenceSourceId: input.referenceSourceId,
        attachedBy: currentUser.id,
        usageType: input.usageType,
        note: normalizeOptionalText(input.note),
        snapshotText: buildReferenceSnapshotText(reference),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("action_request_references_request_source_unique")
      ) {
        throw new ConflictError(
          "Reference is already attached to this action request",
          "ACTION_REQUEST_REFERENCE_DUPLICATE",
        );
      }

      throw error;
    }

    const links = await repository.findActionRequestReferences(actionRequestId);
    const hydrated = links.find((link) => link.id === created.id);

    if (!hydrated) {
      throw new Error("Created action request reference could not be reloaded");
    }

    return toActionRequestReferenceItem(hydrated);
  },

  async listReferences(actionRequestId, currentUser) {
    assertCanManageActionRequestReferences(currentUser);
    const actionRequest =
      await actionRequestsRepository.findActionRequestById(actionRequestId);

    if (!actionRequest) {
      throw new NotFoundError(
        "Action request not found",
        "ACTION_REQUEST_NOT_FOUND",
      );
    }

    return (await repository.findActionRequestReferences(actionRequestId)).map(
      toActionRequestReferenceItem,
    );
  },

  async removeReference(actionRequestId, referenceLinkId, currentUser) {
    assertCanManageActionRequestReferences(currentUser);
    const actionRequest =
      await actionRequestsRepository.findActionRequestById(actionRequestId);

    if (!actionRequest) {
      throw new NotFoundError(
        "Action request not found",
        "ACTION_REQUEST_NOT_FOUND",
      );
    }

    const deleted = await repository.deleteActionRequestReference(
      actionRequestId,
      referenceLinkId,
    );

    if (!deleted) {
      throw new NotFoundError(
        "Action request reference not found",
        "ACTION_REQUEST_REFERENCE_NOT_FOUND",
      );
    }
  },
});
