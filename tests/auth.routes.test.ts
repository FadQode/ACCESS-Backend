import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";

import { loadEnv } from "../src/config/env";
import { createAuthRoutes } from "../src/modules/auth/auth.routes";
import type { AuthService } from "../src/modules/auth/auth.service";
import type { AuthUser } from "../src/modules/auth/auth.types";
import { errorPlugin } from "../src/plugins/error.plugin";
import { UnauthorizedError } from "../src/shared/errors";

const user: AuthUser = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "Agent One",
  email: "agent1@access.test",
  role: "agent",
};

const authService: AuthService = {
  async login(input) {
    if (
      input.email.toLowerCase() !== user.email ||
      input.password !== "password123"
    ) {
      throw new UnauthorizedError(
        "Invalid email or password",
        "INVALID_CREDENTIALS",
      );
    }

    return user;
  },
  async getCurrentUser(userId) {
    if (userId !== user.id) {
      throw new UnauthorizedError();
    }

    return user;
  },
};

const createTestApp = () => {
  const config = loadEnv({
    NODE_ENV: "test",
    AUTH_ACCESS_TOKEN_SECRET: "auth-route-test-secret",
  });

  return new Elysia()
    .use(errorPlugin)
    .use(createAuthRoutes(config, { authService }));
};

describe("auth routes", () => {
  test("logs in and resolves the current user from the bearer token", async () => {
    const app = createTestApp();
    const loginResponse = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "agent1@access.test",
          password: "password123",
        }),
      }),
    );
    const loginBody = await loginResponse.json();

    expect(loginResponse.status).toBe(200);
    expect(loginBody).toMatchObject({
      success: true,
      message: "Login successful",
      data: { user },
    });
    expect(loginBody.data.token).toBeString();
    expect(loginBody.data.user).not.toHaveProperty("passwordHash");

    const meResponse = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: { authorization: `Bearer ${loginBody.data.token}` },
      }),
    );

    expect(meResponse.status).toBe(200);
    expect(await meResponse.json()).toEqual({
      success: true,
      message: "Current user retrieved",
      data: { user },
    });
  });

  test("rejects invalid credentials and missing bearer tokens", async () => {
    const app = createTestApp();
    const loginResponse = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "agent1@access.test",
          password: "wrong",
        }),
      }),
    );
    const meResponse = await app.handle(new Request("http://localhost/auth/me"));
    const invalidTokenResponse = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: { authorization: "Bearer invalid-token" },
      }),
    );

    expect(loginResponse.status).toBe(401);
    expect(await loginResponse.json()).toEqual({
      success: false,
      message: "Invalid email or password",
      error: { code: "INVALID_CREDENTIALS" },
    });
    expect(meResponse.status).toBe(401);
    expect(await meResponse.json()).toEqual({
      success: false,
      message: "Unauthorized",
      error: { code: "UNAUTHORIZED" },
    });
    expect(invalidTokenResponse.status).toBe(401);
    expect(await invalidTokenResponse.json()).toEqual({
      success: false,
      message: "Unauthorized",
      error: { code: "UNAUTHORIZED" },
    });
  });
});
