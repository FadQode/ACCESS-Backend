import { Elysia } from "elysia";

import type { AppConfig } from "../../config/env";
import {
  createAccessTokenPlugin,
  requireAuth,
} from "../../plugins/auth.plugin";
import { successResponse } from "../../shared/http/response";
import { apiErrorResponseSchema } from "../../shared/http/schema";
import type { AuthService } from "../auth/auth.service";
import {
  agentReportParamsSchema,
  agentsPerformanceQuerySchema,
  agentsPerformanceResponseSchema,
  singleAgentReportQuerySchema,
  singleAgentReportResponseSchema,
} from "./reports.dto";
import type { ReportsService } from "./reports.service";

export interface ReportRoutesDependencies {
  authService: AuthService;
  reportsService: ReportsService;
}

const protectedErrors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
};

export const createReportRoutes = (
  config: AppConfig,
  { authService, reportsService }: ReportRoutesDependencies,
) =>
  new Elysia({ name: "report-routes", prefix: "/reports" })
    .use(createAccessTokenPlugin(config))
    .get(
      "/agents/performance",
      async ({ accessToken, headers, query }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const result = await reportsService.getAgentsPerformance(
          query,
          currentUser,
        );
        return successResponse(result, "Agent performance report retrieved");
      },
      {
        query: agentsPerformanceQuerySchema,
        response: {
          200: agentsPerformanceResponseSchema,
          ...protectedErrors,
        },
        detail: {
          tags: ["Reports"],
          summary: "Get agent performance report",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .get(
      "/agents/:agentId",
      async ({ accessToken, headers, params, query }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const result = await reportsService.getSingleAgentReport(
          params.agentId,
          query,
          currentUser,
        );
        return successResponse(result, "Single agent report retrieved");
      },
      {
        params: agentReportParamsSchema,
        query: singleAgentReportQuerySchema,
        response: {
          200: singleAgentReportResponseSchema,
          ...protectedErrors,
        },
        detail: {
          tags: ["Reports"],
          summary: "Get single agent report",
          security: [{ bearerAuth: [] }],
        },
      },
    );
