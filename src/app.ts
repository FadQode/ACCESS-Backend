import "elysia";

import { createApp } from "./application";
import { env } from "./config/env";
import { createDatabase } from "./db";

const database = createDatabase(env.database);
const app = createApp({ config: env, db: database.db });

export default app;
