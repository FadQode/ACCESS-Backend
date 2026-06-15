import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { DatabaseConfig } from "../config/env";
import * as schema from "./schema";

export const createDatabase = (config: DatabaseConfig) => {
  const client = postgres(config.url, {
    max: config.maxConnections,
    idle_timeout: config.idleTimeoutSeconds,
    connect_timeout: config.connectTimeoutSeconds,
  });

  return {
    client,
    db: drizzle(client, { schema }),
    close: () => client.end(),
  };
};

export type Database = ReturnType<typeof createDatabase>["db"];
export type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];
export type DatabaseExecutor = Database | DatabaseTransaction;

export interface DatabaseTransactionManager {
  transaction<T>(
    callback: (executor: DatabaseExecutor) => Promise<T>,
  ): Promise<T>;
}

export const createTransactionManager = (
  db: Database,
): DatabaseTransactionManager => ({
  transaction: (callback) => db.transaction((tx) => callback(tx)),
});
