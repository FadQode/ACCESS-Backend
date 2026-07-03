import { describe, expect, test } from "bun:test";

import type { ActionRequestReferencesRepository } from "../src/modules/action-requests/action-request-references.repository";
import type { AuthUser } from "../src/modules/auth/auth.types";
import { createQuickResponseReferencesService } from "../src/modules/quick-responses/quick-response-references.service";
import type { QuickResponseReferencesRepository } from "../src/modules/quick-responses/quick-response-references.repository";
import type { ReferencesRepository } from "../src/modules/references/references.repository";

const now = new Date("2026-06-15T10:00:00.000Z");
const actionRequestId = "40000000-0000-4000-8000-000000000001";
const quickResponseSessionId = "70000000-0000-4000-8000-000000000001";
const referenceSourceId = "50000000-0000-4000-8000-000000000001";

const agent: AuthUser = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "Agent",
  email: "agent@access.test",
  role: "agent",
};

const activeReference = {
  id: referenceSourceId,
  createdBy: agent.id,
  sourceType: "sop",
  title: "SOP Refund",
  category: "payment",
  content: "Refund saldo ".repeat(80),
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

describe("quick response references service", () => {
  test("builds snapshot rows and caps snapshot text at 500 chars", async () => {
    const service = createQuickResponseReferencesService(
      {
        async findReferenceById() {
          return activeReference;
        },
      } as unknown as ReferencesRepository,
      {} as ActionRequestReferencesRepository,
      {} as QuickResponseReferencesRepository,
    );

    const rows = await service.buildReferenceUsageRows({
      actionRequestId,
      currentUser: agent,
      quickResponseSessionId,
      references: [
        {
          referenceSourceId,
          usageType: "closure_support",
          note: "  dipakai untuk closure  ",
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      quickResponseSessionId,
      referenceSourceId,
      referencedBy: agent.id,
      selectionSource: "agent_selected",
      usageType: "closure_support",
      note: "dipakai untuk closure",
    });
    expect(rows[0]?.snapshotText).toHaveLength(500);
  });

  test("requires manager_attached references to exist on the action request", async () => {
    const service = createQuickResponseReferencesService(
      {
        async findReferenceById() {
          return activeReference;
        },
      } as unknown as ReferencesRepository,
      {
        async findActionRequestReferenceBySource() {
          return null;
        },
      } as unknown as ActionRequestReferencesRepository,
      {} as QuickResponseReferencesRepository,
    );

    await expect(
      service.buildReferenceUsageRows({
        actionRequestId,
        currentUser: agent,
        quickResponseSessionId,
        references: [
          {
            referenceSourceId,
            selectionSource: "manager_attached",
            usageType: "closure_support",
          },
        ],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "REFERENCE_NOT_ATTACHED_TO_ACTION_REQUEST",
    });
  });

  test("returns 409 for duplicate quick response references", async () => {
    const service = createQuickResponseReferencesService(
      {
        async findReferenceById() {
          return activeReference;
        },
      } as unknown as ReferencesRepository,
      {} as ActionRequestReferencesRepository,
      {
        async createQuickResponseReferences() {
          throw new Error(
            "duplicate key value violates unique constraint quick_response_references_session_source_unique",
          );
        },
      } as unknown as QuickResponseReferencesRepository,
    );

    await expect(
      service.buildReferenceUsageRows({
        actionRequestId,
        currentUser: agent,
        quickResponseSessionId,
        references: [
          { referenceSourceId, usageType: "closure_support" },
          { referenceSourceId, usageType: "closure_support" },
        ],
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "QUICK_RESPONSE_REFERENCE_DUPLICATE",
    });
    await expect(
      service.createReferenceUsage(
        [
          {
            quickResponseSessionId,
            referenceSourceId,
            referencedBy: agent.id,
            selectionSource: "agent_selected",
            usageType: "closure_support",
            snapshotText: "SOP Refund",
          },
        ],
        undefined,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "QUICK_RESPONSE_REFERENCE_DUPLICATE",
    });
  });

  test("rejects unsupported selection sources for Phase 5 API writes", async () => {
    const service = createQuickResponseReferencesService(
      {
        async findReferenceById() {
          return activeReference;
        },
      } as unknown as ReferencesRepository,
      {} as ActionRequestReferencesRepository,
      {} as QuickResponseReferencesRepository,
    );

    await expect(
      service.buildReferenceUsageRows({
        actionRequestId,
        currentUser: agent,
        quickResponseSessionId,
        references: [
          {
            referenceSourceId,
            selectionSource: "system_suggested",
            usageType: "closure_support",
          },
        ],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "QUICK_RESPONSE_REFERENCE_SELECTION_SOURCE_INVALID",
    });
  });
});
