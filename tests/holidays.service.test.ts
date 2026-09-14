import { describe, expect, test } from "bun:test";

import type { Holiday } from "../src/db/schema";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../src/shared/errors";
import {
  addDays,
  buildCalendar,
  calculateMonitoringPeriod,
  createHolidaysService,
  diffInDays,
  resolveDateCondition,
} from "../src/modules/holidays/holidays.service";
import type { HolidaysRepository } from "../src/modules/holidays/holidays.repository";
import type { HolidayCategory } from "../src/modules/holidays/holidays.types";

const now = new Date("2026-08-25T00:00:00.000Z");

let seq = 0;
const holiday = (
  date: string,
  category: HolidayCategory,
  overrides: Partial<Holiday> = {},
): Holiday => ({
  id: `00000000-0000-4000-800b-${String(++seq).padStart(12, "0")}`,
  name: `Holiday ${date}`,
  date,
  category,
  isJointLeave: false,
  source: "skb_3_menteri",
  sourceReference: null,
  monitoringBefore: null,
  monitoringAfter: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const lebaran2027 = [
  holiday("2027-03-14", "lebaran", { name: "Lebaran" }),
  holiday("2027-03-15", "lebaran", {
    name: "Cuti Bersama Lebaran",
    isJointLeave: true,
  }),
];

const sorted = (holidays: Holiday[]) =>
  [...holidays].sort((a, b) => a.date.localeCompare(b.date));

describe("date helpers", () => {
  test("addDays crosses month and year boundaries", () => {
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  test("diffInDays is sign-aware", () => {
    expect(diffInDays("2027-03-10", "2027-03-14")).toBe(4);
    expect(diffInDays("2027-03-14", "2027-03-10")).toBe(-4);
    expect(diffInDays("2027-03-14", "2027-03-14")).toBe(0);
  });
});

describe("monitoring periods", () => {
  test("lebaran window is H-30 / H+10", () => {
    const first = lebaran2027[0]!;
    const period = calculateMonitoringPeriod(first);
    expect(period).toEqual({
      start: "2027-02-12",
      end: "2027-03-24",
      before: 30,
      after: 10,
      isOverride: false,
    });
  });

  test("regular_holiday has no monitoring window", () => {
    const period = calculateMonitoringPeriod(holiday("2026-05-01", "regular_holiday"));
    expect(period.start).toBe("2026-05-01");
    expect(period.end).toBe("2026-05-01");
  });
});

describe("resolveDateCondition", () => {
  const resolve = resolveDateCondition;

  test("H-30 boundary is monitoring", () => {
    const result = resolve("2027-02-12", lebaran2027);
    expect(result.status).toBe("monitoring");
    expect(result.relativeDay).toBe(-30);
  });

  test("day before window start is normal", () => {
    expect(resolve("2027-02-11", lebaran2027).status).toBe("normal");
  });

  test("H-4 reports relative day", () => {
    const result = resolve("2027-03-10", lebaran2027);
    expect(result.status).toBe("monitoring");
    expect(result.relativeDay).toBe(-4);
  });

  test("H is holiday with relativeDay 0", () => {
    const result = resolve("2027-03-14", lebaran2027);
    expect(result.status).toBe("holiday");
    expect(result.relativeDay).toBe(0);
    expect(result.holiday?.name).toBe("Lebaran");
  });

  test("H+10 boundary is monitoring, H+11 is normal", () => {
    const single = [holiday("2027-03-14", "lebaran")];
    expect(resolve("2027-03-24", single).status).toBe("monitoring");
    expect(resolve("2027-03-25", single).status).toBe("normal");
  });

  test("regular_holiday only resolves on the exact date", () => {
    const regular = [holiday("2026-05-01", "regular_holiday")];
    expect(resolve("2026-05-01", regular).status).toBe("holiday");
    expect(resolve("2026-04-30", regular).status).toBe("normal");
  });

  test("two holidays in one window pick the closest", () => {
    const result = resolve("2027-03-20", lebaran2027);
    expect(result.status).toBe("monitoring");
    expect(result.holiday?.date).toBe("2027-03-15");
    expect(result.relativeDay).toBe(5);
  });
});

describe("buildCalendar", () => {
  test("marks weekend, holiday, joint leave, monitoring and bridge flags", () => {
    // Realistic Nataru span across years: Thu cuti bersama, Fri Natal,
    // Sat/Sun weekend, Mon bridge, Tue work.
    const nataru = [
      holiday("2026-12-24", "nataru", { isJointLeave: true }),
      holiday("2026-12-25", "nataru", { name: "Natal" }),
    ];
    const calendar = buildCalendar(
      "2026-12-24",
      "2026-12-29",
      sorted([...nataru]),
    );

    const byDate = new Map(calendar.days.map((day) => [day.date, day]));

    expect(byDate.get("2026-12-24")?.isHoliday).toBe(true);
    expect(byDate.get("2026-12-24")?.isJointLeave).toBe(true);
    // Natal 2026 falls on Friday: holiday but still a working-week day
    expect(byDate.get("2026-12-25")?.isWeekend).toBe(false);
    expect(byDate.get("2026-12-25")?.isHoliday).toBe(true);
    expect(byDate.get("2026-12-26")?.isWeekend).toBe(true);
    expect(byDate.get("2026-12-27")?.isWeekend).toBe(true);
    // Monday after a holiday cluster followed by working Tuesday: not a bridge
    expect(byDate.get("2026-12-28")?.isBridgeDay).toBe(false);

    // Long weekend Thu-Sun containing holidays
    expect(calendar.longWeekends).toContainEqual({
      type: "long_weekend",
      start: "2026-12-24",
      end: "2026-12-27",
      duration: 4,
    });
  });

  test("detects weekend-work-holiday bridge day", () => {
    // Sat 14 / Sun 15 weekend, Tue 17 Imlek -> Mon 16 is a bridge day
    const imlek = [holiday("2027-02-17", "imlek")];
    const calendar = buildCalendar("2027-02-15", "2027-02-17", imlek);
    const monday = calendar.days.find((day) => day.date === "2027-02-15");
    expect(monday?.isBridgeDay).toBe(false);

    const imlekTuesday = holiday("2027-02-16", "imlek");
    const calendar2 = buildCalendar("2027-02-14", "2027-02-16", [imlekTuesday]);
    // Mon 15: prev Sun weekend (non-working), next Mon 16 holiday (non-working)
    expect(calendar2.days.find((d) => d.date === "2027-02-15")?.isBridgeDay).toBe(
      true,
    );
  });

  test("detects friday long weekend and monday long weekend", () => {
    const fridayHoliday = [holiday("2026-05-01", "regular_holiday")];
    const fridayCalendar = buildCalendar("2026-05-01", "2026-05-03", fridayHoliday);
    expect(fridayCalendar.longWeekends).toEqual([
      { type: "long_weekend", start: "2026-05-01", end: "2026-05-03", duration: 3 },
    ]);

    const mondayHoliday = [holiday("2026-06-01", "regular_holiday")];
    const mondayCalendar = buildCalendar("2026-05-30", "2026-06-01", mondayHoliday);
    expect(mondayCalendar.longWeekends).toEqual([
      { type: "long_weekend", start: "2026-05-30", end: "2026-06-01", duration: 3 },
    ]);
  });

  test("calendar range spanning year boundary works", () => {
    const nataruSpan = [
      holiday("2026-12-25", "nataru"),
      holiday("2027-01-01", "nataru"),
    ];
    const calendar = buildCalendar("2026-12-30", "2027-01-02", nataruSpan);
    expect(calendar.days.length).toBe(4);
    expect(calendar.days[0]?.date).toBe("2026-12-30");
    expect(calendar.days[3]?.date).toBe("2027-01-02");
    expect(calendar.days.find((d) => d.date === "2027-01-01")?.isHoliday).toBe(
      true,
    );
  });
});

const fakeRepository = (
  holidays: Holiday[],
): HolidaysRepository => ({
  async findHolidays() {
    return sorted(holidays);
  },
  async findHolidaysInRange(start, end) {
    return sorted(
      holidays.filter((h) => h.date >= start && h.date <= end),
    );
  },
  async findHolidayById(id) {
    return holidays.find((h) => h.id === id) ?? null;
  },
  async findHolidayByDateAndSource(date, source) {
    return holidays.find((h) => h.date === date && h.source === source) ?? null;
  },
  async createHoliday(input) {
    return holiday(input.date, input.category, { ...input }) as Holiday;
  },
  async updateHoliday(id, patch) {
    const found = holidays.find((h) => h.id === id);
    if (!found) return null;
    Object.assign(found, patch);
    return found;
  },
    async deleteHoliday(id) {
      const index = holidays.findIndex((h) => h.id === id);
      if (index === -1) return false;
      holidays.splice(index, 1);
      return true;
    },
    async upsertHolidays() {
      // not exercised by holidays.service tests
      return [];
    },
  });

describe("holidays service calendar", () => {
  test("monitoring window reaches into range even when holiday date is outside it", async () => {
    const data = sorted([holiday("2027-03-14", "lebaran", { name: "Lebaran" })]);
    const service = createHolidaysService(fakeRepository(data));
    const result = await service.getCalendar("2027-03-10", "2027-03-10");
    const day = result.days[0]!;
    expect(day.isMonitoring).toBe(true);
    expect(day.relativeDay).toBe(-4);
  });
});

describe("holidays service CRUD rules", () => {
  test("create rejects duplicate date+source", async () => {
    const service = createHolidaysService(fakeRepository(sorted(lebaran2027)));
    await expect(
      service.createHoliday({
        name: "Duplikat",
        date: "2027-03-14",
        category: "lebaran",
        source: "skb_3_menteri",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("create allows same date different source", async () => {
    const service = createHolidaysService(fakeRepository(sorted(lebaran2027)));
    await expect(
      service.createHoliday({
        name: "Manual entry same day",
        date: "2027-03-14",
        category: "lebaran",
        source: "manual",
      }),
    ).resolves.toBeTruthy();
  });

  test("update rejects moving onto an existing date+source", async () => {
    const data = sorted(lebaran2027);
    const service = createHolidaysService(fakeRepository(data));
    const firstId = data[0]!.id;
    await expect(
      service.updateHoliday(firstId, { date: "2027-03-15" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("delete unknown id throws NotFoundError", async () => {
    const service = createHolidaysService(fakeRepository([]));
    await expect(
      service.deleteHoliday("00000000-0000-4000-800b-000000000000"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("overview", () => {
  test("reports monitoring status with next period across years", async () => {
    const data = sorted([
      holiday("2026-12-25", "nataru", { name: "Natal" }),
      holiday("2027-03-14", "lebaran", { name: "Lebaran" }),
    ]);
    const service = createHolidaysService(fakeRepository(data));

    const overview = await service.getOverview("2026-12-20");
    expect(overview.status).toBe("monitoring");
    expect(overview.currentHoliday?.name).toBe("Natal");
    expect(overview.monitoringPeriod?.start).toBe("2026-12-15");
    expect(overview.next?.holiday.name).toBe("Natal"); // same holiday still upcoming (date > reference)
    expect(overview.rules.lebaran.before).toBe(30);
  });

  test("normal day still exposes next monitoring period", async () => {
    const data = sorted([holiday("2027-03-14", "lebaran", { name: "Lebaran" })]);
    const service = createHolidaysService(fakeRepository(data));

    const overview = await service.getOverview("2026-08-25");
    expect(overview.status).toBe("normal");
    expect(overview.currentHoliday).toBeNull();
    expect(overview.next?.holiday.name).toBe("Lebaran");
    expect(overview.next?.monitoring.end).toBe("2027-03-24");
  });
});

describe("admin monitoring overrides", () => {
  test("override replaces the category default window", () => {
    const withOverride = holiday("2027-03-14", "regular_holiday", {
      monitoringBefore: 5,
      monitoringAfter: 3,
    });
    const period = calculateMonitoringPeriod(withOverride);

    expect(period).toEqual({
      start: "2027-03-09",
      end: "2027-03-17",
      before: 5,
      after: 3,
      isOverride: true,
    });
  });

  test("override can add a window to a category that has none", () => {
    const data = sorted([
      holiday("2026-05-01", "regular_holiday", {
        name: "Hari Buruh",
        monitoringBefore: 2,
        monitoringAfter: 2,
      }),
    ]);
    const service = createHolidaysService(fakeRepository(data));

    return service.getOverview("2026-04-30").then((overview) => {
      expect(overview.status).toBe("monitoring");
      expect(overview.monitoringPeriod?.isOverride).toBe(true);
      expect(overview.monitoringPeriod?.start).toBe("2026-04-29");
    });
  });

  test("override reaches into a calendar range", async () => {
    const data = sorted([
      holiday("2027-03-14", "regular_holiday", {
        name: "Custom",
        monitoringBefore: 10,
        monitoringAfter: 10,
      }),
    ]);
    const service = createHolidaysService(fakeRepository(data));
    const calendar = await service.getCalendar("2027-03-05", "2027-03-05");

    expect(calendar.days[0]?.isMonitoring).toBe(true);
    expect(calendar.days[0]?.relativeDay).toBe(-9);
  });

  test("createHoliday accepts a valid override", async () => {
    const service = createHolidaysService(fakeRepository([]));
    const created = await service.createHoliday({
      name: "Custom",
      date: "2027-05-01",
      category: "regular_holiday",
      source: "manual",
      monitoringBefore: 4,
      monitoringAfter: 4,
    });

    expect(created.monitoringBefore).toBe(4);
    expect(created.monitoringAfter).toBe(4);
  });

  test("createHoliday rejects setting only one side", async () => {
    const service = createHolidaysService(fakeRepository([]));

    await expect(
      service.createHoliday({
        name: "Custom",
        date: "2027-05-01",
        category: "regular_holiday",
        source: "manual",
        monitoringBefore: 4,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("createHoliday rejects an out-of-range override", async () => {
    const service = createHolidaysService(fakeRepository([]));

    await expect(
      service.createHoliday({
        name: "Custom",
        date: "2027-05-01",
        category: "regular_holiday",
        source: "manual",
        monitoringBefore: 999,
        monitoringAfter: 1,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("updateHoliday rejects a partial patch that clears one side", async () => {
    const data = sorted([
      holiday("2027-03-14", "lebaran", {
        monitoringBefore: 5,
        monitoringAfter: 5,
      }),
    ]);
    const service = createHolidaysService(fakeRepository(data));

    await expect(
      service.updateHoliday(data[0]!.id, { monitoringAfter: null }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("updateHoliday can clear the override back to the category default", async () => {
    const data = sorted([
      holiday("2027-03-14", "lebaran", {
        monitoringBefore: 5,
        monitoringAfter: 5,
      }),
    ]);
    const service = createHolidaysService(fakeRepository(data));

    await service.updateHoliday(data[0]!.id, {
      monitoringBefore: null,
      monitoringAfter: null,
    });

    const period = calculateMonitoringPeriod(data[0]!);
    expect(period.isOverride).toBe(false);
    expect(period.before).toBe(30);
  });
});
