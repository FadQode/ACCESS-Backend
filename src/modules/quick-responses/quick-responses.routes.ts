import { Elysia } from "elysia";

import type { AppConfig } from "../../config/env";
import {
  createAccessTokenPlugin,
  requireAuth,
} from "../../plugins/auth.plugin";
import { apiErrorResponseSchema } from "../../shared/http/schema";
import { successResponse } from "../../shared/http/response";
import type { AuthService } from "../auth/auth.service";
import {
  saveQuickResponseBodySchema,
  saveQuickResponseResponseSchema,
} from "./quick-responses.dto";
import type { QuickResponsesService } from "./quick-responses.service";

export interface QuickResponseRoutesDependencies {
  authService: AuthService;
  quickResponsesService: QuickResponsesService;
}

export const createQuickResponseRoutes = (
  config: AppConfig,
  { authService, quickResponsesService }: QuickResponseRoutesDependencies,
) =>
  new Elysia({ name: "quick-response-routes", prefix: "/quick-responses" })
    .use(createAccessTokenPlugin(config))
    .post(
      "",
      async ({ accessToken, headers, body, set }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const result = await quickResponsesService.saveQuickResponse(
          body,
          currentUser,
        );
        set.status = 201;
        return successResponse(result, "Quick response saved");
      },
      {
        body: saveQuickResponseBodySchema,
        response: {
          201: saveQuickResponseResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
        detail: {
          tags: ["Quick Responses"],
          summary: "Save a manual quick response",
          description:
            "Atomically creates a complaint and its manual quick response session. No ticket or manager action is created in this phase.",
          security: [{ bearerAuth: [] }],
        },
      },
    );
