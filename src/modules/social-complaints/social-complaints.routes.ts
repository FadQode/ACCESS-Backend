import { Elysia } from "elysia";

import type { AppConfig } from "../../config/env";
import {
  createAccessTokenPlugin,
  requireAuth,
} from "../../plugins/auth.plugin";
import { ForbiddenError } from "../../shared/errors";
import { apiErrorResponseSchema } from "../../shared/http/schema";
import { successResponse } from "../../shared/http/response";
import type { AuthService } from "../auth/auth.service";
import type { AuthUser } from "../auth/auth.types";
import {
  socialComplaintListQuerySchema,
  socialComplaintListResponseSchema,
  socialComplaintSyncBodySchema,
  socialComplaintSyncResponseSchema,
} from "./social-complaints.dto";
import type { SocialComplaintsService } from "./social-complaints.service";
import type { SocialMediaSyncService } from "./social-media-sync.service";

export interface SocialComplaintRoutesDependencies {
  authService: AuthService;
  socialComplaintsService: SocialComplaintsService;
  socialMediaSyncService: SocialMediaSyncService;
}

const protectedErrors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
};

const syncProtectedErrors = {
  ...protectedErrors,
  503: apiErrorResponseSchema,
};

const assertCanSync = (currentUser: AuthUser): void => {
  if (currentUser.role !== "admin") {
    throw new ForbiddenError(
      "Only admins can trigger social complaint sync",
      "SOCIAL_SYNC_FORBIDDEN",
    );
  }
};

export const createSocialComplaintRoutes = (
  config: AppConfig,
  {
    authService,
    socialComplaintsService,
    socialMediaSyncService,
  }: SocialComplaintRoutesDependencies,
) =>
  new Elysia({ name: "social-complaint-routes", prefix: "/social-complaints" })
    .use(createAccessTokenPlugin(config))
    .get(
      "",
      async ({ accessToken, headers, query }) => {
        await requireAuth(headers.authorization, accessToken, authService);
        const result = await socialComplaintsService.listSocialComplaints(
          query,
        );
        return successResponse(result, "Social complaints retrieved");
      },
      {
        query: socialComplaintListQuerySchema,
        response: { 200: socialComplaintListResponseSchema, ...protectedErrors },
        detail: {
          tags: ["Social Complaints"],
          summary: "List ingested social complaints",
          description:
            "Returns ingested social complaints ordered by published_at DESC, created_at DESC. Paginated and optionally filtered by source.",
          security: [{ bearerAuth: [] }],
        },
      },
    )
    .post(
      "/sync",
      async ({ accessToken, headers, body }) => {
        const currentUser = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );
        assertCanSync(currentUser);
        const result = await socialMediaSyncService.sync(body.source);
        return successResponse(result, "Social complaint sync completed");
      },
      {
        body: socialComplaintSyncBodySchema,
        response: { 200: socialComplaintSyncResponseSchema, ...syncProtectedErrors },
        detail: {
          tags: ["Social Complaints"],
          summary: "Synchronize social complaints from Apify (admin only)",
          description:
            "Fetches, normalizes, deduplicates, and persists social complaints for one source. Insert-only and atomic.",
          security: [{ bearerAuth: [] }],
        },
      },
    );
