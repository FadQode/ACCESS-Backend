import { describe, expect, test } from "bun:test";

import type {
  DatabaseExecutor,
  DatabaseTransactionManager,
} from "../src/db";
import type { Holiday, NewHoliday } from "../src/db/schema";
import { createHolidaySyncService } from "../src/modules/holidays/holidays.sync";
import { mapExternalHoliday } from "../src/modules/holidays/holidays.mapper";
import type { HolidaysRepository } from "../src/modules/holidays/holidays.repository";
import type {
  ExternalHoliday,
  HolidayCategory,
  HolidayProvider,
  HolidaySyncSummary,
} from "../src/modules/holidays/holidays.types";
import {
  ConflictError,
  ServiceUnavailableError,
  ValidationError,
} from "../src/shared/errors";

const now = new Date("2026-08-25T00:00:00.000Z");
const executor = {} as DatabaseExecutor;
const transactionManager: DatabaseTransactionManager = {
  transaction: (callback) => callback(executor),
};

let seq = 0;
const externalRow = (
  overrides: Partial<ExternalHoliday> = {},
): ExternalHoliday => ({
  id: `hol_2027_${String(++seq).padStart(3, "0")}`,
  date: "2027-03-14",
  name: "Hari Raya Idul Fitri",
  type: "nasional",
  is_joint_leave: 0,
  is_active: true,
  ...overrides,
});

const storedRow = (input: NewHoliday): Holiday => ({
  id: `00000000-0000-4000-800c-${String(++seq).padStart(12, "0")}`,
  name: input.name,
  date: input.date,
  category: (input.category ?? "regular_holiday") as HolidayCategory,
  isJointLeave: input.isJointLeave ?? false,
  source: input.source ?? "skb_3_menteri",
  sourceReference: input.sourceReference ?? null,
  createdAt: now,
  updatedAt: now,
});

interface FakeRepoState {
  rows: Map<string, Holiday>;
  upsertCalls: NewHoliday[][];
}

const fakeRepository = (
  initial: Holiday[] = [],
): HolidaysRepository & { state: FakeRepoState } => {
  const state: FakeRepoState = {
    rows: new Map(initial.map((row) => [`${row.date}|${row.source}`, row])),
    upsertCalls: [],
  };

  return {
    state,
    async findHolidays(filters) {
      const all = Array.from(state.rows.values());
      if (!filters?.year) return all;
      return all.filter((row) => row.date.startsWith(`${filters.year}`));
    },
    async findHolidaysInRange(start, end) {
      return Array.from(state.rows.values()).filter(
        (row) => row.date >= start && row.date <= end,
      );
    },
    async findHolidayById(id) {
      return (
        Array.from(state.rows.values()).find((row) => row.id === id) ?? null
      );
    },
    async findHolidayByDateAndSource(date, source) {
      return state.rows.get(`${date}|${source}`) ?? null;
    },
    async createHoliday(input) {
      const holiday = storedRow({ ...input, source: input.source ?? "manual" });
      state.rows.set(`${holiday.date}|${holiday.source}`, holiday);
      return holiday;
    },
    async updateHoliday(id, patch) {
      for (const [key, row] of state.rows) {
        if (row.id !== id) continue;
        const updated = storedRow({
          name: patch.name ?? row.name,
          date: patch.date ?? row.date,
          category: patch.category ?? row.category,
          isJointLeave: patch.isJointLeave ?? row.isJointLeave,
          source: patch.source ?? row.source,
          sourceReference:
            patch.sourceReference !== undefined
              ? patch.sourceReference
              : row.sourceReference,
        });
        updated.id = row.id;
        state.rows.set(`${updated.date}|${updated.source}`, updated);
        return updated;
      }
      return null;
    },
    async deleteHoliday(id) {
      for (const [key, row] of state.rows) {
        if (row.id === id) {
          state.rows.delete(key);
          return true;
        }
      }
      return false;
    },
    async upsertHolidays(rows) {
      state.upsertCalls.push(rows);
      const written: Holiday[] = [];
      for (const row of rows) {
        const key = `${row.date}|${row.source ?? "skb_3_menteri"}`;
        const existing = state.rows.get(key);
        const holiday = storedRow(row);
        holiday.id = existing?.id ?? holiday.id;
        state.rows.set(key, holiday);
        written.push(holiday);
      }
      return written;
    },
  };
};

const providerFrom = (
  fetched: ExternalHoliday[] | Error,
): HolidayProvider => ({
  async fetchByYear() {
    if (fetched instanceof Error) throw fetched;
    return fetched;
  },
});

const writeCount = (repo: ReturnType<typeof fakeRepository>) =>
  repo.state.upsertCalls.reduce((sum, call) => sum + call.length, 0);

