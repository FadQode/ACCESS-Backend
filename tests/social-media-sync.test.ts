import { describe, expect, test } from "bun:test";

import type {
  DatabaseExecutor,
  DatabaseTransactionManager,
} from "../src/db";
import type { NewSocialComplaint } from "../src/db/schema";
import type { SocialComplaintsRepository } from "../src/modules/social-complaints/social-complaints.repository";
import { createSocialMediaSyncService } from "../src/modules/social-complaints/social-media-sync.service";
import type {
  SocialComplaintInput,
  SocialComplaintSource,
  SocialMediaProvider,
} from "../src/modules/social-complaints/social-complaints.types";
import { ValidationError } from "../src/shared/errors";

const executor = {} as DatabaseExecutor;

const record = (
  overrides: Partial<SocialComplaintInput> = {},
): SocialComplaintInput => ({
  source: "google_play",
  sourceReference: "play-review-1",
  content: "Aplikasi error saat pembayaran.",
  author: "Rina",
  sourceUrl: "https://play.example.test/1",
  publishedAt: new Date("2026-09-08T09:15:00.000Z"),
  metadata: { rating: 1 },
  ...overrides,
});

interface FakeRepoState {
  existing: Set<string>;
  insertCalls: NewSocialComplaint[][];
}

const fakeRepository = (
  state: FakeRepoState,
): SocialComplaintsRepository =>
  ({
    async findSocialComplaints() {
      return { items: [], total: 0 };
    },
    async findSocialComplaintById() {
      return null;
    },
    async findExistingSourceReferences(
      _source: SocialComplaintSource,
      references: string[],
    ) {
      return new Set(references.filter((ref) => state.existing.has(ref)));
    },
    async insertSocialComplaints(rows: NewSocialComplaint[]) {
      state.insertCalls.push(rows);
      for (const row of rows) state.existing.add(row.sourceReference);
      return { created: rows.length, skipped: 0 };
    },
  }) as unknown as SocialComplaintsRepository;

const providerFor = (
  source: SocialComplaintSource,
  fetch: () => Promise<SocialComplaintInput[]>,
): SocialMediaProvider => ({ source, fetch });

const providers = (
  fetch: (source: SocialComplaintSource) => Promise<SocialComplaintInput[]>,
): Record<SocialComplaintSource, SocialMediaProvider> => ({
  google_play: providerFor("google_play", () => fetch("google_play")),
  facebook: providerFor("facebook", () => fetch("facebook")),
  x: providerFor("x", () => fetch("x")),
});

const transactionManager: DatabaseTransactionManager = {
  transaction: (callback) => callback(executor),
};

describe("social media sync service", () => {
  test("creates new records and reports the summary", async () => {
    const state: FakeRepoState = { existing: new Set(), insertCalls: [] };
    const service = createSocialMediaSyncService({
      transactionManager,
      repository: fakeRepository(state),
      providers: providers(async () => [
        record({ sourceReference: "a" }),
        record({ sourceReference: "b" }),
      ]),
    });

    const summary = await service.sync("google_play");

    expect(summary).toEqual({
      source: "google_play",
      fetched: 2,
      created: 2,
      unchanged: 0,
      failed: 0,
    });
    expect(state.insertCalls).toHaveLength(1);
  });

  test("skips records that already exist (idempotent second run)", async () => {
    const state: FakeRepoState = {
      existing: new Set(["a", "b"]),
      insertCalls: [],
    };
    const service = createSocialMediaSyncService({
      transactionManager,
      repository: fakeRepository(state),
      providers: providers(async () => [
        record({ sourceReference: "a" }),
        record({ sourceReference: "b" }),
      ]),
    });

    const summary = await service.sync("google_play");

    expect(summary.created).toBe(0);
    expect(summary.unchanged).toBe(2);
    expect(state.insertCalls).toHaveLength(0);
  });

  test("handles a mixed batch of new and existing records", async () => {
    const state: FakeRepoState = {
      existing: new Set(["b"]),
      insertCalls: [],
    };
    const service = createSocialMediaSyncService({
      transactionManager,
      repository: fakeRepository(state),
      providers: providers(async () => [
        record({ sourceReference: "a" }),
        record({ sourceReference: "b" }),
        record({ sourceReference: "c" }),
      ]),
    });

    const summary = await service.sync("google_play");

    expect(summary.fetched).toBe(3);
    expect(summary.created).toBe(2);
    expect(summary.unchanged).toBe(1);
    expect(state.insertCalls[0]?.map((row) => row.sourceReference)).toEqual([
      "a",
      "c",
    ]);
  });

  test("deduplicates repeated external ids inside one batch", async () => {
    const state: FakeRepoState = { existing: new Set(), insertCalls: [] };
    const service = createSocialMediaSyncService({
      transactionManager,
      repository: fakeRepository(state),
      providers: providers(async () => [
        record({ sourceReference: "a" }),
        record({ sourceReference: "a" }),
      ]),
    });

    const summary = await service.sync("google_play");

    expect(summary.fetched).toBe(2);
    expect(summary.created).toBe(1);
    expect(summary.unchanged).toBe(1);
    expect(state.insertCalls[0]).toHaveLength(1);
  });

  test("falls back to fetched_at when publishedAt is missing", async () => {
    const state: FakeRepoState = { existing: new Set(), insertCalls: [] };
    const service = createSocialMediaSyncService({
      transactionManager,
      repository: fakeRepository(state),
      providers: providers(async () => [
        record({ sourceReference: "a", publishedAt: null }),
      ]),
    });

    await service.sync("google_play");

    const inserted = state.insertCalls[0]?.[0];
    expect(inserted?.publishedAt).toBeInstanceOf(Date);
    expect(inserted?.fetchedAt).toBeInstanceOf(Date);
    expect(inserted?.publishedAt?.getTime()).toBe(
      inserted?.fetchedAt?.getTime(),
    );
  });

  test("rejects an invalid record and writes nothing", async () => {
    const state: FakeRepoState = { existing: new Set(), insertCalls: [] };
    const service = createSocialMediaSyncService({
      transactionManager,
      repository: fakeRepository(state),
      providers: providers(async () => [
        record({ sourceReference: "a" }),
        record({ sourceReference: "  " }),
      ]),
    });

    await expect(service.sync("google_play")).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(state.insertCalls).toHaveLength(0);
  });

  test("propagates provider failure without writing", async () => {
    const state: FakeRepoState = { existing: new Set(), insertCalls: [] };
    const service = createSocialMediaSyncService({
      transactionManager,
      repository: fakeRepository(state),
      providers: providers(async () => {
        throw new Error("provider down");
      }),
    });

    await expect(service.sync("x")).rejects.toThrow("provider down");
    expect(state.insertCalls).toHaveLength(0);
  });

  test("propagates database failure", async () => {
    const repository = {
      async findExistingSourceReferences() {
        return new Set<string>();
      },
      async insertSocialComplaints() {
        throw new Error("db down");
      },
    } as unknown as SocialComplaintsRepository;
    const service = createSocialMediaSyncService({
      transactionManager,
      repository,
      providers: providers(async () => [record({ sourceReference: "a" })]),
    });

    await expect(service.sync("google_play")).rejects.toThrow("db down");
  });
});
