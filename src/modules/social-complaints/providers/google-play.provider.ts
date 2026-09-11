import type { ApifyConfig } from "../../../config/env";
import type { ApifyClient } from "../../../integrations/apify/apify.types";
import { ServiceUnavailableError } from "../../../shared/errors";
import type { SocialMediaProvider } from "../social-complaints.types";
import { isActorMarker, mapGooglePlayItem } from "./mappers";

/**
 * Actor: thewolves/google-play-reviews-scraper (free-plan compatible,
 * pay-per-result). Input uses appIds[], country, language ("in" = Indonesian),
 * sort, maxItems.
 */
export const createGooglePlayProvider = (
  config: ApifyConfig,
  client: ApifyClient,
): SocialMediaProvider => ({
  source: "google_play",
  async fetch() {
    if (!config.googlePlayActorId || !config.googlePlayAppId) {
      throw new ServiceUnavailableError(
        "Google Play provider is not configured",
        "SOCIAL_PROVIDER_NOT_CONFIGURED",
      );
    }

    const items = await client.runActorAndGetDatasetItems({
      actorId: config.googlePlayActorId,
      input: {
        appIds: [config.googlePlayAppId],
        country: "ID",
        language: "in",
        sort: "NEWEST",
        maxItems: config.maxItems,
      },
    });

    return items.filter((item) => !isActorMarker(item)).map(mapGooglePlayItem);
  },
});
