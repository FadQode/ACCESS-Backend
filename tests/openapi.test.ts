import { describe, expect, test } from "bun:test";

import { createApp } from "../src/app";
import { loadEnv } from "../src/config/env";
import { createDatabase } from "../src/db";

interface OpenApiOperation {
  requestBody?: {
    content?: Record<
      string,
      {
        schema?: OpenApiSchema;
      }
    >;
  };
  responses?: Record<
    string,
    {
      content?: Record<
        string,
        {
          schema?: OpenApiSchema;
        }
      >;
    }
  >;
  security?: Array<Record<string, string[]>>;
  tags?: string[];
}

interface OpenApiSchema {
  enum?: string[];
  properties?: Record<string, OpenApiSchema>;
}

interface OpenApiDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  servers?: Array<{
    description?: string;
    url: string;
  }>;
  components?: {
    securitySchemes?: Record<string, unknown>;
  };
  paths: Record<
    string,
    {
      get?: OpenApiOperation;
      post?: OpenApiOperation;
    }
  >;
}

describe("OpenAPI documentation", () => {
  test("serves Scalar and a documented bearer-auth API contract", async () => {
    const config = loadEnv({ NODE_ENV: "test", APP_VERSION: "docs-test" });
    const database = createDatabase(config.database);
    const app = createApp({ config, db: database.db });

    try {
      const scalarResponse = await app.handle(
        new Request("http://localhost/docs"),
      );
      const scalarSlashResponse = await app.handle(
        new Request("http://localhost/docs/"),
      );
      const scalarBundleResponse = await app.handle(
        new Request("http://localhost/docs/scalar.standalone.js"),
      );
      const specResponse = await app.handle(
        new Request("http://localhost/docs/openapi.json"),
      );
      const document = (await specResponse.json()) as OpenApiDocument;

      expect(scalarResponse.status).toBe(200);
      expect(scalarResponse.headers.get("content-type")).toContain("text/html");
      const scalarHtml = await scalarResponse.text();
      expect(scalarHtml).toContain('"url":"/docs/openapi.json"');
      expect(scalarHtml).toContain('"cdn":"/docs/scalar.standalone.js"');
      expect(scalarHtml).toContain('src="/docs/scalar.standalone.js"');
      expect(scalarHtml).not.toContain("cdn.jsdelivr.net");
      expect(scalarSlashResponse.status).toBe(200);
      expect(scalarBundleResponse.status).toBe(200);
      expect(scalarBundleResponse.headers.get("content-type")).toContain(
        "application/javascript",
      );

      expect(specResponse.status).toBe(200);
      expect(document.openapi).toBe("3.0.3");
      expect(document.info).toMatchObject({
        title: "ACCESS Backend API",
        version: "docs-test",
      });
      expect(document.servers).toEqual([
        {
          url: "/",
          description: "Current API root",
        },
      ]);
      expect(document.paths["/health"]?.get?.tags).toEqual(["System"]);
      expect(document.paths["/auth/login"]?.post?.tags).toEqual(["Auth"]);
      expect(
        document.paths["/auth/login"]?.post?.responses?.["200"]
          ?.content?.["application/json"]?.schema?.properties?.data?.properties
          ?.user?.properties?.role?.enum,
      ).toEqual(["agent", "manager", "admin"]);
      expect(document.paths["/auth/me"]?.get?.security).toEqual([
        { bearerAuth: [] },
      ]);
      expect(document.paths["/complaints"]?.get?.security).toEqual([
        { bearerAuth: [] },
      ]);
      expect(document.paths["/quick-responses"]?.post?.security).toEqual([
        { bearerAuth: [] },
      ]);
      expect(
        document.paths["/quick-responses"]?.post?.requestBody?.content?.[
          "application/json"
        ]?.schema?.properties?.response?.properties?.outcome?.enum,
      ).toEqual(["sent_resolved", "sent_hea_action", "copy_only"]);
      expect(document.paths).not.toHaveProperty("/quick-responses/preview");
      expect(document.paths).not.toHaveProperty("/tickets");
      expect(document.paths).not.toHaveProperty("/action-requests");
      expect(document.components?.securitySchemes).toHaveProperty(
        "bearerAuth",
      );
    } finally {
      await database.close();
    }
  });

  test("does not expose documentation by default in production", async () => {
    const config = loadEnv({
      NODE_ENV: "production",
      AUTH_ACCESS_TOKEN_SECRET: "a".repeat(32),
      AUTH_REFRESH_TOKEN_SECRET: "b".repeat(32),
    });
    const database = createDatabase(config.database);
    const app = createApp({ config, db: database.db });

    try {
      const response = await app.handle(new Request("http://localhost/docs"));
      const bundleResponse = await app.handle(
        new Request("http://localhost/docs/scalar.standalone.js"),
      );

      expect(config.openApi.enabled).toBe(false);
      expect(response.status).toBe(404);
      expect(bundleResponse.status).toBe(404);
    } finally {
      await database.close();
    }
  });
});
