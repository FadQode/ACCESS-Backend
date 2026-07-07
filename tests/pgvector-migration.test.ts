import { describe, expect, test } from "bun:test";

describe("pgvector migration", () => {
  test("sets up vector extension, embedding tables, RLS, and cosine indexes", async () => {
    const sql = await Bun.file("drizzle/0005_flimsy_random.sql").text();

    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS vector");
    expect(sql).toContain(
      'CREATE TABLE IF NOT EXISTS "reference_source_embeddings"',
    );
    expect(sql).toContain(
      'CREATE TABLE IF NOT EXISTS "resolved_case_embeddings"',
    );
    expect(sql).toContain('ALTER TABLE "reference_source_embeddings" ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE "resolved_case_embeddings" ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('"embedding" vector(384) NOT NULL');
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS "reference_source_embeddings_embedding_idx"',
    );
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS "resolved_case_embeddings_embedding_idx"',
    );
    expect(sql).toContain("vector_cosine_ops");
  });
});
