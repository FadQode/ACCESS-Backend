import { describe, expect, test } from "bun:test";

import { createActionRequestGroupingService } from "../src/modules/action-requests/action-request-grouping.service";

describe("action request grouping service", () => {
  test("maps charged-balance missing-ticket payment complaints to the existing payment issue key", () => {
    const service = createActionRequestGroupingService();
    const issueKey = service.detectIssueKey({
      category: "payment",
      complaintText:
        "Saldo sudah terpotong tapi tiket tidak muncul di aplikasi.",
    });

    expect(issueKey).toBe("payment_failed");
    expect(
      service.buildGroupingKey({
        category: "payment",
        issueKey,
      }),
    ).toBe("payment:payment_failed");
  });
});