describe("holiday sync service", () => {
  test("first sync creates every mapped record", async () => {
    const repo = fakeRepository();
    const service = createHolidaySyncService({
      transactionManager,
      holidaysRepository: repo,
      holidayProvider: providerFrom([
        externalRow(),
        externalRow({ date: "2027-02-06", name: "Tahun Baru Imlek 2578 Kongzili" }),
      ]),
    });

    const summary = await service.syncYear(2027);

    expect(summary).toEqual({
      year: 2027,
      fetched: 2,
      created: 2,
      updated: 0,
      unchanged: 0,
      failed: 0,
    });
    expect(writeCount(repo)).toBe(2);
  });

  test("rerun with identical data changes nothing", async () => {
    const batch = [
      externalRow(),
      externalRow({ date: "2027-12-25", name: "Hari Raya Natal" }),
    ];
    const repo = fakeRepository(batch.map((item) => storedRow(mapRow(item))));
    const service = createHolidaySyncService({
      transactionManager,
      holidaysRepository: repo,
      holidayProvider: providerFrom(batch.map((item) => ({ ...item }))),
    });

    const summary = await service.syncYear(2027);

    expect(summary.created).toBe(0);
    expect(summary.updated).toBe(0);
    expect(summary.unchanged).toBe(2);
    expect(writeCount(repo)).toBe(0);
  });

  test("one changed name updates exactly one row", async () => {
    const original = externalRow();
    const changed = { ...original, name: "Hari Raya Idul Fitri 1448 H" };
    const repo = fakeRepository([storedRow(mapRow(original))]);
    const service = createHolidaySyncService({
      transactionManager,
      holidaysRepository: repo,
      holidayProvider: providerFrom([changed]),
    });

    const summary = await service.syncYear(2027);

    expect(summary.updated).toBe(1);
    expect(summary.unchanged).toBe(0);
    expect(writeCount(repo)).toBe(1);
  });

  test("changed source_reference alone does NOT count as updated", async () => {
    const original = externalRow();
    const relabeled = { ...original, id: "hol_relabelled_999" };
    const repo = fakeRepository([storedRow(mapRow(original))]);
    const service = createHolidaySyncService({
      transactionManager,
      holidaysRepository: repo,
      holidayProvider: providerFrom([relabeled]),
    });

    const summary = await service.syncYear(2027);

    expect(summary.unchanged).toBe(1);
    expect(summary.updated).toBe(0);
    expect(writeCount(repo)).toBe(0);
  });

  test("inactive records are skipped upstream", async () => {
    const repo = fakeRepository();
    const service = createHolidaySyncService({
      transactionManager,
      holidaysRepository: repo,
      holidayProvider: providerFrom([
        externalRow(),
        externalRow({ date: "2027-06-01", name: "Arsip", is_active: false }),
      ]),
    });

    const summary = await service.syncYear(2027);

    expect(summary.fetched).toBe(2);
    expect(summary.created).toBe(1);
  });

  test("duplicate date inside the batch aborts the whole sync without writes", async () => {
    const repo = fakeRepository();
    const service = createHolidaySyncService({
      transactionManager,
      holidaysRepository: repo,
      holidayProvider: providerFrom([
        externalRow(),
        externalRow({ id: "hol_dup", name: "Lebaran Hari Kedua" }),
      ]),
    });

    try {
      await service.syncYear(2027);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictError);
      expect((error as ConflictError).code).toBe(
        "HOLIDAY_SYNC_DUPLICATE_BATCH",
      );
    }
    expect(writeCount(repo)).toBe(0);
  });

  test("a single invalid record aborts the whole sync without writes", async () => {
    const repo = fakeRepository();
    const service = createHolidaySyncService({
      transactionManager,
      holidaysRepository: repo,
      holidayProvider: providerFrom([
        externalRow(),
        externalRow({
          id: "hol_bad_date",
          date: "2026-12-25",
          name: "Wrong Year",
        }),
      ]),
    });

    try {
      await service.syncYear(2027);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
    }
    expect(writeCount(repo)).toBe(0);
  });

  test("provider failure propagates and writes nothing", async () => {
    const repo = fakeRepository();
    const service = createHolidaySyncService({
      transactionManager,
      holidaysRepository: repo,
      holidayProvider: providerFrom(
        new ServiceUnavailableError("down", "HOLIDAY_PROVIDER_UNREACHABLE"),
      ),
    });

    await expect(service.syncYear(2027)).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
    expect(writeCount(repo)).toBe(0);
  });

  test("existing MANUAL rows on the same date do not block creation", async () => {
    const manual = storedRow({
      name: "Input Manual Admin",
      date: "2027-03-14",
      category: "lebaran",
      isJointLeave: false,
      source: "manual",
      sourceReference: null,
    });
    const repo = fakeRepository([manual]);
    const service = createHolidaySyncService({
      transactionManager,
      holidaysRepository: repo,
      holidayProvider: providerFrom([externalRow()]),
    });

    const summary = await service.syncYear(2027);

    expect(summary.created).toBe(1);
    expect(writeCount(repo)).toBe(1);
  });
});

// helper: map an external record through the real mapper so fixtures stay honest
function mapRow(item: ExternalHoliday): NewHoliday {
  return mapExternalHoliday(
    item,
    item.date.startsWith("2027") ? 2027 : 2026,
  );
}
