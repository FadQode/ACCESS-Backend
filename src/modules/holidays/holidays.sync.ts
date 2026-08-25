import type { NewHoliday } from "../../db/schema";
import { ConflictError } from "../../shared/errors";
import type { DatabaseTransactionManager } from "../../db";
import { isActiveExternalHoliday, mapExternalHoliday } from "./holidays.mapper";
import type { HolidaysRepository } from "./holidays.repository";
import type {
  HolidayProvider,
  HolidaySyncSummary,
} from "./holidays.types";

export interface HolidaySyncServiceDependencies {
  transactionManager: DatabaseTransactionManager;
  holidaysRepository: HolidaysRepository;
  holidayProvider: HolidayProvider;
}

const SYNC_SOURCE = "skb_3_menteri" as const;

/**
 * Business fields that decide whether a row counts as changed.
 * sourceReference is provenance metadata and deliberately excluded:
 * comparing it would flag seeded rows (document labels) as updated
 * on first sync for no user-visible change.
 */
const differs = (current: NewHoliday, incoming: NewHoliday): boolean =>
  current.name !== incoming.name ||
  current.category !== incoming.category ||
  current.isJointLeave !== incoming.isJointLeave;

export const createHolidaySyncService = ({
  transactionManager,
  holidaysRepository,
  holidayProvider,
}: HolidaySyncServiceDependencies) => {
  const syncYear = async (year: number): Promise<HolidaySyncSummary> => {
    const startedAt = Date.now();

    try {
      // 1. Fetch from the external provider (provider errors propagate untouched).
      const fetched = await holidayProvider.fetchByYear(year);

      // 2. Only active records are synced; inactive ones are skipped upstream.
      const mapped: NewHoliday[] = [];
      const seenDates = new Set<string>();
      for (const raw of fetched) {
        if (!isActiveExternalHoliday(raw)) continue;

        // Validate-all: any single bad record aborts the whole sync.
        const row = mapExternalHoliday(raw, year);

        if (seenDates.has(row.date)) {
          throw new ConflictError(
            `Provider batch contains duplicate date ${row.date}`,
            "HOLIDAY_SYNC_DUPLICATE_BATCH",
          );
        }
        seenDates.add(row.date);
        mapped.push(row);
      }

      // 3. Diff against existing rows for this year (read-only).
      const existing = await holidaysRepository.findHolidays({ year });
      const existingByDate = new Map(
        existing
          .filter((holiday) => holiday.source === SYNC_SOURCE)
          .map((holiday) => [holiday.date, holiday]),
      );

      const toCreate: NewHoliday[] = [];
      const toUpdate: NewHoliday[] = [];
      let unchanged = 0;
      for (const row of mapped) {
        const current = existingByDate.get(row.date);
        if (!current) toCreate.push(row);
        else if (
          differs(
            {
              name: current.name,
              category: current.category,
              isJointLeave: current.isJointLeave,
              date: current.date,
              source: current.source,
            },
            row,
          )
        ) {
          toUpdate.push(row);
        } else {
          unchanged += 1;
        }
      }

      // 4. All-or-nothing write: new + changed rows in one transaction.
      if (toCreate.length > 0 || toUpdate.length > 0) {
        await transactionManager.transaction((executor) =>
          holidaysRepository.upsertHolidays(
            [...toCreate, ...toUpdate],
            executor,
          ),
        );
      }

      const summary: HolidaySyncSummary = {
        year,
        fetched: fetched.length,
        created: toCreate.length,
        updated: toUpdate.length,
        unchanged,
        failed: 0,
      };

      console.info(
        `HOLIDAY_SYNC year=${year} source=api_indonesia fetched=${summary.fetched} created=${summary.created} updated=${summary.updated} unchanged=${summary.unchanged} durationMs=${Date.now() - startedAt} status=success`,
      );

      return summary;
    } catch (error) {
      const reason =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code)
          : "UNKNOWN";
      console.error(
        `HOLIDAY_SYNC year=${year} status=failed reason=${reason} durationMs=${Date.now() - startedAt}`,
      );
      throw error;
    }
  };

  return { syncYear };
};

export type HolidaySyncService = ReturnType<typeof createHolidaySyncService>;
