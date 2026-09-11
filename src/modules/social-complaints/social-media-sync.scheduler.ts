import type { SocialSyncSource } from "../../config/env";
import type { SocialMediaSyncService } from "./social-media-sync.service";

export interface SocialMediaSyncSchedulerOptions {
  syncService: SocialMediaSyncService;
  sources: SocialSyncSource[];
  intervalMs: number;
  runOnStart?: boolean;
  log?: (message: string) => void;
}

export interface SocialMediaSyncScheduler {
  /** Runs one full pass over every configured source (also used by tests). */
  runOnce(): Promise<void>;
  isRunning(): boolean;
  start(): void;
  stop(): void;
}

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Repeating social complaint ingestion. It only calls
 * `SocialMediaSyncService.sync`; it never talks to Apify or the database
 * directly. Overlapping runs are skipped, and one failing source never stops
 * the others.
 */
export const createSocialMediaSyncScheduler = ({
  syncService,
  sources,
  intervalMs,
  runOnStart = false,
  log = (message) => console.info(message),
}: SocialMediaSyncSchedulerOptions): SocialMediaSyncScheduler => {
  let timer: ReturnType<typeof setInterval> | null = null;
  let ticking = false;

  const runOnce = async (): Promise<void> => {
    if (ticking) {
      log("[social-sync] previous run still in progress; skipping this tick");
      return;
    }

    ticking = true;
    try {
      for (const source of sources) {
        try {
          const startedAt = Date.now();
          const summary = await syncService.sync(source);
          log(
            `[social-sync] source=${source} fetched=${summary.fetched} ` +
              `created=${summary.created} unchanged=${summary.unchanged} ` +
              `failed=${summary.failed} durationMs=${Date.now() - startedAt}`,
          );
        } catch (error) {
          log(
            `[social-sync] source=${source} status=failed error=${describeError(error)}`,
          );
        }
      }
    } finally {
      ticking = false;
    }
  };

  return {
    runOnce,
    isRunning: () => timer !== null,
    start() {
      if (timer) return;
      log(
        `[social-sync] scheduler started intervalMs=${intervalMs} ` +
          `sources=${sources.join(",")}`,
      );
      timer = setInterval(() => {
        void runOnce();
      }, intervalMs);
      if (runOnStart) {
        void runOnce();
      }
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
      log("[social-sync] scheduler stopped");
    },
  };
};
