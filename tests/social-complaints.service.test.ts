import { describe, expect, test } from "bun:test";

import type { SocialComplaint } from "../src/db/schema";
import type { SocialComplaintsRepository } from "../src/modules/social-complaints/social-complaints.repository";
import { createSocialComplaintsService } from "../src/modules/social-complaints/social-complaints.service";
import type { SocialComplaintFilters } from "../src/modules/social-complaints/social-complaints.types";
import { NotFoundError } from "../src/shared/errors";

const now = new Date("2026-09-09T07:00:00.000Z");

const row = (
  overrides: Partial<SocialComplaint> = {},
): SocialComplaint => ({
  id: "00000000-0000-4000-800b-000000000001",
  source: "google_play",
  sourceReference: "play-review-1",
  content: "Aplikasi error saat pembayaran.",
  author: "Rina",
  sourceUrl: "https://play.example.test/1",
  publishedAt: new Date("2026-09-08T09:15:00.000Z"),
  metadata: { rating: 1 },
  fetchedAt: now,
  createdAt: now,
  ...overrides,
});

describe("social complaints service", () => {
  test("returns items with the standard pagination envelope", async () => {
    const service = createSocialComplaintsService({
      async findSocialComplaints(filters: SocialComplaintFilters) {
        expect(filters.page).toBe(1);
        expect(filters.limit).toBe(5);
        return { items: [row()], total: 12 };
      },
    } as unknown as SocialComplaintsRepository);

    const result = await service.listSocialComplaints({
      page: 1,
      limit: 5,
      source: "google_play",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.publishedAt).toBe("2026-09-08T09:15:00.000Z");
    expect(result.pagination).toEqual({
      page: 1,
      limit: 5,
      total: 12,
      totalPages: 3,
    });
  });

  test("applies default pagination when filters are omitted", async () => {
    const service = createSocialComplaintsService({
      async findSocialComplaints(filters: SocialComplaintFilters) {
        expect(filters.page).toBe(1);
        expect(filters.limit).toBe(20);
        return { items: [], total: 0 };
      },
    } as unknown as SocialComplaintsRepository);

    const result = await service.listSocialComplaints({});

    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  test("throws SOCIAL_COMPLAINT_NOT_FOUND for an unknown id", async () => {
    const service = createSocialComplaintsService({
      async findSocialComplaintById() {
        return null;
      },
    } as unknown as SocialComplaintsRepository);

    try {
      await service.getSocialComplaintById(
        "00000000-0000-4000-800b-0000000000ff",
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundError);
      expect((error as NotFoundError).code).toBe("SOCIAL_COMPLAINT_NOT_FOUND");
    }
  });

  test("returns a mapped item for an existing id", async () => {
    const service = createSocialComplaintsService({
      async findSocialComplaintById() {
        return row({ source: "x", author: "@dimas_rail" });
      },
    } as unknown as SocialComplaintsRepository);

    const item = await service.getSocialComplaintById(row().id);

    expect(item.source).toBe("x");
    expect(item.author).toBe("@dimas_rail");
    expect(item.publishedAt).toBe("2026-09-08T09:15:00.000Z");
  });
});
