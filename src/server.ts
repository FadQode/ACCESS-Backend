import { createApp } from "./application";
import { env } from "./config/env";
import { createDatabase } from "./db";
import { createSocialComplaintsComposition } from "./modules/social-complaints/social-complaints.composition";
import { createSocialMediaSyncScheduler } from "./modules/social-complaints/social-media-sync.scheduler";

const database = createDatabase(env.database);
const app = createApp({ config: env, db: database.db });

app.listen({
  hostname: env.host,
  port: env.port,
});

console.info(
  `[server] ACCESS Backend listening on http://${env.host}:${env.port}`,
);

const socialSyncScheduler = createSocialMediaSyncScheduler({
  syncService: createSocialComplaintsComposition(env, database.db).syncService,
  sources: env.socialSync.sources,
  intervalMs: env.socialSync.intervalMs,
  runOnStart: env.socialSync.runOnStart,
});

if (env.socialSync.enabled && env.apify.apiToken) {
  socialSyncScheduler.start();
} else if (env.socialSync.enabled) {
  console.warn(
    "[social-sync] scheduler enabled but APIFY_TOKEN is missing; not starting",
  );
}

const shutdown = async (signal: string) => {
  console.info(`[server] ${signal} received, shutting down`);
  socialSyncScheduler.stop();
  await app.stop();
  await database.close();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
