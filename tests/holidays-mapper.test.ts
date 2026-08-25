import { describe, expect, test } from "bun:test";

import {
  isActiveExternalHoliday,
  mapExternalHoliday,
  resolveHolidayCategory,
} from "../src/modules/holidays/holidays.mapper";
import type { ExternalHoliday } from "../src/modules/holidays/holidays.types";
import { ValidationError } from "../src/shared/errors";

const raw = (overrides: Partial<ExternalHoliday> = {}): ExternalHoliday => ({
  id: "hol_2027_001",
  date: "2027-03-14",
  name: "Hari Raya Idul Fitri",
  type: "nasional",
  is_joint_leave: 0,
  description: null,
  source: "SKB 3 Menteri",
  year: 2027,
  is_active: true,
  ...overrides,
});

describe("resolveHolidayCategory", () => {
  test("lebaran variants", () => {
    expect(resolveHolidayCategory("Idul Fitri")).toBe("lebaran");
    expect(resolveHolidayCategory("Hari Raya Idul Fitri")).toBe("lebaran");
    expect(resolveHolidayCategory("Lebaran")).toBe("lebaran");
    // ordering guard: "idul fitri" wins even if other keywords appear
    expect(
      resolveHolidayCategory("Hari Raya Idul Fitri 1448 H Tahun Baru"),
    ).toBe("lebaran");
  });

  test("imlek beats nataru despite containing 'tahun baru'", () => {
    expect(resolveHolidayCategory("Tahun Baru Imlek 2578 Kongzili")).toBe(
      "imlek",
    );
    expect(resolveHolidayCategory("Chinese New Year")).toBe("imlek");
    expect(resolveHolidayCategory("Lunar New Year")).toBe("imlek");
  });

  test("nataru variants", () => {
    expect(resolveHolidayCategory("Hari Raya Natal")).toBe("nataru");
    expect(resolveHolidayCategory("Christmas Day")).toBe("nataru");
    expect(resolveHolidayCategory("Tahun Baru Masehi 2027")).toBe("nataru");
  });

  test("everything else stays regular_holiday", () => {
    expect(resolveHolidayCategory("Hari Suci Nyepi")).toBe("regular_holiday");
    expect(resolveHolidayCategory("Wafat Isa Almasih")).toBe(
      "regular_holiday",
    );
    expect(resolveHolidayCategory("Idul Adha 1448 H")).toBe(
      "regular_holiday",
    );
    expect(resolveHolidayCategory("Hari Buruh Internasional")).toBe(
      "regular_holiday",
    );
    expect(resolveHolidayCategory("Maulid Nabi Muhammad Saw")).toBe(
      "regular_holiday",
    );
    // other_long_holiday is never auto-assigned
    expect(resolveHolidayCategory("Cuti Bersama Umum")).not.toBe(
      "other_long_holiday",
    );
  });
});

describe("isActiveExternalHoliday", () => {
  test("treats explicit false/0/'0' as inactive, rest as active", () => {
    expect(isActiveExternalHoliday(raw({ is_active: true }))).toBe(true);
    expect(isActiveExternalHoliday(raw({ is_active: false }))).toBe(false);
    expect(isActiveExternalHoliday(raw({ is_active: 0 }))).toBe(false);
    expect(isActiveExternalHoliday(raw({ is_active: "0" }))).toBe(false);
    expect(isActiveExternalHoliday(raw({}))).toBe(true);
  });
});

describe("mapExternalHoliday", () => {
  test("maps a valid record to an ACCESS holiday row", () => {
    const mapped = mapExternalHoliday(raw(), 2027);

    expect(mapped).toEqual({
      name: "Hari Raya Idul Fitri",
      date: "2027-03-14",
      category: "lebaran",
      isJointLeave: false,
      source: "skb_3_menteri",
      sourceReference: "hol_2027_001",
    });
  });

  test("converts joint leave flags", () => {
    expect(mapExternalHoliday(raw({ is_joint_leave: 1 }), 2027).isJointLeave).toBe(
      true,
    );
    expect(
      mapExternalHoliday(raw({ is_joint_leave: true }), 2027).isJointLeave,
    ).toBe(true);
    expect(
      mapExternalHoliday(raw({ is_joint_leave: "1" }), 2027).isJointLeave,
    ).toBe(true);
    expect(mapExternalHoliday(raw({}), 2027).isJointLeave).toBe(false);
  });

  test("rejects missing name", () => {
    expect(() => mapExternalHoliday(raw({ name: "" }), 2027)).toThrow(
      ValidationError,
    );
    expect(() => mapExternalHoliday(raw({ name: undefined as never }), 2027))
      .toThrow(ValidationError);
  });

  test("rejects invalid date formats", () => {
    expect(() => mapExternalHoliday(raw({ date: "14/03/2027" }), 2027)).toThrow(
      ValidationError,
    );
    expect(() => mapExternalHoliday(raw({ date: "2027-02-30" }), 2027)).toThrow(
      ValidationError,
    );
  });

  test("rejects dates outside the requested year", () => {
    expect(() => mapExternalHoliday(raw({ date: "2026-12-25" }), 2027)).toThrow(
      ValidationError,
    );
  });
});
