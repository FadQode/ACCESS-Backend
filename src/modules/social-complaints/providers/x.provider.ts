import type { ApifyConfig } from "../../../config/env";
import type { ApifyClient } from "../../../integrations/apify/apify.types";
import { ServiceUnavailableError } from "../../../shared/errors";
import type { SocialMediaProvider } from "../social-complaints.types";
import { isActorMarker, mapXItem } from "./mappers";

/**
 * Actor: scrape.badger/twitter-tweets-scraper (free-plan compatible,
 * pay-per-result). Its "Advanced Search" mode takes one X advanced-search
 * query string, e.g.
 *   (KAI OR "Kereta Api Indonesia") (gagal OR terlambat) lang:id
 * `APIFY_X_SEARCH_TERMS` holds that raw query.
 */
const buildQuery = (searchTerms: string): string => searchTerms.trim();

export const createXProvider = (
  config: ApifyConfig,
  client: ApifyClient,
): SocialMediaProvider => ({
  source: "x",
  async fetch() {
    const query = buildQuery(config.xSearchTerms);

    if (!config.xActorId || !query) {
      throw new ServiceUnavailableError(
        "X provider is not configured",
        "SOCIAL_PROVIDER_NOT_CONFIGURED",
      );
    }

    const items = await client.runActorAndGetDatasetItems({
      actorId: config.xActorId,
      input: {
        mode: "Advanced Search",
        query,
        query_type: "Latest",
        max_results: config.maxItems,
      },
    });

    return items.filter((item) => !isActorMarker(item)).map(mapXItem);
  },
});
