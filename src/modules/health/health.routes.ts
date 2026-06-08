import { Elysia, t } from "elysia";

import type { AppConfig } from "../../config/env";
import { successResponse } from "../../shared/http/response";
import { healthDataSchema } from "./health.dto";
import { getHealthStatus } from "./health.service";

export const createHealthRoutes = (config: AppConfig) =>
  new Elysia({ name: "health-routes" }).get(
    "/health",
    () =>
      successResponse(
        getHealthStatus(config.appName, config.appVersion),
        "Service is healthy",
      ),
    {
      response: t.Object({
        success: t.Literal(true),
        message: t.String(),
        data: healthDataSchema,
      }),
      detail: {
        tags: ["System"],
        summary: "Check API health",
      },
    },
  );
