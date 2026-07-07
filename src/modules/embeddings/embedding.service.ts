import type { EmbeddingConfig } from "../../config/env";
import type { EmbeddingClient } from "../../integrations/embeddings/embedding.types";
import {
  buildReferenceEmbeddedText,
  buildResolvedCaseEmbeddedText,
} from "./embedding-text.builder";
import {
  assertEmbeddingDimension,
  chunkArray,
} from "./embedding-vector.util";
import {
  CURRENT_EMBEDDING_VERSION,
  type EmbeddingBackfillSummary,
  type EmbeddingRepository,
  type ReferenceEmbeddingSource,
  type ResolvedCaseEmbeddingSource,
} from "./embedding.types";

export interface EmbeddingBackfillService {
  embedReferences(input?: { limit?: number }): Promise<EmbeddingBackfillSummary>;
  embedResolvedCases(input?: { limit?: number }): Promise<EmbeddingBackfillSummary>;
}

const emptySummary = (batchSize: number): EmbeddingBackfillSummary => ({
  batchSize,
  embedded: 0,
  failed: 0,
  scanned: 0,
  skipped: 0,
  status: "ok",
});

const assertEmbeddingReady = (config: EmbeddingConfig) => {
  if (!config.enabled) {
    throw new Error("EMBEDDING_ENABLED must be true");
  }

  if (!config.apiKey) {
    throw new Error("EMBEDDING_API_KEY must be set");
  }
};

const embedBatch = async (
  client: EmbeddingClient,
  config: EmbeddingConfig,
  texts: string[],
): Promise<number[][]> => {
  const response = await client.embedBatch({ texts });

  if (response.embeddings.length !== texts.length) {
    throw new Error(
      `Embedding batch returned ${response.embeddings.length} vectors for ${texts.length} texts`,
    );
  }

  for (const embedding of response.embeddings) {
    assertEmbeddingDimension(embedding, config.dimension);
  }

  return response.embeddings;
};

export const createEmbeddingBackfillService = (
  config: EmbeddingConfig,
  client: EmbeddingClient,
  repository: EmbeddingRepository,
): EmbeddingBackfillService => ({
  async embedReferences(input = {}) {
    assertEmbeddingReady(config);

    const references = await repository.findReferencesNeedingEmbedding({
      embeddingVersion: CURRENT_EMBEDDING_VERSION,
      limit: input.limit,
      modelName: config.model,
    });
    const summary = emptySummary(config.batchSize);
    summary.scanned = references.length;

    for (const chunk of chunkArray(references, config.batchSize)) {
      const rows = chunk
        .map((source) => ({
          source,
          embeddedText: buildReferenceEmbeddedText(source),
        }))
        .filter((row) => row.embeddedText.length > 0);

      summary.skipped += chunk.length - rows.length;
      if (rows.length === 0) continue;

      try {
        const embeddings = await embedBatch(
          client,
          config,
          rows.map((row) => row.embeddedText),
        );

        await Promise.all(
          rows.map((row, index) =>
            repository.upsertReferenceEmbedding({
              embeddedText: row.embeddedText,
              embedding: embeddings[index] ?? [],
              embeddingVersion: CURRENT_EMBEDDING_VERSION,
              modelName: config.model,
              referenceSourceId: (row.source as ReferenceEmbeddingSource).id,
            }),
          ),
        );
        summary.embedded += rows.length;
      } catch {
        summary.failed += rows.length;
      }
    }

    return summary;
  },

  async embedResolvedCases(input = {}) {
    assertEmbeddingReady(config);

    const cases = await repository.findResolvedCasesNeedingEmbedding({
      embeddingVersion: CURRENT_EMBEDDING_VERSION,
      limit: input.limit,
      modelName: config.model,
    });
    const summary = emptySummary(config.batchSize);
    summary.scanned = cases.length;

    for (const chunk of chunkArray(cases, config.batchSize)) {
      const rows = chunk
        .map((source) => ({
          source,
          embeddedText: buildResolvedCaseEmbeddedText(source),
        }))
        .filter((row) => row.embeddedText.length > 0);

      summary.skipped += chunk.length - rows.length;
      if (rows.length === 0) continue;

      try {
        const embeddings = await embedBatch(
          client,
          config,
          rows.map((row) => row.embeddedText),
        );

        await Promise.all(
          rows.map((row, index) =>
            repository.upsertResolvedCaseEmbedding({
              complaintId: (row.source as ResolvedCaseEmbeddingSource)
                .complaintId,
              embeddedText: row.embeddedText,
              embedding: embeddings[index] ?? [],
              embeddingVersion: CURRENT_EMBEDDING_VERSION,
              modelName: config.model,
              quickResponseSessionId: (
                row.source as ResolvedCaseEmbeddingSource
              ).quickResponseSessionId,
            }),
          ),
        );
        summary.embedded += rows.length;
      } catch {
        summary.failed += rows.length;
      }
    }

    return summary;
  },
});
