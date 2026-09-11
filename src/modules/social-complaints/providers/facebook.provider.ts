import type { ApifyConfig } from "../../../config/env";
import type { ApifyClient } from "../../../integrations/apify/apify.types";
import { ServiceUnavailableError } from "../../../shared/errors";
import type { SocialMediaProvider } from "../social-complaints.types";
import { isActorMarker, mapFacebookCommentItem } from "./mappers";

/**
 * Actor: unseenuser/fb-posts (free-plan compatible, pay-per-result).
 * Scrapes recent posts from a Facebook Page and flattens their comments into
 * one dataset row per comment. Only comments become social_complaints; posts
 * are preserved as context in metadata.
 */
export const createFacebookProvider = (
  config: ApifyConfig,
  client: ApifyClient,
): SocialMediaProvider => ({
  source: "facebook",
  async fetch() {
    if (!config.facebookActorId || !config.facebookPageUrl) {
      throw new ServiceUnavailableError(
        "Facebook provider is not configured",
        "SOCIAL_PROVIDER_NOT_CONFIGURED",
      );
    }

    const items = await client.runActorAndGetDatasetItems({
      actorId: config.facebookActorId,
      input: {
        sources: [config.facebookPageUrl],
        maxPosts: config.facebookMaxPosts,
        includeTopComments: false,
        fetchAllComments: true,
        fetchCommentReplies: false,
      },
    });

    return items
      .filter((item) => !isActorMarker(item))
      .map(mapFacebookCommentItem)
      .filter((item): item is NonNullable<typeof item> => item !== null);
  },
});
