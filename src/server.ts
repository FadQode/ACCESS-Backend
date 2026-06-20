import { createApp } from "./application";
import { env } from "./config/env";
import { createDatabase } from "./db";

const database = createDatabase(env.database);
const app = createApp({ config: env, db: database.db });

app.listen({
  hostname: env.host,
  port: env.port,
});

console.info(
  `[server] ACCESS Backend listening on http://${env.host}:${env.port}`,
);

const shutdown = async (signal: string) => {
  console.info(`[server] ${signal} received, shutting down`);
  await app.stop();
  await database.close();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
