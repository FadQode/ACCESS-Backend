import { describe, expect, test } from "bun:test";

import { createContextSuggestionsService } from "../src/modules/context-suggestions";
import type {
  ContextSuggestionsRepository,
  ReferenceCandidate,
  ResolvedCaseCandidate,
} from "../src/modules/context-suggestions";

const now = new Date();

const referenceCandidate = (
  input: Partial<ReferenceCandidate>,
): ReferenceCandidate => ({
  id: input.id ?? "reference-1",
  title: input.title ?? "SOP banjir Stasiun Tawang",
  category: input.category ?? "facility",
  content:
    input.content ??
    "Akses masuk Stasiun Tawang saat banjir perlu diarahkan oleh petugas gate.",
  fileName: input.fileName ?? null,
  searchText: input.searchText ?? null,
  sourceType: input.sourceType ?? "sop",
  status: input.status ?? "active",
  updatedAt: input.updatedAt ?? now,
  createdAt: input.createdAt ?? now,
});

const resolvedCaseCandidate = (
  input: Partial<ResolvedCaseCandidate>,
): ResolvedCaseCandidate => ({
  complaintId: input.complaintId ?? "complaint-1",
  category: input.category ?? "facility",
  complaintText:
    input.complaintText ??
    "Stasiun Tawang banjir dan akses masuk susah, hubungi saya di rani@mail.com.",
  finalResponse:
    input.finalResponse ??
    "Mohon maaf atas kendalanya. Petugas sudah diarahkan ke area akses masuk.",
  resolvedAt: input.resolvedAt ?? now,
  quickResponseCreatedAt: input.quickResponseCreatedAt ?? now,
});

describe("context suggestions service", () => {
  test("returns scored references and sanitized resolved cases", async () => {
    const service = createContextSuggestionsService({
      async findReferenceCandidates() {
        return [
          referenceCandidate({ id: "reference-1" }),
          referenceCandidate({
            id: "weak-reference",
            title: "Panduan akun",
            category: "account",
            content: "Login aplikasi dan ubah password.",
            sourceType: "guide",
          }),
        ];
      },
      async findResolvedCaseCandidates() {
        return [
          resolvedCaseCandidate({ complaintId: "case-1" }),
          resolvedCaseCandidate({
            complaintId: "case-2",
            complaintText: "Refund belum masuk.",
            category: "refund_cancel",
            finalResponse: "Refund sedang dicek.",
          }),
        ];
      },
    } satisfies ContextSuggestionsRepository);

    const result = await service.getContextSuggestions({
      category: "facility",
      complaintText:
        "Stasiun Tawang banjir dari pagi, akses masuk susah dan petugas belum kasih arahan jelas.",
    });

    expect(result.relevantReferences).toHaveLength(1);
    expect(result.relevantReferences[0]?.id).toBe("reference-1");
    expect(result.similarResolvedCases).toHaveLength(1);
    expect(result.similarResolvedCases[0]?.category).toBe("facility");
    expect(result.similarResolvedCases[0]?.complaintTextPreview).not.toContain(
      "rani@mail.com",
    );
    expect(result.similarResolvedCases[0]).not.toHaveProperty("complaintId");
    expect(result.similarResolvedCases[0]).not.toHaveProperty("score");
  });

  test("deduplicates resolved cases and respects top limits", async () => {
    const references = Array.from({ length: 5 }, (_, index) =>
      referenceCandidate({
        id: `reference-${index}`,
        title: `SOP banjir akses stasiun ${index}`,
      }),
    );
    const cases = Array.from({ length: 5 }, (_, index) =>
      resolvedCaseCandidate({
        complaintId: index === 1 ? "case-0" : `case-${index}`,
        complaintText:
          index === 1
            ? "Akses masuk stasiun banjir dan petugas belum jelas."
            : `Akses masuk stasiun banjir dan petugas belum jelas ${index}.`,
      }),
    );

    const service = createContextSuggestionsService({
      async findReferenceCandidates() {
        return references;
      },
      async findResolvedCaseCandidates() {
        return cases;
      },
    } satisfies ContextSuggestionsRepository);

    const result = await service.getContextSuggestions({
      category: "facility",
      complaintText: "Akses masuk stasiun banjir dan petugas belum jelas.",
    });

    expect(result.relevantReferences).toHaveLength(3);
    expect(result.similarResolvedCases).toHaveLength(3);
    expect(
      new Set(result.similarResolvedCases.map((item) => item.complaintTextPreview))
        .size,
    ).toBe(3);
  });
});
