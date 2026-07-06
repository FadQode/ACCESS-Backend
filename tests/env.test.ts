import { describe, expect, test } from "bun:test";

import { loadEnv } from "../src/config/env";

describe("loadEnv", () => {
  test("uses development defaults", () => {
    const config = loadEnv({});

    expect(config.nodeEnv).toBe("development");
    expect(config.port).toBe(3000);
    expect(config.corsOrigins).toEqual(["http://localhost:3000"]);
    expect(config.database.maxConnections).toBe(10);
    expect(config.auth.accessTokenTtlSeconds).toBe(604_800);
    expect(config.openApi).toEqual({
      enabled: true,
      path: "/docs",
      specPath: "/docs/openapi.json",
    });
    expect(config.redis.enabled).toBe(false);
    expect(config.ai.enabled).toBe(false);
    expect(config.supabase).toMatchObject({
      referenceBucket: "references_storage",
      referenceMaxFileSizeMb: 5,
      signedUrlExpiresSeconds: 3600,
    });
    expect(config.supabase.url).toBeUndefined();
    expect(config.supabase.serviceRoleKey).toBeUndefined();
  });

  test("rejects an invalid port", () => {
    expect(() => loadEnv({ PORT: "70000" })).toThrow(
      "PORT must be an integer between 1 and 65535",
    );
  });

  test("parses typed integration settings", () => {
    const config = loadEnv({
      AI_ENABLED: "true",
      AI_CHAT_COMPLETIONS_URL: "http://localhost:20128/v1/chat/completions",
      AI_GUIDELINES_PATH: "src/modules/quick-responses/prompts/heat-guidelines.txt",
      AI_MAX_INPUT_CHARS: "4000",
      AI_MAX_OUTPUT_TOKENS: "900",
      AI_MODEL: "oc/deepseek-v4-flash-free",
      AI_PROVIDER: "opencode",
      AI_TEMPERATURE: "0.2",
      CORS_CREDENTIALS: "false",
      DATABASE_MAX_CONNECTIONS: "20",
      REDIS_ENABLED: "true",
      REFERENCE_MAX_FILE_SIZE_MB: "8",
      SUPABASE_REFERENCE_BUCKET: "references_storage",
      SUPABASE_SIGNED_URL_EXPIRES: "7200",
      SUPABASE_URL: "https://example.supabase.co",
    });

    expect(config.ai.enabled).toBe(true);
    expect(config.ai.provider).toBe("opencode");
    expect(config.ai.chatCompletionsUrl).toBe(
      "http://localhost:20128/v1/chat/completions",
    );
    expect(config.ai.model).toBe("oc/deepseek-v4-flash-free");
    expect(config.ai.maxInputChars).toBe(4000);
    expect(config.ai.maxOutputTokens).toBe(900);
    expect(config.ai.temperature).toBe(0.2);
    expect(config.ai.guidelinesPath).toBe(
      "src/modules/quick-responses/prompts/heat-guidelines.txt",
    );
    expect(config.corsCredentials).toBe(false);
    expect(config.database.maxConnections).toBe(20);
    expect(config.redis.enabled).toBe(true);
    expect(config.supabase.referenceMaxFileSizeMb).toBe(8);
    expect(config.supabase.referenceBucket).toBe("references_storage");
    expect(config.supabase.signedUrlExpiresSeconds).toBe(7200);
    expect(config.supabase.url).toBe("https://example.supabase.co");
  });

  test("requires secure production auth secrets", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "production",
        AUTH_ACCESS_TOKEN_SECRET: "short",
        AUTH_REFRESH_TOKEN_SECRET: "also-short",
      }),
    ).toThrow(
      "AUTH_ACCESS_TOKEN_SECRET must contain at least 32 characters in production",
    );
  });

  test("supports a custom OpenAPI path", () => {
    const config = loadEnv({ OPENAPI_PATH: "/reference" });

    expect(config.openApi.path).toBe("/reference");
    expect(config.openApi.specPath).toBe("/reference/openapi.json");
  });

  test("rejects an invalid OpenAPI path", () => {
    expect(() => loadEnv({ OPENAPI_PATH: "docs/" })).toThrow(
      "OPENAPI_PATH must start with /, contain a path segment, and not end with /",
    );
  });
});
