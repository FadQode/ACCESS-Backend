import { describe, expect, test } from "bun:test";

import type { EmbeddingConfig } from "../src/config/env";
import type { EmbeddingClient } from "../src/integrations/embeddings/embedding.types";
import {
  createEmbeddingBackfillService,
  type EmbeddingRepository,
} from "../src/modules/embeddings";

const config: EmbeddingConfig = {
  apiKey: "embedding-key",
  batchSize: 2,
  batchServiceUrl: "https://example.test/embed/batch",
  dimension: 384,
  enabled: true,
  healthUrl: "https://example.test/health",
  model: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
  serviceUrl: "https://example.test/embed",
  timeoutMs: 10_000,
};

const vector = Array.from({ length: 384 }, () => 0.1);

describe("embedding backfill service", () => {
  test("embeds references in configured chunks", async () => {
    const batchSizes: number[] = [];
    const upsertedIds: string[] = [];
    const client: EmbeddingClient = {
      async embed() {
        throw new Error("not used");
      },
      async embedBatch(input) {
        batchSizes.push(input.texts.length);
        return {
          dimension: 384,
          embeddings: input.texts.map(() => vector),
          model: config.model,
        };
      },
      async health() {
        throw new Error("not used");
      },
    };
    const repository: EmbeddingRepository = {
      async findReferencesNeedingEmbedding() {
        return Array.from({ length: 5 }, (_, index) => ({
          category: "payment",
          content: "Saldo terpotong dan tiket belum muncul.",
          fileName: null,
          id: `reference-${index}`,
          sourceType: "policy",
          title: `Reference ${index}`,
          updatedAt: new Date(),
        }));
      },
      async findResolvedCasesNeedingEmbedding() {
        return [];
      },
      async upsertReferenceEmbedding(input) {
        upsertedIds.push(input.referenceSourceId);
      },
      async upsertResolvedCaseEmbedding() {
        throw new Error("not used");
      },
    };

    const summary = await createEmbeddingBackfillService(
      config,
      client,
      repository,
    ).embedReferences();

    expect(batchSizes).toEqual([2, 2, 1]);
    expect(upsertedIds).toHaveLength(5);
    expect(summary).toMatchObject({
      batchSize: 2,
      embedded: 5,
      failed: 0,
      scanned: 5,
      skipped: 0,
      status: "ok",
    });
  });
});
