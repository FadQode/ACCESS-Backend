import { Elysia, t } from "elysia";

import type { AppConfig } from "./config/env";
import type { Database } from "./db";
import { createCorsPlugin } from "./plugins/cors.plugin";
import { createDatabasePlugin } from "./plugins/database.plugin";
import { errorPlugin } from "./plugins/error.plugin";
import { loggerPlugin } from "./plugins/logger.plugin";
import { createOpenApiPlugin } from "./plugins/openapi.plugin";
import { responsePlugin } from "./plugins/response.plugin";
import { createRoutes } from "./routes";
import { successResponse } from "./shared/http/response";

export interface AppDependencies {
  config: AppConfig;
  db: Database;
}

export const createApp = ({ config, db }: AppDependencies) =>
  new Elysia({ name: "access-api" })
    .use(loggerPlugin)
    .use(createCorsPlugin(config.corsOrigins, config.corsCredentials))
    .use(errorPlugin)
    .use(createOpenApiPlugin(config))
    .use(responsePlugin)
    .use(createDatabasePlugin(db))
    .get(
      "/",
      () =>
        successResponse(
          {
            service: config.appName,
            version: config.appVersion,
            environment: config.nodeEnv,
          },
          "Service is running",
        ),
      {
        response: t.Object(
          {
            success: t.Literal(true),
            message: t.String(),
            data: t.Object({
              service: t.String(),
              version: t.String(),
              environment: t.String(),
            }),
          },
          { description: "Service identity and runtime environment." },
        ),
        detail: {
          tags: ["System"],
          summary: "Get service information",
        },
      },
    )
    .use(createRoutes(config, db));

export type App = ReturnType<typeof createApp>;
