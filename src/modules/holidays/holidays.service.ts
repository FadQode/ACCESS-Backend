import type { Holiday } from "../../db/schema";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors";
import type { HolidaysRepository } from "./holidays.repository";
import type {
  CalendarDay,
  CalendarDayHoliday,
  CreateHolidayInput,
  HolidayCategory,
  HolidayFilters,
  HolidayOverview,
  HolidayStatus,
  HolidaySummary,
  LongWeekend,
  MonitoringPeriod,
  MonitoringRule,
  UpdateHolidayInput,
} from "./holidays.types";
import { MONITORING_OVERRIDE_MAX_DAYS } from "./holidays.types";

// ---------------------------------------------------------------------------
// Pure ISO-date helpers. All math is UTC-based on "YYYY-MM-DD" strings so the
// engine is timezone-safe and works across month/year boundaries (Nataru).
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export const parseIsoDateMs = (value: string): number => {
  const match = isoDatePattern.exec(value);
  if (!match) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return Date.UTC(year, month - 1, day);
};

export const msToIsoDate = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

export const addDays = (isoDate: string, days: number): string =>
  msToIsoDate(parseIsoDateMs(isoDate) + days * MS_PER_DAY);

/** Days from `from` to `to` (positive when `to` is later). */
export const diffInDays = (from: string, to: string): number =>
  Math.round((parseIsoDateMs(to) - parseIsoDateMs(from)) / MS_PER_DAY);

/** 0 = Sunday ... 6 = Saturday. */
export const getWeekday = (isoDate: string): number =>
  new Date(parseIsoDateMs(isoDate)).getUTCDay();

// Weekend = Saturday (6) + Sunday (0). Friday is a working day.
export const isWeekendDate = (isoDate: string): boolean => {
  const weekday = getWeekday(isoDate);
  return weekday === 0 || weekday === 6;
};

export const todayJakarta = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );

// ---------------------------------------------------------------------------
// Monitoring rules: application constants, deliberately not database data.
// ---------------------------------------------------------------------------

export const MONITORING_RULES: Record<HolidayCategory, MonitoringRule> = {
  lebaran: { before: 30, after: 10 },
  nataru: { before: 10, after: 10 },
  imlek: { before: 7, after: 7 },
  other_long_holiday: { before: 7, after: 7 },
  regular_holiday: { before: 0, after: 0 },
};

type MonitoringRuleSource = Pick<
  Holiday,
  "date" | "category" | "monitoringBefore" | "monitoringAfter"
>;

/**
 * A monitoring override must set both sides together and stay within bounds.
 * Setting only one side would silently fall back to the category rule and
 * confuse the operator, so it is rejected instead.
 */
const assertValidMonitoringOverride = (input: {
  monitoringBefore?: number | null;
  monitoringAfter?: number | null;
}): void => {
  const before = input.monitoringBefore;
  const after = input.monitoringAfter;
  const hasBefore = before !== undefined && before !== null;
  const hasAfter = after !== undefined && after !== null;

  if (!hasBefore && !hasAfter) return;

  if (hasBefore !== hasAfter) {
    throw new ValidationError(
      "monitoringBefore and monitoringAfter must be set together",
      {},
      "HOLIDAY_MONITORING_OVERRIDE_INCOMPLETE",
    );
  }

  for (const [name, value] of [
    ["monitoringBefore", before],
    ["monitoringAfter", after],
  ] as const) {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > MONITORING_OVERRIDE_MAX_DAYS
    ) {
      throw new ValidationError(
        `${name} must be an integer between 0 and ${MONITORING_OVERRIDE_MAX_DAYS}`,
        {},
        "HOLIDAY_MONITORING_OVERRIDE_INVALID",
      );
    }
  }
};

const resolveMonitoringRule = (
  holiday: MonitoringRuleSource,
): MonitoringRule & { isOverride: boolean } => {
  const isOverride =
    holiday.monitoringBefore !== null && holiday.monitoringAfter !== null;

  if (isOverride) {
    return {
      before: holiday.monitoringBefore!,
      after: holiday.monitoringAfter!,
      isOverride: true,
    };
  }

  return { ...MONITORING_RULES[holiday.category], isOverride: false };
};

export const calculateMonitoringPeriod = (
  holiday: MonitoringRuleSource,
): MonitoringPeriod => {
  const rule = resolveMonitoringRule(holiday);
  return {
    start: addDays(holiday.date, -rule.before),
    end: addDays(holiday.date, rule.after),
    before: rule.before,
    after: rule.after,
    isOverride: rule.isOverride,
  };
};

const withinMonitoring = (
  holiday: MonitoringRuleSource,
  date: string,
): boolean => {
  if (holiday.date === date) return true;
  const period = calculateMonitoringPeriod(holiday);
  return date >= period.start && date <= period.end;
};

const toCalendarDayHoliday = (
  holiday: Holiday,
): CalendarDayHoliday => ({
  name: holiday.name,
  date: holiday.date,
  category: holiday.category,
  isJointLeave: holiday.isJointLeave,
});

