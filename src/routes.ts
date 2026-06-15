import { Elysia } from "elysia";

import type { AppConfig } from "./config/env";
import type { Database } from "./db";
import { createAuthRoutes } from "./modules/auth/auth.routes";
import { createAuthService } from "./modules/auth/auth.service";
import { createHealthRoutes } from "./modules/health/health.routes";
import { createUsersRepository } from "./modules/users/users.repository";

export const createApiV1Routes = (config: AppConfig, db: Database) => {
  const authService = createAuthService(createUsersRepository(db));

  return new Elysia({ name: "api-v1-routes" })
    .use(createHealthRoutes(config))
    .use(createAuthRoutes(config, { authService }));
};
