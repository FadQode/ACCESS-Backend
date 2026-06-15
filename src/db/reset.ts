import { env } from "../config/env";
import { createDatabase } from "./index";

const resetConfirmation = "RESET_DATABASE";

const resetDatabase = async (): Promise<void> => {
  if (env.nodeEnv === "production") {
    throw new Error("Database reset cannot run in production");
  }

  if (Bun.env.DB_RESET_CONFIRM !== resetConfirmation) {
    throw new Error(
      `Set DB_RESET_CONFIRM=${resetConfirmation} to reset the database`,
    );
  }

  const database = createDatabase(env.database);

  try {
    await database.client`drop schema if exists drizzle cascade`;
    await database.client`drop schema if exists public cascade`;
    await database.client`create schema public`;
    await database.client`grant all on schema public to public`;

    console.log("Database schemas reset: dropped drizzle/public and recreated public");
  } finally {
    await database.close();
  }
};

if (import.meta.main) {
  try {
    await resetDatabase();
  } catch (error) {
    console.error("Database reset failed", error);
    process.exitCode = 1;
  }
}
