import { openapi } from "@elysia/openapi";
import type { ElysiaOpenAPIConfig } from "@elysia/openapi/types";
import { Elysia } from "elysia";

import type { AppConfig } from "../config/env";

const scalarBundleFile =
  "node_modules/@scalar/api-reference/dist/browser/standalone.js";

export const createOpenApiPlugin = (config: AppConfig) => {
  const scalarBundlePath = `${config.openApi.path}/scalar.standalone.js`;

  return new Elysia({ name: "openapi-documentation" })
    .get(
      scalarBundlePath,
      ({ set }) => {
        if (!config.openApi.enabled) {
          set.status = 404;
          return "Not Found";
        }

        return new Response(Bun.file(scalarBundleFile), {
          headers: {
            "cache-control": "public, max-age=3600",
            "content-type": "application/javascript; charset=utf-8",
          },
        });
      },
      {
        detail: {
          hide: true,
        },
      },
    )
    .use(
      openapi({
        enabled: config.openApi.enabled,
        path: config.openApi.path,
        specPath: config.openApi.specPath,
        provider: "scalar",
        exclude: {
          paths: [scalarBundlePath],
        },
        scalar: {
          url: config.openApi.specPath,
          cdn: scalarBundlePath,
        } as ElysiaOpenAPIConfig["scalar"],
        documentation: {
          info: {
            title: `${config.appName} API`,
            version: config.appVersion,
            description:
              "REST API for the ACCESS transportation complaint support workflow.",
          },
          servers: [
            {
              url: "/",
              description: "Current API root",
            },
          ],
          tags: [
            {
              name: "System",
              description: "Service availability and runtime information.",
            },
            {
              name: "Auth",
              description: "Authentication for internal ACCESS users.",
            },
            {
              name: "Complaints",
              description: "Internal complaint listing, detail, and updates.",
            },
            {
              name: "Quick Responses",
              description: "Manual agent response sessions for complaints.",
            },
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Access token returned by POST /auth/login.",
              },
            },
          },
        },
      }),
    );
};
