import { describe, expect, test } from "bun:test";

import type {
  DatabaseExecutor,
  DatabaseTransactionManager,
} from "../src/db";
import type { AuthUser } from "../src/modules/auth/auth.types";
import type { ComplaintsRepository } from "../src/modules/complaints/complaints.repository";
import type { ComplaintsService } from "../src/modules/complaints/complaints.service";
import type { CreateComplaintInput } from "../src/modules/complaints/complaints.types";
import type { QuickResponsesRepository } from "../src/modules/quick-responses/quick-responses.repository";
import { createQuickResponsesService } from "../src/modules/quick-responses/quick-responses.service";
import type { SocialComplaintsService } from "../src/modules/social-complaints/social-complaints.service";
import type { SocialComplaintListItem } from "../src/modules/social-complaints/social-complaints.types";
import type { TicketsService } from "../src/modules/tickets/tickets.service";
import { NotFoundError } from "../src/shared/errors";

const agent: AuthUser = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "Agent One",
  email: "agent1@access.test",
  role: "agent",
};
const now = new Date("2026-09-09T07:00:00.000Z");

const transactionManager: DatabaseTransactionManager = {
  async transaction(callback) {
    return callback({} as DatabaseExecutor);
  },
};

const socialComplaint = (
  overrides: Partial<SocialComplaintListItem> = {},
): SocialComplaintListItem => ({
  id: "00000000-0000-4000-800b-000000000008",
  source: "x",
  sourceReference: "x-post-3002",
  content: "Pembayaran gagal terus, tidak bisa checkout.",
  author: "@maya_travel",
  sourceUrl: "https://x.example.test/maya_travel/status/3002",
  publishedAt: "2026-09-09T03:00:00.000Z",
  metadata: { likeCount: 3 },
  fetchedAt: now.toISOString(),
  createdAt: now.toISOString(),
  ...overrides,
});

const buildService = (
  onComplaint: (input: CreateComplaintInput) => void,
  social: SocialComplaintListItem | null = null,
) => {
  const complaintsService = {
    async createComplaint(input: CreateComplaintInput) {
      onComplaint(input);
      return {
        id: "10000000-0000-4000-8000-000000000001",
        referenceNo: "ACC-20260909-TEST",
        trackingToken: "trk_test",
        source: input.source ?? "other",
        sourceHandle: input.sourceHandle ?? null,
        category: input.category,
        complaintText: input.complaintText,
        status: input.status ?? "submitted",
        submittedAt: now.toISOString(),
        resolvedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    },
  } as ComplaintsService;

  const repository = {
    async createQuickResponseSession() {
      return {
        id: "50000000-0000-4000-8000-000000000001",
        finalResponse: null,
        createdAt: now,
      };
    },
  } as unknown as QuickResponsesRepository;

  const socialComplaintsService = {
    async listSocialComplaints() {
      throw new Error("not used");
    },
    async getSocialComplaintById() {
      if (!social) {
        throw new NotFoundError(
          "Social complaint not found",
          "SOCIAL_COMPLAINT_NOT_FOUND",
        );
      }
      return social;
    },
  } as unknown as SocialComplaintsService;

  return createQuickResponsesService(
    transactionManager,
    complaintsService,
    {} as ComplaintsRepository,
    repository,
    {} as TicketsService,
    {
      async buildReferenceUsageRows() {
        return [];
      },
      async createReferenceUsage() {},
    },
    socialComplaintsService,
  );
};

describe("quick response -> social complaint linking", () => {
  test("leaves manual complaints unchanged when socialComplaintId is absent", async () => {
    let captured: CreateComplaintInput | undefined;
    const service = buildService((input) => {
      captured = input;
    });

    await service.saveQuickResponse(
      {
        complaint: {
          complaintText: "Kereta terlambat dua jam tanpa pemberitahuan.",
          source: "web_form",
          category: "app_update",
        },
        response: {
          responseTarget: "internal_note",
          outcome: "copy_only",
        },
      },
      agent,
    );

    expect(captured?.source).toBe("web_form");
    expect(captured?.socialComplaintId).toBeUndefined();
  });

  test("derives source and provenance from the linked social complaint", async () => {
    let captured: CreateComplaintInput | undefined;
    const service = buildService(
      (input) => {
        captured = input;
      },
      socialComplaint(),
    );

    await service.saveQuickResponse(
      {
        complaint: {
          complaintText: "Pembayaran gagal terus, tidak bisa checkout.",
          category: "payment",
          socialComplaintId: socialComplaint().id,
        },
        response: {
          responseTarget: "public_reply",
          outcome: "copy_only",
        },
      },
      agent,
    );

    expect(captured?.source).toBe("twitter");
    expect(captured?.sourceHandle).toBe("@maya_travel");
    expect(captured?.sourceUrl).toBe(
      "https://x.example.test/maya_travel/status/3002",
    );
    expect(captured?.socialComplaintId).toBe(socialComplaint().id);
  });

  test("rejects an unknown socialComplaintId", async () => {
    const service = buildService(() => {}, null);

    await expect(
      service.saveQuickResponse(
        {
          complaint: {
            complaintText: "Pembayaran gagal terus, tidak bisa checkout.",
            category: "payment",
            socialComplaintId: "00000000-0000-4000-800b-0000000000ff",
          },
          response: {
            responseTarget: "public_reply",
            outcome: "copy_only",
          },
        },
        agent,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
