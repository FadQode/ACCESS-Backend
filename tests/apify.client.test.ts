import { describe, expect, test } from "bun:test";

import type { ApifyConfig } from "../src/config/env";
import { createApifyClient } from "../src/integrations/apify/apify.client";
import { AppError, ServiceUnavailableError } from "../src/shared/errors";

const config: ApifyConfig = {
  apiToken: "apify-test-token",
  baseUrl: "https://api.apify.test/v2",
  facebookActorId: "actor-fb",
  facebookMaxPosts: 10,
  facebookPageUrl: "https://facebook.test/access",
  googlePlayActorId: "actor-play",
  googlePlayAppId: "com.access.app",
  maxItems: 50,
  pollIntervalMs: 1_000,
  timeoutMs: 5_000,
  xActorId: "actor-x",
  xSearchTerms: "ACCESS",
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

describe("apify client", () => {
  test("fails clearly when the token is not configured", async () => {
    const client = createApifyClient({ ...config, apiToken: undefined });

    try {
      await client.runActorAndGetDatasetItems({ actorId: "actor-play" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableError);
      expect((error as AppError).code).toBe("SOCIAL_SYNC_NOT_CONFIGURED");
    }
  });

  test("returns dataset items from a bare array response", async () => {
    let capturedUrl = "";
    let capturedBody: unknown;
    const client = createApifyClient(config, async (input, init) => {
      capturedUrl = String(input);
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse([{ reviewId: "1", text: "error" }]);
    });

    const items = await client.runActorAndGetDatasetItems({
      actorId: "actor-play",
      input: { appId: "com.access.app" },
    });

    expect(items).toHaveLength(1);
    expect(capturedUrl).toContain("/acts/actor-play/run-sync-get-dataset-items");
    expect(capturedUrl).toContain("token=apify-test-token");
    expect(capturedUrl).toContain("maxItems=50");
    expect(capturedBody).toEqual({ appId: "com.access.app" });
  });

  test("returns dataset items from a wrapped items response", async () => {
    const client = createApifyClient(config, async () =>
      jsonResponse({ items: [{ id: "a" }, { id: "b" }] }),
    );

    const items = await client.runActorAndGetDatasetItems({
      actorId: "actor-x",
    });
    expect(items).toHaveLength(2);
  });

  test("auth failure maps to SOCIAL_PROVIDER_AUTH_FAILED", async () => {
    const client = createApifyClient(config, async () =>
      jsonResponse({ error: "unauthorized" }, 401),
    );

    try {
      await client.runActorAndGetDatasetItems({ actorId: "actor-x" });
      expect.unreachable();
    } catch (error) {
      expect((error as AppError).code).toBe("SOCIAL_PROVIDER_AUTH_FAILED");
    }
  });

  test("server error maps to SOCIAL_PROVIDER_ERROR", async () => {
    const client = createApifyClient(config, async () =>
      jsonResponse({}, 500),
    );

    try {
      await client.runActorAndGetDatasetItems({ actorId: "actor-x" });
      expect.unreachable();
    } catch (error) {
      expect((error as AppError).code).toBe("SOCIAL_PROVIDER_ERROR");
    }
  });

  test("network failure maps to SOCIAL_PROVIDER_UNREACHABLE", async () => {
    const client = createApifyClient(config, async () => {
      throw new Error("ECONNREFUSED");
    });

    try {
      await client.runActorAndGetDatasetItems({ actorId: "actor-x" });
      expect.unreachable();
    } catch (error) {
      expect((error as AppError).code).toBe("SOCIAL_PROVIDER_UNREACHABLE");
    }
  });

  test("malformed JSON maps to SOCIAL_PROVIDER_INVALID_RESPONSE", async () => {
    const client = createApifyClient(
      config,
      async () => new Response("<html>not json</html>", { status: 200 }),
    );

    try {
      await client.runActorAndGetDatasetItems({ actorId: "actor-x" });
      expect.unreachable();
    } catch (error) {
      expect((error as AppError).code).toBe("SOCIAL_PROVIDER_INVALID_RESPONSE");
    }
  });

  test("missing items maps to SOCIAL_PROVIDER_INVALID_RESPONSE", async () => {
    const client = createApifyClient(config, async () =>
      jsonResponse({ foo: "bar" }),
    );

    try {
      await client.runActorAndGetDatasetItems({ actorId: "actor-x" });
      expect.unreachable();
    } catch (error) {
      expect((error as AppError).code).toBe("SOCIAL_PROVIDER_INVALID_RESPONSE");
    }
  });
});
