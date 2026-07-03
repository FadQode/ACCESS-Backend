import { describe, expect, test } from "bun:test";

import type { ActionRequestsRepository } from "../src/modules/action-requests/action-requests.repository";
import type { ActionRequestReferencesRepository } from "../src/modules/action-requests/action-request-references.repository";
import { createActionRequestReferencesService } from "../src/modules/action-requests/action-request-references.service";
import type { AuthUser } from "../src/modules/auth/auth.types";
import type { ReferencesRepository } from "../src/modules/references/references.repository";

const now = new Date("2026-06-15T10:00:00.000Z");
const actionRequestId = "40000000-0000-4000-8000-000000000001";
const referenceSourceId = "50000000-0000-4000-8000-000000000001";

const manager: AuthUser = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Manager",
  email: "manager@access.test",
  role: "manager",
};

const agent: AuthUser = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "Agent",
  email: "agent@access.test",
  role: "agent",
};

const actionRequestsRepository = {
  async findActionRequestById() {
    return { id: actionRequestId };
  },
} as unknown as ActionRequestsRepository;

const activeReference = {
  id: referenceSourceId,
  createdBy: manager.id,
  sourceType: "sop",
  title: "SOP Refund",
  category: "payment",
  content: "Refund saldo terpotong diproses setelah transaksi diverifikasi.",
  url: null,
  fileUrl: null,
  storageProvider: null,
  storageBucket: null,
  storageKey: null,
  fileName: null,
  fileMimeType: null,
  fileSize: null,
  status: "active",
  version: "1.0",
  searchText: "refund saldo",
  metadata: null,
  createdAt: now,
  updatedAt: now,
  tags: [],
} as const;

const linkedReference = {
  id: "60000000-0000-4000-8000-000000000001",
  actionRequestId,
  referenceSourceId,
  attachedBy: manager.id,
  attachedByEmail: manager.email,
  attachedByName: manager.name,
  usageType: "policy_support",
  snapshotText:
    "SOP Refund - Refund saldo terpotong diproses setelah transaksi diverifikasi.",
  note: "Pakai untuk closure.",
  createdAt: now,
  referenceSource: {
    id: referenceSourceId,
    title: activeReference.title,
    sourceType: activeReference.sourceType,
    category: activeReference.category,
    content: activeReference.content,
    url: null,
    fileUrl: null,
    storageProvider: null,
    storageKey: null,
    fileName: null,
    fileMimeType: null,
    fileSize: null,
    status: activeReference.status,
  },
} as const;

describe("action request references service", () => {
  test("lets managers attach active references and returns the hydrated link", async () => {
    let createdInput:
      | Parameters<
          ActionRequestReferencesRepository["createActionRequestReference"]
        >[0]
      | null = null;
    const referencesRepository = {
      async findReferenceById() {
        return activeReference;
      },
    } as unknown as ReferencesRepository;
    const repository = {
      async findActionRequestReferenceBySource() {
        return null;
      },
      async createActionRequestReference(
        input: Parameters<
          ActionRequestReferencesRepository["createActionRequestReference"]
        >[0],
      ) {
        createdInput = input;
        return { ...linkedReference, id: linkedReference.id };
      },
      async findActionRequestReferences() {
        return [linkedReference];
      },
    } as unknown as ActionRequestReferencesRepository;
    const service = createActionRequestReferencesService(
      actionRequestsRepository,
      referencesRepository,
      repository,
    );

    const result = await service.attachReference(
      actionRequestId,
      {
        referenceSourceId,
        usageType: "policy_support",
        note: "  Pakai untuk closure.  ",
      },
      manager,
    );

    expect(createdInput).toMatchObject({
      actionRequestId,
      referenceSourceId,
      attachedBy: manager.id,
      usageType: "policy_support",
      note: "Pakai untuk closure.",
    });
    expect(result).toMatchObject({
      id: linkedReference.id,
      actionRequestId,
      referenceSourceId,
      attachedBy: {
        id: manager.id,
        name: manager.name,
        email: manager.email,
      },
    });
  });

  test("rejects agents and duplicate action request references", async () => {
    const service = createActionRequestReferencesService(
      actionRequestsRepository,
      {
        async findReferenceById() {
          return activeReference;
        },
      } as unknown as ReferencesRepository,
      {
        async findActionRequestReferenceBySource() {
          return linkedReference;
        },
      } as unknown as ActionRequestReferencesRepository,
    );

    await expect(
      service.attachReference(
        actionRequestId,
        { referenceSourceId, usageType: "policy_support" },
        agent,
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "ACTION_REQUEST_REFERENCE_FORBIDDEN",
    });
    await expect(
      service.attachReference(
        actionRequestId,
        { referenceSourceId, usageType: "policy_support" },
        manager,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "ACTION_REQUEST_REFERENCE_DUPLICATE",
    });
  });

  test("maps the DB unique constraint to 409 when duplicate attach races", async () => {
    const service = createActionRequestReferencesService(
      actionRequestsRepository,
      {
        async findReferenceById() {
          return activeReference;
        },
      } as unknown as ReferencesRepository,
      {
        async findActionRequestReferenceBySource() {
          return null;
        },
        async createActionRequestReference() {
          throw new Error(
            "duplicate key value violates unique constraint action_request_references_request_source_unique",
          );
        },
      } as unknown as ActionRequestReferencesRepository,
    );

    await expect(
      service.attachReference(
        actionRequestId,
        { referenceSourceId, usageType: "policy_support" },
        manager,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "ACTION_REQUEST_REFERENCE_DUPLICATE",
    });
  });
});
