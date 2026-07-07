import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";

import { loadEnv } from "../src/config/env";
import { createAuthRoutes } from "../src/modules/auth/auth.routes";
import type { AuthService } from "../src/modules/auth/auth.service";
import type { AuthUser } from "../src/modules/auth/auth.types";
import { createQuickResponsePreviewService } from "../src/modules/quick-responses/quick-response-preview.service";
import { createQuickResponseRoutes } from "../src/modules/quick-responses/quick-responses.routes";
import type { QuickResponsesService } from "../src/modules/quick-responses/quick-responses.service";
import { errorPlugin } from "../src/plugins/error.plugin";
import { UnauthorizedError } from "../src/shared/errors";

const users: AuthUser[] = [
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Agent One",
    email: "agent1@access.test",
    role: "agent",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Manager One",
    email: "manager1@access.test",
    role: "manager",
  },
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Admin One",
    email: "admin@access.test",
    role: "admin",
  },
];

const authService: AuthService = {
  async login(input) {
    const user = users.find((item) => item.email === input.email);

    if (!user || input.password !== "password123") {
      throw new UnauthorizedError(
        "Invalid email or password",
        "INVALID_CREDENTIALS",
      );
    }

    return user;
  },
  async getCurrentUser(userId) {
    const user = users.find((item) => item.id === userId);

    if (!user) {
      throw new UnauthorizedError();
    }

    return user;
  },
};

const createTestApp = () => {
  const config = loadEnv({
    NODE_ENV: "test",
    AUTH_ACCESS_TOKEN_SECRET: "quick-response-preview-route-secret",
    AI_ENABLED: "false",
  });
  const quickResponsePreviewService = createQuickResponsePreviewService(
    config.ai,
    {
      async createChatCompletion() {
        throw new Error("AI should not be called while disabled");
      },
    },
  );

  return new Elysia()
    .use(errorPlugin)
    .use(createAuthRoutes(config, { authService }))
    .use(
      createQuickResponseRoutes(config, {
        authService,
        quickResponsePreviewService,
        quickResponsesService: {} as QuickResponsesService,
      }),
    );
};

const login = async (
  app: { handle(request: Request): Promise<Response> },
  email: string,
): Promise<string> => {
  const response = await app.handle(
    new Request("http://localhost/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    }),
  );
  const body = await response.json();

  return body.data.token;
};

describe("quick response preview routes", () => {
  test("returns fallback HEAT suggestions for an authenticated agent", async () => {
    const app = createTestApp();
    const token = await login(app, "agent1@access.test");
    const response = await app.handle(
      new Request("http://localhost/quick-responses/preview", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          complaintText: "Saldo saya terpotong tapi tiket tidak muncul.",
          category: "payment",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.suggestionSource).toBe("fallback");
    expect(body.data.suggestions.hear).toHaveLength(3);
    expect(body.data.suggestions.empathize).toHaveLength(3);
    expect(body.data.suggestions.apologize).toHaveLength(3);
    expect(body.data.suggestions.takeAction).toHaveLength(3);
    expect(body.data.relevantReferences).toEqual([]);
    expect(body.data.similarResolvedCases).toEqual([]);
    expect(body.data).not.toHaveProperty("finalResponse");
    expect(body.data).not.toHaveProperty("confidence");
    expect(body.data).not.toHaveProperty("requiresManagerAction");
  });

  test("allows admins and rejects managers", async () => {
    const app = createTestApp();
    const adminToken = await login(app, "admin@access.test");
    const managerToken = await login(app, "manager1@access.test");
    const requestBody = {
      complaintText: "Refund pembatalan tiket saya belum masuk.",
      category: "refund",
    };
    const adminResponse = await app.handle(
      new Request("http://localhost/quick-responses/preview", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }),
    );
    const managerResponse = await app.handle(
      new Request("http://localhost/quick-responses/preview", {
        method: "POST",
        headers: {
          authorization: `Bearer ${managerToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }),
    );

    expect(adminResponse.status).toBe(200);
    expect(managerResponse.status).toBe(403);
    expect(await managerResponse.json()).toMatchObject({
      success: false,
      error: { code: "QUICK_RESPONSE_PREVIEW_FORBIDDEN" },
    });
  });

  test("rejects unauthenticated and invalid preview requests", async () => {
    const app = createTestApp();
    const missingAuthResponse = await app.handle(
      new Request("http://localhost/quick-responses/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          complaintText: "Kereta terlambat lebih dari satu jam.",
        }),
      }),
    );
    const invalidBodyResponse = await app.handle(
      new Request("http://localhost/quick-responses/preview", {
        method: "POST",
        headers: {
          authorization: `Bearer ${await login(app, "agent1@access.test")}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ complaintText: "" }),
      }),
    );

    expect(missingAuthResponse.status).toBe(401);
    expect(invalidBodyResponse.status).toBe(422);
  });
});
