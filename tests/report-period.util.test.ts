import { describe, expect, test } from "bun:test";

import { resolveReportPeriod } from "../src/shared/utils/report-period.util";

describe("report period utility", () => {
  test("requires a complete custom range", () => {
    expect(() =>
      resolveReportPeriod({ period: "custom", from: "2026-07-01" }, "30d"),
    ).toThrow(/from and to are required/);
  });

  test("rejects reversed date ranges", () => {
    expect(() =>
      resolveReportPeriod(
        { from: "2026-07-03", to: "2026-07-01" },
        "30d",
      ),
    ).toThrow(/from must be before/);
  });

  test("uses Jakarta day boundaries and infers grouping", () => {
    const period = resolveReportPeriod(
      { from: "2026-07-01", to: "2026-07-07" },
      "30d",
    );

    expect(period).toMatchObject({
      fromDate: "2026-07-01",
      groupBy: "day",
      timezone: "Asia/Jakarta",
      toDate: "2026-07-07",
    });
    expect(period.from.toISOString()).toBe("2026-06-30T17:00:00.000Z");
    expect(period.toExclusive.toISOString()).toBe("2026-07-07T17:00:00.000Z");
  });
});