const toSummary = (holiday: Holiday): HolidaySummary => ({
  name: holiday.name,
  date: holiday.date,
  category: holiday.category,
});

/**
 * Resolve the condition of a single date against a set of holidays.
 * Holidays must be sorted by date ascending.
 */
export interface DateCondition {
  status: HolidayStatus;
  relativeDay: number | null;
  holiday: Holiday | null;
}

export const resolveDateCondition = (
  date: string,
  holidaysSorted: Holiday[],
): DateCondition => {
  const relevant = holidaysSorted.filter((holiday) =>
    withinMonitoring(holiday, date),
  );

  if (relevant.length === 0) {
    return { status: "normal", relativeDay: null, holiday: null };
  }

  const exact = relevant.find((holiday) => holiday.date === date);
  const closest =
    exact ??
    [...relevant].sort(
      (a, b) =>
        Math.abs(diffInDays(date, a.date)) -
          Math.abs(diffInDays(date, b.date)) || a.date.localeCompare(b.date),
    )[0];

  if (!closest) {
    return { status: "normal", relativeDay: null, holiday: null };
  }

  return {
    status: exact ? "holiday" : "monitoring",
    // Negative before H (H-4), zero on H, positive after H (H+10).
    relativeDay: diffInDays(closest.date, date),
    holiday: closest,
  };
};

const isNonWorking = (
  date: string,
  holidaysByDate: Map<string, Holiday[]>,
): boolean =>
  isWeekendDate(date) || (holidaysByDate.get(date)?.length ?? 0) > 0;

const groupLongWeekends = (
  rangeStart: string,
  rangeEnd: string,
  holidaysByDate: Map<string, Holiday[]>,
): LongWeekend[] => {
  const groups: Array<{ start: string; end: string; hasHoliday: boolean }> =
    [];

  let cursor = rangeStart;
  while (diffInDays(cursor, rangeEnd) >= 0) {
    if (isNonWorking(cursor, holidaysByDate)) {
      const start = cursor;
      let end = cursor;
      let hasHoliday = (holidaysByDate.get(cursor)?.length ?? 0) > 0;

      let next = addDays(end, 1);
      while (diffInDays(next, rangeEnd) >= 0 && isNonWorking(next, holidaysByDate)) {
        end = next;
        hasHoliday = hasHoliday || (holidaysByDate.get(end)?.length ?? 0) > 0;
        next = addDays(end, 1);
      }

      groups.push({ start, end, hasHoliday });
      cursor = addDays(end, 1);
    } else {
      cursor = addDays(cursor, 1);
    }
  }

  return groups
    .filter((group) => group.hasHoliday)
    .map((group) => ({
      type: "long_weekend" as const,
      start: group.start,
      end: group.end,
      duration: diffInDays(group.start, group.end) + 1,
    }));
};

export interface CalendarResult {
  period: { start: string; end: string };
  days: CalendarDay[];
  longWeekends: LongWeekend[];
}

const CALENDAR_PADDING_DAYS = 2;

export const buildCalendar = (
  start: string,
  end: string,
  rangeHolidays: Holiday[],
): CalendarResult => {
  if (diffInDays(start, end) < 0) {
    throw new Error("Calendar start must be before or equal to end");
  }

  const holidaysByDate = new Map<string, Holiday[]>();
  for (const holiday of rangeHolidays) {
    const bucket = holidaysByDate.get(holiday.date);
    if (bucket) bucket.push(holiday);
    else holidaysByDate.set(holiday.date, [holiday]);
  }

  // Pad both edges so long-weekend groups and bridge days touching the
  // requested boundaries are still detected correctly.
  const paddedStart = addDays(start, -CALENDAR_PADDING_DAYS);
  const paddedEnd = addDays(end, CALENDAR_PADDING_DAYS);

  const longWeekends = groupLongWeekends(paddedStart, paddedEnd, holidaysByDate)
    .filter(
      (group) =>
        diffInDays(start, group.end) >= 0 && diffInDays(group.start, end) >= 0,
    )
    .sort((a, b) => a.start.localeCompare(b.start));

  const isBridgeDay = (date: string): boolean => {
    if (isNonWorking(date, holidaysByDate)) return false;
    return (
      isNonWorking(addDays(date, -1), holidaysByDate) &&
      isNonWorking(addDays(date, 1), holidaysByDate)
    );
  };

  const days: CalendarDay[] = [];
  let cursor = start;
  while (diffInDays(cursor, end) >= 0) {
    const condition = resolveDateCondition(cursor, rangeHolidays);
    const sameDayHolidays = holidaysByDate.get(cursor) ?? [];
    const dayHoliday = sameDayHolidays[0] ?? null;

    days.push({
      date: cursor,
      isWeekend: isWeekendDate(cursor),
      isHoliday: dayHoliday !== null,
      isJointLeave: sameDayHolidays.some((holiday) => holiday.isJointLeave),
      isBridgeDay: isBridgeDay(cursor),
      isMonitoring: condition.status !== "normal",
      relativeDay:
        condition.holiday && condition.status !== "normal"
          ? condition.relativeDay
          : null,
      holiday: dayHoliday ? toCalendarDayHoliday(dayHoliday) : null,
    });
    cursor = addDays(cursor, 1);
  }

  return {
    period: { start, end },
    days,
    longWeekends,
  };
};

