import { env } from "../../config/env";
import { createDatabase } from "../index";
import { seedUsers } from "./users.seed";

export const runSeeds = async (): Promise<void> => {
  if (env.nodeEnv === "production") {
    throw new Error("Development seed data cannot be loaded in production");
  }

  const database = createDatabase(env.database);

  try {
    const userCount = await seedUsers(database.db);
    console.log(`Seeded ${userCount} users`);
  } finally {
    await database.close();
  }
};

if (import.meta.main) {
  try {
    await runSeeds();
  } catch (error) {
    console.error("Database seeding failed", error);
    process.exitCode = 1;
  }
}
