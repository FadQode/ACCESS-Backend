import { describe, expect, test } from "bun:test";

import {
  buildQueryEmbeddedText,
  buildReferenceEmbeddedText,
  buildResolvedCaseEmbeddedText,
} from "../src/modules/embeddings";

describe("embedding text builder", () => {
  test("builds normalized reference embedded text", () => {
    expect(
      buildReferenceEmbeddedText({
        category: "payment",
        content: "  Saldo terpotong   dan tiket belum muncul. ",
        fileName: "sop-payment.pdf",
        sourceType: "policy",
        title: " SOP Saldo Terpotong ",
      }),
    ).toBe(
      "SOP Saldo Terpotong payment policy Saldo terpotong dan tiket belum muncul. sop-payment.pdf",
    );
  });

  test("builds resolved case text without customer metadata fields", () => {
    expect(
      buildResolvedCaseEmbeddedText({
        complaintText: "Saldo saya terpotong tapi tiket tidak muncul.",
        finalResponse: "Kami bantu teruskan untuk pengecekan transaksi.",
      }),
    ).toBe(
      "Saldo saya terpotong tapi tiket tidak muncul. Kami bantu teruskan untuk pengecekan transaksi.",
    );
  });

  test("builds query text from category and complaint", () => {
    expect(
      buildQueryEmbeddedText({
        category: "facility",
        complaintText: "Akses stasiun banjir.",
      }),
    ).toBe("facility Akses stasiun banjir.");
  });
});
