import { BadRequestError } from "../errors";

export type ReportGroupBy = "day" | "week" | "month";
export type ReportPeriodKey = "7d" | "30d" | "90d" | "custom";

export interface ReportPeriodQuery {
  from?: string;
  groupBy?: ReportGroupBy;
  period?: ReportPeriodKey;
  to?: string;
}

export interface ResolvedReportPeriod {
  from: Date;
  fromDate: string;
  groupBy: ReportGroupBy;
  timezone: "Asia/Jakarta";
  toDate: string;
  toExclusive: Date;
}

const jakartaOffsetMs = 7 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

const periodDays: Record<Exclude<ReportPeriodKey, "custom">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const parseYmd = (value: string, field: string): [number, number, number] => {
  assertValidYmd(value, field);
  const [year, month, day] = value.split("-").map(Number);

  return [year ?? 0, month ?? 0, day ?? 0];
};

const assertValidYmd = (value: string, field: string): void => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestError(
      `${field} must use YYYY-MM-DD format`,
      "REPORT_DATE_INVALID",
    );
  }

  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestError(
      `${field} must be a valid date`,
      "REPORT_DATE_INVALID",
    );
  }
};

const compareYmd = (left: string, right: string): number =>
  left.localeCompare(right);

export const addDaysToYmd = (value: string, days: number): string => {
  const [year, month, day] = parseYmd(value, "date");
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear().toString().padStart(4, "0"),
    (date.getUTCMonth() + 1).toString().padStart(2, "0"),
    date.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
};

export const daysBetweenInclusive = (from: string, to: string): number => {
  const [fromYear, fromMonth, fromDay] = parseYmd(from, "from");
  const [toYear, toMonth, toDay] = parseYmd(to, "to");
  const fromUtc = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toUtc = Date.UTC(toYear, toMonth - 1, toDay);

  return Math.floor((toUtc - fromUtc) / dayMs) + 1;
};

export const ymdToJakartaStartDate = (value: string): Date => {
  const [year, month, day] = parseYmd(value, "date");

  return new Date(Date.UTC(year, month - 1, day) - jakartaOffsetMs);
};

export const dateToJakartaYmd = (value: Date): string => {
  const jakartaDate = new Date(value.getTime() + jakartaOffsetMs);

  return [
    jakartaDate.getUTCFullYear().toString().padStart(4, "0"),
    (jakartaDate.getUTCMonth() + 1).toString().padStart(2, "0"),
    jakartaDate.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
};

const inferGroupBy = (
  period: ReportPeriodKey,
  fromDate: string,
  toDate: string,
): ReportGroupBy => {
  if (period === "7d" || period === "30d") return "day";
  if (period === "90d") return "week";

  const days = daysBetweenInclusive(fromDate, toDate);
  if (days <= 31) return "day";
  if (days <= 180) return "week";
  return "month";
};

export const resolveReportPeriod = (
  query: ReportPeriodQuery,
  defaultPeriod: Exclude<ReportPeriodKey, "custom">,
  now = new Date(),
): ResolvedReportPeriod => {
  const period = query.period ?? defaultPeriod;

  if (period === "custom" && (!query.from || !query.to)) {
    throw new BadRequestError(
      "from and to are required for custom period",
      "REPORT_CUSTOM_PERIOD_REQUIRES_RANGE",
    );
  }

  if ((query.from && !query.to) || (!query.from && query.to)) {
    throw new BadRequestError(
      "from and to must be provided together",
      "REPORT_DATE_RANGE_INCOMPLETE",
    );
  }

  let fromDate: string;
  let toDate: string;

  if (query.from && query.to) {
    assertValidYmd(query.from, "from");
    assertValidYmd(query.to, "to");
    fromDate = query.from;
    toDate = query.to;
  } else {
    if (period === "custom") {
      throw new BadRequestError(
        "from and to are required for custom period",
        "REPORT_CUSTOM_PERIOD_REQUIRES_RANGE",
      );
    }

    const days = periodDays[period];
    if (!days) {
      throw new BadRequestError(
        "Unsupported report period",
        "REPORT_PERIOD_INVALID",
      );
    }

    toDate = dateToJakartaYmd(now);
    fromDate = addDaysToYmd(toDate, -(days - 1));
  }

  if (compareYmd(fromDate, toDate) > 0) {
    throw new BadRequestError(
      "from must be before or equal to to",
      "REPORT_DATE_RANGE_INVALID",
    );
  }

  return {
    from: ymdToJakartaStartDate(fromDate),
    fromDate,
    groupBy: query.groupBy ?? inferGroupBy(period, fromDate, toDate),
    timezone: "Asia/Jakarta",
    toDate,
    toExclusive: ymdToJakartaStartDate(addDaysToYmd(toDate, 1)),
  };
};
