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
        tags: [" tiket-tidak-muncul ", "", "pembayaran", "saldo-terpotong"],
        title: " SOP Saldo Terpotong ",
      }),
    ).toBe(
      "SOP Saldo Terpotong payment policy pembayaran saldo-terpotong tiket-tidak-muncul Saldo terpotong dan tiket belum muncul. sop-payment.pdf",
    );
  });

  test("builds reference text from safe public fields only", () => {
    const reference = {
      category: "payment" as const,
      content: "Panduan pembayaran.",
      fileName: null,
      signedUrl: "https://signed-url.example.test/private",
      sourceType: "policy",
      storageBucket: "private-bucket",
      storageKey: "private/storage-key.pdf",
      tags: ["policy-support", "payment"],
      title: "Payment SOP",
    };
    const text = buildReferenceEmbeddedText(reference);

    expect(text).toContain("payment");
    expect(text).toContain("Payment SOP");
    expect(text).not.toContain("private/storage-key.pdf");
    expect(text).not.toContain("private-bucket");
    expect(text).not.toContain("signed-url");
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
