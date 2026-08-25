import type { NewHoliday } from "../../db/schema";
import { ValidationError } from "../../shared/errors";
import { normalizeText } from "../../shared/utils/normalize-text";
import type {
  ExternalHoliday,
  HolidayCategory,
} from "./holidays.types";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Deterministic category resolution from the holiday name.
 * Matcher ORDER MATTERS: more-specific names must win.
 *
 * "Tahun Baru Imlek ..." contains both "imlek" and "tahun baru" — imlek must
 * be checked before nataru or it would be misclassified as nataru.
 */
export const resolveHolidayCategory = (name: string): HolidayCategory => {
  const value = normalizeText(name).toLowerCase();

  if (value.includes("idul fitri") || value === "lebaran") {
    return "lebaran";
  }

  if (
    value.includes("imlek") ||
    value.includes("chinese new year") ||
    value.includes("lunar new year")
  ) {
    return "imlek";
  }

  if (
    value.includes("natal") ||
    value.includes("christmas") ||
    value.includes("tahun baru") ||
    value.includes("new year")
  ) {
    return "nataru";
  }

  // Nyepi, Wafat/Kenaikan Isa Almasih, Idul Adha, Hari Buruh, Maulid, ...
  // other_long_holiday is intentionally never auto-assigned; it is a
  // manual-entry category for future multi-day events.
  return "regular_holiday";
};

const normalizeJointLeave = (value: unknown): boolean =>
  value === true || value === 1 || value === "1";

export const isActiveExternalHoliday = (raw: ExternalHoliday): boolean => {
  const flag = raw.is_active;
  return flag !== false && flag !== 0 && flag !== "0";
};

const isValidIsoCalendarDate = (value: string): boolean => {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const roundtrip = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  )
    .toISOString()
    .slice(0, 10);
  return roundtrip === value;
};

export const mapExternalHoliday = (
  raw: ExternalHoliday,
  requestedYear: number,
): NewHoliday => {
  const label =
    typeof raw.id === "string" && raw.id.trim().length > 0
      ? raw.id.trim()
      : "(no id)";
  const fail = (reason: string): never => {
    throw new ValidationError(
      `External holiday ${label}: ${reason}`,
      { externalId: label },
      "HOLIDAY_SYNC_INVALID_RECORD",
    );
  };

  const name = typeof raw.name === "string" ? normalizeText(raw.name) : "";
  if (!name) fail("missing name");
  if (name.length > 255) fail("name exceeds 255 characters");

  const date = typeof raw.date === "string" ? normalizeText(raw.date) : "";
  if (!isValidIsoCalendarDate(date)) {
    fail(`invalid date format "${date}", expected YYYY-MM-DD`);
  }
  if (!date.startsWith(`${requestedYear}`)) {
    fail(`date ${date} is outside requested year ${requestedYear}`);
  }

  return {
    name,
    date,
    category: resolveHolidayCategory(name),
    isJointLeave: normalizeJointLeave(raw.is_joint_leave),
    source: "skb_3_menteri",
    sourceReference: label,
  };
};
