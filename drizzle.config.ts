import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/db/schema/index.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL?.trim() ||
      "postgres://postgres:postgres@localhost:5432/access",
  },
  strict: true,
  verbose: true,
});
