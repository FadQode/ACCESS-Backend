import { describe, expect, test } from "bun:test";

import { loadEnv } from "../src/config/env";

describe("loadEnv", () => {
  test("uses development defaults", () => {
    const config = loadEnv({});

    expect(config.nodeEnv).toBe("development");
    expect(config.port).toBe(3000);
    expect(config.corsOrigins).toEqual(["http://localhost:3000"]);
    expect(config.database.maxConnections).toBe(10);
    expect(config.redis.enabled).toBe(false);
    expect(config.ai.enabled).toBe(false);
  });

  test("rejects an invalid port", () => {
    expect(() => loadEnv({ PORT: "70000" })).toThrow(
      "PORT must be an integer between 1 and 65535",
    );
  });

  test("parses typed integration settings", () => {
    const config = loadEnv({
      AI_ENABLED: "true",
      AI_PROVIDER: "fastapi",
      CORS_CREDENTIALS: "false",
      DATABASE_MAX_CONNECTIONS: "20",
      REDIS_ENABLED: "true",
    });

    expect(config.ai.enabled).toBe(true);
    expect(config.ai.provider).toBe("fastapi");
    expect(config.corsCredentials).toBe(false);
    expect(config.database.maxConnections).toBe(20);
    expect(config.redis.enabled).toBe(true);
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
});
