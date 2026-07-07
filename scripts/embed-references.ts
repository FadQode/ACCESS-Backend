import { env } from "../src/config/env";
import { createDatabase } from "../src/db";
import { createEmbeddingClient } from "../src/integrations/embeddings/embedding.client";
import {
  createEmbeddingBackfillService,
  createEmbeddingRepository,
} from "../src/modules/embeddings";

const database = createDatabase(env.database);

try {
  const service = createEmbeddingBackfillService(
    env.embedding,
    createEmbeddingClient(env.embedding),
    createEmbeddingRepository(database.db),
  );
  const summary = await service.embedReferences();

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await database.close();
}
