import type { EmbeddingConfig } from "../../config/env";
import type {
  EmbedBatchInput,
  EmbedBatchResponse,
  EmbedInput,
  EmbedResponse,
  EmbeddingClient,
  EmbeddingFetch,
  EmbeddingHealthResponse,
} from "./embedding.types";

const isNumericVector = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.every((item) => typeof item === "number" && Number.isFinite(item));

const assertDimension = (
  embedding: number[],
  expectedDimension: number,
  label: string,
) => {
  if (embedding.length !== expectedDimension) {
    throw new Error(
      `${label} dimension must be ${expectedDimension}, received ${embedding.length}`,
    );
  }
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error("Embedding service returned an empty response");
  }

  return JSON.parse(raw) as T;
};

const fetchWithTimeout = async (
  fetcher: EmbeddingFetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetcher(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const embeddingHeaders = (apiKey?: string) => ({
  ...(apiKey ? { "x-api-key": apiKey } : {}),
  "content-type": "application/json",
});

export const createEmbeddingClient = (
  config: EmbeddingConfig,
  fetcher: EmbeddingFetch = fetch,
): EmbeddingClient => ({
  async health() {
    const response = await fetchWithTimeout(
      fetcher,
      config.healthUrl,
      { method: "GET" },
      config.timeoutMs,
    );

    if (!response.ok) {
      throw new Error(`Embedding health check failed with ${response.status}`);
    }

    const body = await parseJson<EmbeddingHealthResponse>(response);

    if (body.status !== "ok") {
      throw new Error("Embedding health status must be ok");
    }

    if (body.dimension !== config.dimension) {
      throw new Error(
        `Embedding health dimension must be ${config.dimension}, received ${body.dimension}`,
      );
    }

    if (body.model !== config.model) {
      throw new Error(
        `Embedding health model must be ${config.model}, received ${body.model}`,
      );
    }

    return body;
  },

  async embed(input: EmbedInput) {
    if (!config.enabled) {
      throw new Error("Embedding service is disabled");
    }

    if (!config.apiKey) {
      throw new Error("EMBEDDING_API_KEY is required");
    }

    const response = await fetchWithTimeout(
      fetcher,
      config.serviceUrl,
      {
        method: "POST",
        headers: embeddingHeaders(config.apiKey),
        body: JSON.stringify({ text: input.text }),
      },
      config.timeoutMs,
    );

    if (!response.ok) {
      throw new Error(`Embedding request failed with ${response.status}`);
    }

    const body = await parseJson<EmbedResponse>(response);

    if (!isNumericVector(body.embedding)) {
      throw new Error("Embedding response must contain a numeric array");
    }

    assertDimension(body.embedding, config.dimension, "Embedding response");

    if (body.dimension !== config.dimension) {
      throw new Error(
        `Embedding response dimension must be ${config.dimension}, received ${body.dimension}`,
      );
    }

    return body;
  },

  async embedBatch(input: EmbedBatchInput) {
    if (!config.enabled) {
      throw new Error("Embedding service is disabled");
    }

    if (!config.apiKey) {
      throw new Error("EMBEDDING_API_KEY is required");
    }

    const response = await fetchWithTimeout(
      fetcher,
      config.batchServiceUrl,
      {
        method: "POST",
        headers: embeddingHeaders(config.apiKey),
        body: JSON.stringify({ texts: input.texts }),
      },
      config.timeoutMs,
    );

    if (!response.ok) {
      throw new Error(`Embedding batch request failed with ${response.status}`);
    }

    const body = await parseJson<EmbedBatchResponse>(response);

    if (!Array.isArray(body.embeddings)) {
      throw new Error("Embedding batch response must contain embeddings");
    }

    for (const [index, embedding] of body.embeddings.entries()) {
      if (!isNumericVector(embedding)) {
        throw new Error(
          `Embedding batch response item ${index} must be a numeric array`,
        );
      }

      assertDimension(
        embedding,
        config.dimension,
        `Embedding batch response item ${index}`,
      );
    }

    if (body.dimension !== config.dimension) {
      throw new Error(
        `Embedding batch dimension must be ${config.dimension}, received ${body.dimension}`,
      );
    }

    return body;
  },
});
