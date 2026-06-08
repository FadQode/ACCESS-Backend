import { Elysia } from "elysia";

import type { Database } from "../db";

export const createDatabasePlugin = (db: Database) =>
  new Elysia({ name: "database" }).decorate("db", db);
