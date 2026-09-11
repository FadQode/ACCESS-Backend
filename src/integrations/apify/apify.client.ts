import type { ApifyConfig } from "../../config/env";
import { AppError, ServiceUnavailableError } from "../../shared/errors";
import type { ApifyClient, ApifyFetch, ApifyRunActorInput } from "./apify.types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const createApifyClient = (
  config: ApifyConfig,
  fetcher: ApifyFetch = fetch,
): ApifyClient => ({
  async runActorAndGetDatasetItems({ actorId, input = {} }: ApifyRunActorInput) {
    if (!config.apiToken) {
      throw new ServiceUnavailableError(
        "Social media sync is not configured",
        "SOCIAL_SYNC_NOT_CONFIGURED",
      );
    }

    const url = new URL(
      `${config.baseUrl}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items`,
    );
    url.searchParams.set("token", config.apiToken);
    url.searchParams.set("maxItems", String(config.maxItems));
    url.searchParams.set("timeout", String(Math.ceil(config.timeoutMs / 1000)));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    let response: Response;
    try {
      response = await fetcher(url.toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new ServiceUnavailableError(
        "Social media provider is unreachable",
        "SOCIAL_PROVIDER_UNREACHABLE",
      );
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401 || response.status === 403) {
      throw new ServiceUnavailableError(
        "Social media provider rejected the configured API token",
        "SOCIAL_PROVIDER_AUTH_FAILED",
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableError(
        `Social media provider returned HTTP ${response.status}`,
        "SOCIAL_PROVIDER_ERROR",
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AppError("Social media provider returned malformed JSON", {
        code: "SOCIAL_PROVIDER_INVALID_RESPONSE",
        statusCode: 502,
      });
    }

    // Apify returns either a bare array or a wrapped `{ data: { items } }`
    // shape depending on the endpoint/version.
    const items = Array.isArray(payload)
      ? payload
      : isRecord(payload) && Array.isArray(payload.items)
        ? payload.items
        : undefined;

    if (!items) {
      throw new AppError(
        "Social media provider response is missing the items array",
        { code: "SOCIAL_PROVIDER_INVALID_RESPONSE", statusCode: 502 },
      );
    }

    return items;
  },
});
