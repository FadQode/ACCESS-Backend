import { openapi } from "@elysia/openapi";

import type { AppConfig } from "../config/env";

export const createOpenApiPlugin = (config: AppConfig) =>
  openapi({
    enabled: config.openApi.enabled,
    path: config.openApi.path,
    specPath: config.openApi.specPath,
    provider: "scalar",
    documentation: {
      info: {
        title: `${config.appName} API`,
        version: config.appVersion,
        description:
          "REST API for the ACCESS transportation complaint support workflow.",
      },
      tags: [
        {
          name: "System",
          description: "Service availability and runtime information.",
        },
        {
          name: "Auth",
          description: "Authentication for internal ACCESS users.",
        },
        {
          name: "Complaints",
          description: "Internal complaint listing, detail, and updates.",
        },
        {
          name: "Quick Responses",
          description: "Manual agent response sessions for complaints.",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Access token returned by POST /auth/login.",
          },
        },
      },
    },
  });
