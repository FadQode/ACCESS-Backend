import { describe, expect, test } from "bun:test";

import type {
  EmbeddingConfig,
  SemanticContextConfig,
} from "../src/config/env";
import type { EmbeddingClient } from "../src/integrations/embeddings/embedding.types";
import { createSemanticContextService } from "../src/modules/context-suggestions";
import type {
  SemanticContextRepository,
  SemanticReferenceCandidate,
  SemanticResolvedCaseCandidate,
} from "../src/modules/context-suggestions";

const semanticConfig: SemanticContextConfig = {
  candidateLimit: 10,
  caseLimit: 3,
  categoryBoost: 2,
  enabled: true,
  minRawSimilarity: 0.5,
  minScore: 8.5,
  referenceLimit: 3,
  referenceSourceTypeBoost: 0.5,
  resolvedCaseRecencyBoost: 0.3,
};

const embeddingConfig: EmbeddingConfig = {
  apiKey: "embedding-key",
  batchSize: 16,
  batchServiceUrl: "https://example.test/embed/batch",
  dimension: 384,
  enabled: true,
  healthUrl: "https://example.test/health",
  model: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
  serviceUrl: "https://example.test/embed",
  timeoutMs: 10_000,
};

const vector = Array.from({ length: 384 }, () => 0.1);

const embeddingClient: EmbeddingClient = {
  async embed() {
    return {
      dimension: 384,
      embedding: vector,
      model: embeddingConfig.model,
    };
  },
  async embedBatch() {
    throw new Error("not used");
  },
  async health() {
    throw new Error("not used");
  },
};

const referenceCandidate = (
  input: Partial<SemanticReferenceCandidate>,
): SemanticReferenceCandidate => ({
  category: input.category ?? "payment",
  content:
    input.content ?? "Jika saldo terpotong dan tiket belum muncul, cek transaksi.",
  embeddedText: input.embeddedText ?? "payment saldo terpotong tiket",
  fileName: input.fileName ?? null,
  id: input.id ?? "reference-1",
  similarity: input.similarity ?? 0.7,
  sourceType: input.sourceType ?? "policy",
  title: input.title ?? "SOP saldo terpotong",
  updatedAt: input.updatedAt ?? new Date(),
});

const resolvedCaseCandidate = (
  input: Partial<SemanticResolvedCaseCandidate>,
): SemanticResolvedCaseCandidate => ({
  category: input.category ?? "payment",
  complaintId: input.complaintId ?? "complaint-1",
  complaintText:
    input.complaintText ??
    "Saldo saya terpotong tapi tiket tidak muncul. Email saya user@mail.com",
  finalResponse:
    input.finalResponse ??
    "Kami memahami kendala pembayaran Anda dan akan melakukan pengecekan.",
  quickResponseSessionId: input.quickResponseSessionId ?? "session-1",
  resolvedAt: input.resolvedAt ?? new Date(),
  similarity: input.similarity ?? 0.65,
});

describe("semantic context service", () => {
  test("returns sanitized ranked semantic context without public scores", async () => {
    const repository: SemanticContextRepository = {
      async findRelevantReferenceCandidates() {
        return [
          referenceCandidate({ id: "weak", similarity: 0.4 }),
          referenceCandidate({ id: "strong", similarity: 0.7 }),
        ];
      },
      async findSimilarResolvedCaseCandidates() {
        return [
          resolvedCaseCandidate({ complaintId: "case-1" }),
          resolvedCaseCandidate({
            complaintId: "case-2",
            similarity: 0.2,
          }),
        ];
      },
    };
    const service = createSemanticContextService(
      semanticConfig,
      embeddingConfig,
      embeddingClient,
      repository,
    );

    const result = await service.getSemanticContextSuggestions({
      category: "payment",
      complaintText: "Saldo saya terpotong tapi tiket tidak muncul.",
    });

    expect(result.relevantReferences).toHaveLength(1);
    expect(result.relevantReferences[0]?.id).toBe("strong");
    expect(result.relevantReferences[0]).not.toHaveProperty("score");
    expect(result.relevantReferences[0]).not.toHaveProperty("similarity");
    expect(result.similarResolvedCases).toHaveLength(1);
    expect(result.similarResolvedCases[0]?.complaintTextPreview).not.toContain(
      "user@mail.com",
    );
    expect(result.similarResolvedCases[0]).not.toHaveProperty("complaintId");
    expect(result.similarResolvedCases[0]).not.toHaveProperty(
      "quickResponseSessionId",
    );
    expect(result.similarResolvedCases[0]).not.toHaveProperty("score");
  });

  test("uses uncapped final score for ranking", async () => {
    const repository: SemanticContextRepository = {
      async findRelevantReferenceCandidates() {
        return [
          referenceCandidate({
            category: "refund",
            id: "higher-raw",
            similarity: 0.91,
            sourceType: "guide",
          }),
          referenceCandidate({
            category: "payment",
            id: "boosted",
            similarity: 0.9,
            sourceType: "policy",
          }),
        ];
      },
      async findSimilarResolvedCaseCandidates() {
        return [];
      },
    };
    const service = createSemanticContextService(
      semanticConfig,
      embeddingConfig,
      embeddingClient,
      repository,
    );

    const result = await service.getSemanticContextSuggestions({
      category: "payment",
      complaintText: "Saldo saya terpotong tapi tiket tidak muncul.",
    });

    expect(result.relevantReferences[0]?.id).toBe("boosted");
  });

  test("returns empty arrays when disabled or embedding fails", async () => {
    const repository: SemanticContextRepository = {
      async findRelevantReferenceCandidates() {
        throw new Error("should not be called");
      },
      async findSimilarResolvedCaseCandidates() {
        throw new Error("should not be called");
      },
    };
    const disabledService = createSemanticContextService(
      { ...semanticConfig, enabled: false },
      embeddingConfig,
      embeddingClient,
      repository,
    );
    const failingEmbeddingService = createSemanticContextService(
      semanticConfig,
      embeddingConfig,
      {
        ...embeddingClient,
        async embed() {
          throw new Error("embedding down");
        },
      },
      repository,
    );

    await expect(
      disabledService.getSemanticContextSuggestions({
        complaintText: "Saldo terpotong.",
      }),
    ).resolves.toEqual({
      relevantReferences: [],
      similarResolvedCases: [],
    });
    await expect(
      failingEmbeddingService.getSemanticContextSuggestions({
        complaintText: "Saldo terpotong.",
      }),
    ).resolves.toEqual({
      relevantReferences: [],
      similarResolvedCases: [],
    });
  });

  test("degrades partial repository failures independently", async () => {
    const service = createSemanticContextService(
      semanticConfig,
      embeddingConfig,
      embeddingClient,
      {
        async findRelevantReferenceCandidates() {
          throw new Error("reference query failed");
        },
        async findSimilarResolvedCaseCandidates() {
          return [resolvedCaseCandidate({})];
        },
      },
    );

    const result = await service.getSemanticContextSuggestions({
      category: "payment",
      complaintText: "Saldo saya terpotong tapi tiket tidak muncul.",
    });

    expect(result.relevantReferences).toEqual([]);
    expect(result.similarResolvedCases).toHaveLength(1);
  });
});
