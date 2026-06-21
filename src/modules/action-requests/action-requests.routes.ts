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
  actionRequestDetailResponseSchema,
  actionRequestListQuerySchema,
  actionRequestListResponseSchema,
  actionRequestParamsSchema,
  takeActionBodySchema,
  takeActionResponseSchema,
} from "./action-requests.dto";
import type { ActionRequestsService } from "./action-requests.service";

export interface ActionRequestRoutesDependencies {
  authService: AuthService;
  actionRequestsService: ActionRequestsService;
}

const protectedErrors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
};

export const createActionRequestRoutes = (
  config: AppConfig,
  { authService, actionRequestsService }: ActionRequestRoutesDependencies,
) =>
  new Elysia({ name: "action-request-routes", prefix: "/action-requests" })
    .use(createAccessTokenPlugin(config))
    .get(
      "",
      async ({ accessToken, headers, query }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const result = await actionRequestsService.listActionRequests(
          query,
          currentUser,
        );
        return successResponse(result, "Action requests retrieved");
      },
      {
        query: actionRequestListQuerySchema,
        response: {
          200: actionRequestListResponseSchema,
          ...protectedErrors,
        },
        detail: {
          tags: ["Action Requests"],
          summary: "List grouped action requests",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .get(
      "/:id",
      async ({ accessToken, headers, params }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const actionRequest = await actionRequestsService.getActionRequestDetail(
          params.id,
          currentUser,
        );
        return successResponse({ actionRequest }, "Action request retrieved");
      },
      {
        params: actionRequestParamsSchema,
        response: {
          200: actionRequestDetailResponseSchema,
          ...protectedErrors,
        },
        detail: {
          tags: ["Action Requests"],
          summary: "Get grouped action request detail",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .patch(
      "/:id/take-action",
      async ({ accessToken, headers, params, body }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const result = await actionRequestsService.takeAction(
          params.id,
          body,
          currentUser,
        );
        return successResponse(result, "Manager action recorded");
      },
      {
        params: actionRequestParamsSchema,
        body: takeActionBodySchema,
        response: {
          200: takeActionResponseSchema,
          ...protectedErrors,
        },
        detail: {
          tags: ["Action Requests"],
          summary: "Record manager action and release linked tickets",
          security: [{ bearerAuth: [] }],
        },
      },
    );
