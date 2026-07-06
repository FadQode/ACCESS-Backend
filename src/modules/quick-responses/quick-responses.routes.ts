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
  quickResponsePreviewBodySchema,
  quickResponsePreviewResponseSchema,
} from "./quick-response-preview.dto";
import type { QuickResponsePreviewService } from "./quick-response-preview.service";
import {
  saveQuickResponseBodySchema,
  saveQuickResponseResponseSchema,
} from "./quick-responses.dto";
import type { QuickResponsesService } from "./quick-responses.service";

export interface QuickResponseRoutesDependencies {
  authService: AuthService;
  quickResponsePreviewService: QuickResponsePreviewService;
  quickResponsesService: QuickResponsesService;
}

export const createQuickResponseRoutes = (
  config: AppConfig,
  {
    authService,
    quickResponsePreviewService,
    quickResponsesService,
  }: QuickResponseRoutesDependencies,
) =>
  new Elysia({ name: "quick-response-routes", prefix: "/quick-responses" })
    .use(createAccessTokenPlugin(config))
    .post(
      "/preview",
      async ({ accessToken, headers, body }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        const result = await quickResponsePreviewService.generatePreview(
          body,
          currentUser,
        );

        return successResponse(
          result,
          result.suggestionSource === "ai"
            ? "Quick response suggestions generated"
            : "Fallback quick response suggestions generated",
        );
      },
      {
        body: quickResponsePreviewBodySchema,
        response: {
          200: quickResponsePreviewResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
        detail: {
          tags: ["Quick Responses"],
          summary: "Generate quick response HEAT suggestions",
          description:
            "Returns preview-only HEAT suggestions for agent selection without mutating complaints, tickets, action requests, or quick response sessions.",
          security: [{ bearerAuth: [] }],
        },
      },
    )
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
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
        detail: {
          tags: ["Quick Responses"],
          summary: "Save a manual quick response",
          description:
            "Atomically creates a complaint and its manual quick response session. The sent_hea_action outcome also creates a ticket for escalation.",
          security: [{ bearerAuth: [] }],
        },
      },
    );
