import { describe, expect, test } from "bun:test";

import { createApp } from "../src/app";
import { loadEnv } from "../src/config/env";
import { createDatabase } from "../src/db";

describe("health routes", () => {
  test("returns the standard success envelope", async () => {
    const config = loadEnv({ NODE_ENV: "test", APP_VERSION: "test-version" });
    const database = createDatabase(config.database);
    const app = createApp({ config, db: database.db });

    const response = await app.handle(
      new Request("http://localhost/health"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(body).toMatchObject({
      success: true,
      message: "Service is healthy",
      data: {
        service: "ACCESS Backend",
        status: "ok",
        version: "test-version",
      },
    });

    await database.close();
  });

  test("returns a structured not-found error", async () => {
    const config = loadEnv({ NODE_ENV: "test" });
    const database = createDatabase(config.database);
    const app = createApp({ config, db: database.db });

    const response = await app.handle(
      new Request("http://localhost/missing"),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      success: false,
      message: "Route not found",
      error: {
        code: "ROUTE_NOT_FOUND",
      },
    });

    await database.close();
  });
});
