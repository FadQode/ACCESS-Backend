import type { DatabaseTransactionManager } from "../../db";
import type { NewSocialComplaint } from "../../db/schema";
import { ValidationError } from "../../shared/errors";
import type { SocialComplaintsRepository } from "./social-complaints.repository";
import type {
  SocialComplaintInput,
  SocialComplaintSource,
  SocialComplaintSyncSummary,
  SocialMediaProvider,
} from "./social-complaints.types";

export interface SocialMediaSyncServiceDependencies {
  transactionManager: DatabaseTransactionManager;
  repository: SocialComplaintsRepository;
  providers: Record<SocialComplaintSource, SocialMediaProvider>;
}

const dedupeKey = (
  source: SocialComplaintSource,
  sourceReference: string,
): string => `${source}\u0000${sourceReference}`;

const assertValidRecord = (
  record: SocialComplaintInput,
  source: SocialComplaintSource,
): void => {
  if (!record.sourceReference || record.sourceReference.trim().length === 0) {
    throw new ValidationError(
      `Social complaint ${source}: missing external id`,
      { source },
      "SOCIAL_SYNC_INVALID_RECORD",
    );
  }

  if (!record.content || record.content.trim().length === 0) {
    throw new ValidationError(
      `Social complaint ${source}: missing content`,
      { source },
      "SOCIAL_SYNC_INVALID_RECORD",
    );
  }
};

export const createSocialMediaSyncService = ({
  transactionManager,
  repository,
  providers,
}: SocialMediaSyncServiceDependencies) => {
  const sync = async (
    source: SocialComplaintSource,
  ): Promise<SocialComplaintSyncSummary> => {
    const startedAt = Date.now();
    const fetchedAt = new Date();

    try {
      // 1. Fetch normalized records from the provider. Provider errors
      //    (network/auth/config) propagate untouched.
      const provider = providers[source];
      const fetched = await provider.fetch();

      // 2. Validate-all + in-batch dedupe. Any invalid record aborts the sync.
      const seen = new Set<string>();
      const rows: NewSocialComplaint[] = [];
      let inBatchDuplicates = 0;

      for (const record of fetched) {
        assertValidRecord(record, source);

        const key = dedupeKey(source, record.sourceReference);
        if (seen.has(key)) {
          inBatchDuplicates += 1;
          continue;
        }
        seen.add(key);

        rows.push({
          source,
          sourceReference: record.sourceReference,
          content: record.content,
          author: record.author ?? null,
          sourceUrl: record.sourceUrl ?? null,
          publishedAt: record.publishedAt ?? fetchedAt,
          metadata: record.metadata ?? null,
          fetchedAt,
        });
      }

      // 3. Read existing references (read-only) to classify unchanged rows.
      const existingReferences = await repository.findExistingSourceReferences(
        source,
        rows.map((row) => row.sourceReference),
      );
      const toInsert = rows.filter(
        (row) => !existingReferences.has(row.sourceReference),
      );
      const existing = rows.length - toInsert.length;

      // 4. All-or-nothing write. The unique constraint plus
      //    ON CONFLICT DO NOTHING is the final race protection.
      let created = 0;
      let raceSkipped = 0;
      if (toInsert.length > 0) {
        const result = await transactionManager.transaction((executor) =>
          repository.insertSocialComplaints(toInsert, executor),
        );
        created = result.created;
        raceSkipped = result.skipped;
      }

      const summary: SocialComplaintSyncSummary = {
        source,
        fetched: fetched.length,
        created,
        unchanged: existing + inBatchDuplicates + raceSkipped,
        failed: 0,
      };

      console.info(
        `SOCIAL_SYNC source=${source} fetched=${summary.fetched} created=${summary.created} unchanged=${summary.unchanged} failed=${summary.failed} durationMs=${Date.now() - startedAt} status=success`,
      );

      return summary;
    } catch (error) {
      const reason =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code)
          : "UNKNOWN";
      console.error(
        `SOCIAL_SYNC source=${source} status=failed reason=${reason} durationMs=${Date.now() - startedAt}`,
      );
      throw error;
    }
  };

  return { sync };
};

export type SocialMediaSyncService = ReturnType<
  typeof createSocialMediaSyncService
>;
