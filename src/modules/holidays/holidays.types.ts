import type { Holiday } from "../../db/schema";

export type HolidayCategory = Holiday["category"];
export type HolidaySource = Holiday["source"];

export interface MonitoringRule {
  before: number;
  after: number;
}

/**
 * Upper bound for an admin-supplied monitoring override, in days on each side.
 * Used both for validation and for widening range queries so an override can
 * never reach further than the calendar fetch anticipates.
 */
export const MONITORING_OVERRIDE_MAX_DAYS = 180;

export interface MonitoringPeriod {
  start: string;
  end: string;
  before: number;
  after: number;
  /** True when the window came from this holiday's own override. */
  isOverride: boolean;
}

export interface HolidaySummary {
  name: string;
  date: string;
  category: HolidayCategory;
}

export interface CalendarDayHoliday extends HolidaySummary {
  isJointLeave: boolean;
}

export interface CalendarDay {
  date: string;
  isWeekend: boolean;
  isHoliday: boolean;
  isJointLeave: boolean;
  isBridgeDay: boolean;
  isMonitoring: boolean;
  relativeDay: number | null;
  holiday: CalendarDayHoliday | null;
}

export interface LongWeekend {
  type: "long_weekend";
  start: string;
  end: string;
  duration: number;
}

export type HolidayStatus = "normal" | "monitoring" | "holiday";

export interface HolidayOverview {
  status: HolidayStatus;
  referenceDate: string;
  relativeDay: number | null;
  currentHoliday: HolidaySummary | null;
  monitoringPeriod: MonitoringPeriod | null;
  next: {
    holiday: HolidaySummary;
    monitoring: MonitoringPeriod;
  } | null;
  rules: Record<HolidayCategory, MonitoringRule>;
}

export interface HolidayFilters {
  year?: number;
  category?: HolidayCategory;
  source?: HolidaySource;
}

export interface CreateHolidayInput {
  name: string;
  date: string;
  category: HolidayCategory;
  isJointLeave?: boolean;
  source?: HolidaySource;
  sourceReference?: string | null;
  monitoringBefore?: number | null;
  monitoringAfter?: number | null;
}

export interface UpdateHolidayInput {
  name?: string;
  date?: string;
  category?: HolidayCategory;
  isJointLeave?: boolean;
  source?: HolidaySource;
  sourceReference?: string | null;
  monitoringBefore?: number | null;
  monitoringAfter?: number | null;
}

// ---------------------------------------------------------------------------
// External ingestion
// ---------------------------------------------------------------------------

/**
 * Raw record from an external holiday provider, pre-normalization.
 * Fields stay permissive on purpose: the mapper owns strict validation.
 */
export interface ExternalHoliday {
  id: string;
  date: string;
  name: string;
  type?: string | null;
  is_joint_leave?: number | boolean | string | null;
  description?: string | null;
  source?: string | null;
  year?: number | string | null;
  is_active?: boolean | number | string | null;
}

/** Boundary every holiday source must implement. Replaceable adapter. */
export interface HolidayProvider {
  fetchByYear(year: number): Promise<ExternalHoliday[]>;
}

export interface HolidaySyncSummary {
  year: number;
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
}
