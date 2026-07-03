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
  agentDashboardSummaryResponseSchema,
  dashboardSummaryQuerySchema,
  managerDashboardSummaryResponseSchema,
} from "./dashboard.dto";
import type { DashboardService } from "./dashboard.service";

export interface DashboardRoutesDependencies {
  authService: AuthService;
  dashboardService: DashboardService;
}

const protectedErrors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
};

export const createDashboardRoutes = (
  config: AppConfig,
  { authService, dashboardService }: DashboardRoutesDependencies,
) =>
  new Elysia({ name: "dashboard-routes", prefix: "/dashboard" })
    .use(createAccessTokenPlugin(config))
    .get(
      "/agent/summary",
      async ({ accessToken, headers, query }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const result = await dashboardService.getAgentSummary(
          query,
          currentUser,
        );
        return successResponse(result, "Agent dashboard summary retrieved");
      },
      {
        query: dashboardSummaryQuerySchema,
        response: {
          200: agentDashboardSummaryResponseSchema,
          ...protectedErrors,
        },
        detail: {
          tags: ["Dashboard"],
          summary: "Get current agent dashboard summary",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .get(
      "/manager/summary",
      async ({ accessToken, headers, query }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const result = await dashboardService.getManagerSummary(
          query,
          currentUser,
        );
        return successResponse(result, "Manager dashboard summary retrieved");
      },
      {
        query: dashboardSummaryQuerySchema,
        response: {
          200: managerDashboardSummaryResponseSchema,
          ...protectedErrors,
        },
        detail: {
          tags: ["Dashboard"],
          summary: "Get manager dashboard summary",
          security: [{ bearerAuth: [] }],
        },
      },
    );
