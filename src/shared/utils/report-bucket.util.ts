import {
  addDaysToYmd,
  type ReportGroupBy,
  type ResolvedReportPeriod,
} from "./report-period.util";

const ymdParts = (value: string): [number, number, number] => {
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  return [year, month, day];
};

const startOfWeek = (value: string): string => {
  const [year, month, day] = ymdParts(value);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  return addDaysToYmd(value, -daysSinceMonday);
};

const startOfMonth = (value: string): string => `${value.slice(0, 7)}-01`;

export const toReportBucket = (
  value: string,
  groupBy: ReportGroupBy,
): string => {
  if (groupBy === "day") return value;
  if (groupBy === "week") return startOfWeek(value);
  return startOfMonth(value);
};

const addMonths = (value: string, months: number): string => {
  const [year, month] = ymdParts(value);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));

  return [
    date.getUTCFullYear().toString().padStart(4, "0"),
    (date.getUTCMonth() + 1).toString().padStart(2, "0"),
    "01",
  ].join("-");
};

export const buildReportBuckets = (
  period: ResolvedReportPeriod,
): string[] => {
  const buckets: string[] = [];
  let cursor = toReportBucket(period.fromDate, period.groupBy);
  const end = toReportBucket(period.toDate, period.groupBy);

  while (cursor <= end) {
    buckets.push(cursor);
    cursor =
      period.groupBy === "month"
        ? addMonths(cursor, 1)
        : addDaysToYmd(cursor, period.groupBy === "week" ? 7 : 1);
  }

  return buckets;
};