export const createHolidaysService = (repository: HolidaysRepository) => ({
  async getHolidays(filters?: HolidayFilters): Promise<Holiday[]> {
    return repository.findHolidays(filters);
  },

  async getHolidayById(id: string): Promise<Holiday> {
    const holiday = await repository.findHolidayById(id);
    if (!holiday) {
      throw new NotFoundError("Holiday not found", "HOLIDAY_NOT_FOUND");
    }
    return holiday;
  },

  async getCalendar(start: string, end: string): Promise<CalendarResult> {
    if (diffInDays(start, end) < 0) {
      throw new ConflictError(
        "Calendar start must be before or equal to end",
        "HOLIDAY_CALENDAR_INVALID_RANGE",
      );
    }
    // A holiday outside the requested range can still paint days inside it
    // through its monitoring window (up to H-before before the range start,
    // H-after past the range end). Fetch wide enough to include those, using
    // the largest of the category defaults and any per-holiday override.
    const padding = MONITORING_OVERRIDE_MAX_DAYS;
    const rangeHolidays = await repository.findHolidaysInRange(
      addDays(start, -padding),
      addDays(end, padding),
    );
    return buildCalendar(start, end, rangeHolidays);
  },

  async getOverview(referenceDateInput?: string): Promise<HolidayOverview> {
    const referenceDate = referenceDateInput ?? todayJakarta();
    const all = await repository.findHolidays();
    const condition = resolveDateCondition(referenceDate, all);

    const monitoringPeriod =
      condition.holiday && condition.status !== "normal"
        ? calculateMonitoringPeriod(condition.holiday)
        : null;

    const nextCandidate = all
      .filter(
        (holiday) =>
          holiday.date > referenceDate &&
          calculateMonitoringPeriod(holiday).before > 0,
      )
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    return {
      status: condition.status,
      referenceDate,
      relativeDay: condition.status === "normal" ? null : condition.relativeDay,
      currentHoliday: condition.holiday ? toSummary(condition.holiday) : null,
      monitoringPeriod,
      next: nextCandidate
        ? {
            holiday: toSummary(nextCandidate),
            monitoring: calculateMonitoringPeriod(nextCandidate),
          }
        : null,
      rules: MONITORING_RULES,
    };
  },

  async createHoliday(input: CreateHolidayInput): Promise<Holiday> {
    assertValidMonitoringOverride(input);
    await this.assertNoDuplicate(input.date, input.source ?? "manual");
    return repository.createHoliday({ isJointLeave: false, source: "manual", ...input });
  },

  async updateHoliday(
    id: string,
    patch: UpdateHolidayInput,
  ): Promise<Holiday> {
    const existing = await repository.findHolidayById(id);
    if (!existing) {
      throw new NotFoundError("Holiday not found", "HOLIDAY_NOT_FOUND");
    }

    // Validate the override against the values the row will actually have,
    // so a partial patch that clears only one side is rejected.
    assertValidMonitoringOverride({
      monitoringBefore:
        patch.monitoringBefore !== undefined
          ? patch.monitoringBefore
          : existing.monitoringBefore,
      monitoringAfter:
        patch.monitoringAfter !== undefined
          ? patch.monitoringAfter
          : existing.monitoringAfter,
    });

    const nextDate = patch.date ?? existing.date;
    const nextSource = patch.source ?? existing.source;
    if (nextDate !== existing.date || nextSource !== existing.source) {
      await this.assertNoDuplicate(nextDate, nextSource, id);
    }

    const updated = await repository.updateHoliday(id, patch);
    if (!updated) {
      throw new NotFoundError("Holiday not found", "HOLIDAY_NOT_FOUND");
    }
    return updated;
  },

  async deleteHoliday(id: string): Promise<void> {
    const deleted = await repository.deleteHoliday(id);
    if (!deleted) {
      throw new NotFoundError("Holiday not found", "HOLIDAY_NOT_FOUND");
    }
  },

  async assertNoDuplicate(
    date: string,
    source: Holiday["source"],
    ignoreId?: string,
  ): Promise<void> {
    const existing = await repository.findHolidayByDateAndSource(date, source);
    if (existing && existing.id !== ignoreId) {
      throw new ConflictError(
        `Holiday with the same date (${date}) and source (${source}) already exists`,
        "HOLIDAY_DUPLICATE",
      );
    }
  },
});

export type HolidaysService = ReturnType<typeof createHolidaysService>;
