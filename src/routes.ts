import { Elysia } from "elysia";

import type { AppConfig } from "./config/env";
import { createHealthRoutes } from "./modules/health/health.routes";

export const createApiV1Routes = (config: AppConfig) =>
  new Elysia({ name: "api-v1-routes" }).use(createHealthRoutes(config));
