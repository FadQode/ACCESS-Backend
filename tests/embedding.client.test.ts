import { describe, expect, test } from "bun:test";

import type { EmbeddingConfig } from "../src/config/env";
import { createEmbeddingClient } from "../src/integrations/embeddings/embedding.client";

const config: EmbeddingConfig = {
  apiKey: "embedding-test-key",
  batchSize: 16,
  batchServiceUrl: "https://example.test/embed/batch",
  dimension: 384,
  enabled: true,
  healthUrl: "https://example.test/health",
  model: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
  serviceUrl: "https://example.test/embed",
  timeoutMs: 10_000,
  version: 2,
};

const vector = Array.from({ length: 384 }, (_, index) => index / 384);

describe("embedding client", () => {
  test("validates health response metadata", async () => {
    const client = createEmbeddingClient(config, async () =>
      Response.json({
        dimension: 384,
        model: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        status: "ok",
      }),
    );

    await expect(client.health()).resolves.toEqual({
      dimension: 384,
      model: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
      status: "ok",
    });
  });

  test("sends API key and text to the embed endpoint", async () => {
    let requestUrl = "";
    let requestHeaders = new Headers();
    let requestBody: unknown;
    const client = createEmbeddingClient(config, async (input, init) => {
      requestUrl = String(input);
      requestHeaders = new Headers(init?.headers);
      requestBody = JSON.parse(String(init?.body));

      return Response.json({
        dimension: 384,
        embedding: vector,
        model: config.model,
      });
    });

    const result = await client.embed({ text: "akses stasiun banjir" });

    expect(requestUrl).toBe(config.serviceUrl);
    expect(requestHeaders.get("x-api-key")).toBe("embedding-test-key");
    expect(requestHeaders.get("content-type")).toBe("application/json");
    expect(requestBody).toEqual({ text: "akses stasiun banjir" });
    expect(result.embedding).toHaveLength(384);
  });

  test("rejects non-384 embeddings", async () => {
    const client = createEmbeddingClient(config, async () =>
      Response.json({
        dimension: 3,
        embedding: [0.1, 0.2, 0.3],
        model: config.model,
      }),
    );

    await expect(client.embed({ text: "short vector" })).rejects.toThrow(
      "Embedding response dimension must be 384, received 3",
    );
  });
});
