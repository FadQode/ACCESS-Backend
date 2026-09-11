import { describe, expect, test } from "bun:test";

import type { SocialSyncSource } from "../src/config/env";
import type { SocialComplaintSyncSummary } from "../src/modules/social-complaints/social-complaints.types";
import { createSocialMediaSyncScheduler } from "../src/modules/social-complaints/social-media-sync.scheduler";
import type { SocialMediaSyncService } from "../src/modules/social-complaints/social-media-sync.service";

const summary = (
  source: SocialSyncSource,
  overrides: Partial<SocialComplaintSyncSummary> = {},
): SocialComplaintSyncSummary => ({
  source,
  fetched: 3,
  created: 2,
  unchanged: 1,
  failed: 0,
  ...overrides,
});

const fakeSyncService = (
  onSync: (source: SocialSyncSource) => Promise<SocialComplaintSyncSummary>,
): SocialMediaSyncService =>
  ({ sync: onSync }) as unknown as SocialMediaSyncService;

const sources: SocialSyncSource[] = ["google_play", "facebook", "x"];

describe("social media sync scheduler", () => {
  test("runOnce syncs every configured source", async () => {
    const seen: SocialSyncSource[] = [];
    const scheduler = createSocialMediaSyncScheduler({
      syncService: fakeSyncService(async (source) => {
        seen.push(source);
        return summary(source);
      }),
      sources,
      intervalMs: 60_000,
      log: () => {},
    });

    await scheduler.runOnce();

    expect(seen).toEqual(["google_play", "facebook", "x"]);
  });

  test("one failing source does not stop the others", async () => {
    const seen: SocialSyncSource[] = [];
    const scheduler = createSocialMediaSyncScheduler({
      syncService: fakeSyncService(async (source) => {
        seen.push(source);
        if (source === "facebook") throw new Error("apify down");
        return summary(source);
      }),
      sources,
      intervalMs: 60_000,
      log: () => {},
    });

    await expect(scheduler.runOnce()).resolves.toBeUndefined();
    expect(seen).toEqual(["google_play", "facebook", "x"]);
  });

  test("skips an overlapping tick while a run is in progress", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const scheduler = createSocialMediaSyncScheduler({
      syncService: fakeSyncService(async (source) => {
        calls += 1;
        await gate;
        return summary(source);
      }),
      sources: ["x"],
      intervalMs: 60_000,
      log: () => {},
    });

    const first = scheduler.runOnce();
    await scheduler.runOnce();
    expect(calls).toBe(1);

    release();
    await first;
    await scheduler.runOnce();
    expect(calls).toBe(2);
  });

  test("start and stop toggle isRunning and are idempotent", () => {
    const scheduler = createSocialMediaSyncScheduler({
      syncService: fakeSyncService(async (source) => summary(source)),
      sources,
      intervalMs: 3_600_000,
      log: () => {},
    });

    expect(scheduler.isRunning()).toBe(false);
    scheduler.start();
    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);
    scheduler.stop();
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });
});
