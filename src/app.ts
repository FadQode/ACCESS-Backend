import { Elysia } from "elysia";

import type { AppConfig } from "./config/env";
import type { Database } from "./db";
import { createCorsPlugin } from "./plugins/cors.plugin";
import { createDatabasePlugin } from "./plugins/database.plugin";
import { mapError } from "./plugins/error.plugin";
import { loggerPlugin } from "./plugins/logger.plugin";
import { responsePlugin } from "./plugins/response.plugin";
import { createApiV1Routes } from "./routes";
import { successResponse } from "./shared/http/response";

export interface AppDependencies {
  config: AppConfig;
  db: Database;
}

export const createApp = ({ config, db }: AppDependencies) =>
  new Elysia({ name: "access-api" })
    .use(loggerPlugin)
    .use(createCorsPlugin(config.corsOrigins, config.corsCredentials))
    .use(responsePlugin)
    .use(createDatabasePlugin(db))
    .get("/", () =>
      successResponse(
        {
          service: config.appName,
          version: config.appVersion,
          environment: config.nodeEnv,
        },
        "Service is running",
      ),
    )
    .group("/api/v1", (api) => api.use(createApiV1Routes(config)))
    .onError(({ code, error, set }) => {
      const mappedError = mapError(String(code), error);
      set.status = mappedError.status;
      return mappedError.body;
    });

export type App = ReturnType<typeof createApp>;
