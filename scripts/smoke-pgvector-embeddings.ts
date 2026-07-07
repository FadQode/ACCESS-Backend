import { sql } from "drizzle-orm";

import { env } from "../src/config/env";
import { createDatabase } from "../src/db";
import { createEmbeddingClient } from "../src/integrations/embeddings/embedding.client";

const EXPECTED_MODEL =
  "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";
const EXPECTED_DIMENSION = 384;

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) {
    throw new Error(message);
  }
};

const firstRow = async <T>(
  query: ReturnType<typeof sql>,
  label: string,
): Promise<T> => {
  const database = createDatabase(env.database);

  try {
    const rows = (await database.db.execute(query)) as unknown as T[];
    const row = rows[0];

    assert(row, `${label} returned no rows`);

    return row;
  } finally {
    await database.close();
  }
};

const runDatabaseSmoke = async () => {
  const extension = await firstRow<{ exists: boolean }>(
    sql`
      select exists(
        select 1
        from pg_extension
        where extname = 'vector'
      ) as exists
    `,
    "vector extension check",
  );
  assert(extension.exists, "pgvector extension is not installed");

  const tables = await firstRow<{
    reference_table_exists: boolean;
    resolved_case_table_exists: boolean;
  }>(
    sql`
      select
        to_regclass('public.reference_source_embeddings') is not null
          as reference_table_exists,
        to_regclass('public.resolved_case_embeddings') is not null
          as resolved_case_table_exists
    `,
    "embedding table check",
  );
  assert(
    tables.reference_table_exists,
    "reference_source_embeddings table does not exist",
  );
  assert(
    tables.resolved_case_table_exists,
    "resolved_case_embeddings table does not exist",
  );

  const columns = await firstRow<{
    reference_embedding_type: string;
    resolved_case_embedding_type: string;
  }>(
    sql`
      select
        (
          select format_type(attribute.atttypid, attribute.atttypmod)
          from pg_attribute attribute
          join pg_class relation
            on relation.oid = attribute.attrelid
          where relation.relname = 'reference_source_embeddings'
            and attribute.attname = 'embedding'
            and attribute.attnum > 0
            and not attribute.attisdropped
        ) as reference_embedding_type,
        (
          select format_type(attribute.atttypid, attribute.atttypmod)
          from pg_attribute attribute
          join pg_class relation
            on relation.oid = attribute.attrelid
          where relation.relname = 'resolved_case_embeddings'
            and attribute.attname = 'embedding'
            and attribute.attnum > 0
            and not attribute.attisdropped
        ) as resolved_case_embedding_type
    `,
    "embedding column type check",
  );
  assert(
    columns.reference_embedding_type === "vector(384)",
    `reference embedding column must be vector(384), received ${columns.reference_embedding_type}`,
  );
  assert(
    columns.resolved_case_embedding_type === "vector(384)",
    `resolved case embedding column must be vector(384), received ${columns.resolved_case_embedding_type}`,
  );

  const rls = await firstRow<{
    reference_rls_enabled: boolean;
    resolved_case_rls_enabled: boolean;
  }>(
    sql`
      select
        (
          select relrowsecurity
          from pg_class
          where relname = 'reference_source_embeddings'
        ) as reference_rls_enabled,
        (
          select relrowsecurity
          from pg_class
          where relname = 'resolved_case_embeddings'
        ) as resolved_case_rls_enabled
    `,
    "RLS check",
  );
  assert(rls.reference_rls_enabled, "reference embeddings RLS is disabled");
  assert(rls.resolved_case_rls_enabled, "resolved case embeddings RLS is disabled");

  const database = createDatabase(env.database);

  try {
    await database.db.execute(sql`
      create temp table embedding_smoke_vectors (
        id text primary key,
        embedding vector(3) not null
      )
    `);
    await database.db.execute(sql`
      insert into embedding_smoke_vectors (id, embedding)
      values
        ('query', '[1,0,0]'::vector),
        ('similar', '[0.9,0.1,0]'::vector),
        ('unrelated', '[0,1,0]'::vector)
    `);

    const rows = (await database.db.execute(sql`
      select id
      from embedding_smoke_vectors
      where id <> 'query'
      order by embedding <=> (
        select embedding
        from embedding_smoke_vectors
        where id = 'query'
      )
      limit 2
    `)) as unknown as Array<{ id: string }>;

    assert(rows[0]?.id === "similar", "cosine similarity ordering failed");
  } finally {
    await database.close();
  }
};

const postEmbed = async (apiKey?: string) =>
  fetch(env.embedding.serviceUrl, {
    method: "POST",
    headers: {
      ...(apiKey ? { "x-api-key": apiKey } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify({ text: "Stasiun banjir dan akses masuk sulit." }),
  });

const runEmbeddingServiceSmoke = async () => {
  assert(env.embedding.enabled, "EMBEDDING_ENABLED must be true");
  assert(env.embedding.apiKey, "EMBEDDING_API_KEY must be set");
  assert(
    env.embedding.model === EXPECTED_MODEL,
    `EMBEDDING_MODEL must be ${EXPECTED_MODEL}`,
  );
  assert(
    env.embedding.dimension === EXPECTED_DIMENSION,
    `EMBEDDING_DIMENSION must be ${EXPECTED_DIMENSION}`,
  );

  const client = createEmbeddingClient(env.embedding);
  const health = await client.health();
  assert(health.status === "ok", "embedding health status must be ok");
  assert(health.dimension === EXPECTED_DIMENSION, "health dimension mismatch");
  assert(health.model === EXPECTED_MODEL, "health model mismatch");

  const embed = await client.embed({
    text: "Penumpang kesulitan masuk stasiun karena banjir.",
  });
  assert(Array.isArray(embed.embedding), "embedding must be an array");
  assert(embed.embedding.length === EXPECTED_DIMENSION, "embedding length mismatch");
  assert(
    embed.embedding.every((value) => Number.isFinite(value)),
    "embedding must contain only finite numbers",
  );

  const missingKeyResponse = await postEmbed();
  assert(
    missingKeyResponse.status === 401,
    `missing API key must return 401, received ${missingKeyResponse.status}`,
  );

  const wrongKeyResponse = await postEmbed("wrong-api-key");
  assert(
    wrongKeyResponse.status === 401,
    `wrong API key must return 401, received ${wrongKeyResponse.status}`,
  );
};

await runDatabaseSmoke();
await runEmbeddingServiceSmoke();

console.log(
  JSON.stringify(
    {
      embeddingService: {
        dimension: env.embedding.dimension,
        healthUrl: env.embedding.healthUrl,
        model: env.embedding.model,
        serviceUrl: env.embedding.serviceUrl,
      },
      pgvector: {
        cosineOrdering: "ok",
        extension: "ok",
        rls: "ok",
        tables: [
          "reference_source_embeddings",
          "resolved_case_embeddings",
        ],
      },
      status: "ok",
    },
    null,
    2,
  ),
);
