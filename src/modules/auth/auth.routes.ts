import { Elysia } from "elysia";

import type { AppConfig } from "../../config/env";
import {
  createAccessTokenPlugin,
  requireAuth,
} from "../../plugins/auth.plugin";
import { successResponse } from "../../shared/http/response";
import {
  authErrorResponseSchema,
  currentUserResponseSchema,
  loginBodySchema,
  loginResponseSchema,
} from "./auth.dto";
import type { AuthService } from "./auth.service";

export interface AuthRoutesDependencies {
  authService: AuthService;
}

export const createAuthRoutes = (
  config: AppConfig,
  { authService }: AuthRoutesDependencies,
) =>
  new Elysia({ name: "auth-routes", prefix: "/auth" })
    .use(createAccessTokenPlugin(config))
    .post(
      "/login",
      async ({ accessToken, body }) => {
        const user = await authService.login(body);
        const token = await accessToken.sign({
          sub: user.id,
          email: user.email,
          role: user.role,
        });

        return successResponse({ token, user }, "Login successful");
      },
      {
        body: loginBodySchema,
        response: {
          200: loginResponseSchema,
          401: authErrorResponseSchema,
          422: authErrorResponseSchema,
        },
        detail: {
          tags: ["Auth"],
          summary: "Authenticate an internal user",
          description:
            "Validates an active internal user's email and password, then returns a bearer JWT and safe user profile.",
        },
      },
    )
    .get(
      "/me",
      async ({ accessToken, headers }) => {
        const user = await requireAuth(
          headers.authorization,
          accessToken,
          authService,
        );

        return successResponse({ user }, "Current user retrieved");
      },
      {
        response: {
          200: currentUserResponseSchema,
          401: authErrorResponseSchema,
        },
        detail: {
          tags: ["Auth"],
          summary: "Get the authenticated user",
          description:
            "Verifies the bearer JWT and returns the current active internal user.",
          security: [{ bearerAuth: [] }],
        },
      },
    );
