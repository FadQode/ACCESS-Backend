import type { ApifyConfig } from "../../../config/env";
import type { ApifyClient } from "../../../integrations/apify/apify.types";
import type {
  SocialComplaintSource,
  SocialMediaProvider,
} from "../social-complaints.types";
import { createFacebookProvider } from "./facebook.provider";
import { createGooglePlayProvider } from "./google-play.provider";
import { createXProvider } from "./x.provider";

export const createSocialMediaProviders = (
  config: ApifyConfig,
  client: ApifyClient,
): Record<SocialComplaintSource, SocialMediaProvider> => ({
  google_play: createGooglePlayProvider(config, client),
  facebook: createFacebookProvider(config, client),
  x: createXProvider(config, client),
});
