import type { AppConfig } from "../../config/env";
import { createTransactionManager, type Database } from "../../db";
import { createApifyClient } from "../../integrations/apify/apify.client";
import { createSocialMediaProviders } from "./providers/social-media.providers";
import { createSocialComplaintsRepository } from "./social-complaints.repository";
import { createSocialComplaintsService } from "./social-complaints.service";
import {
  createSocialMediaSyncService,
  type SocialMediaSyncService,
} from "./social-media-sync.service";

export interface SocialComplaintsComposition {
  repository: ReturnType<typeof createSocialComplaintsRepository>;
  service: ReturnType<typeof createSocialComplaintsService>;
  syncService: SocialMediaSyncService;
}

/**
 * Single wiring point for the social complaint module, shared by the HTTP routes
 * and the scheduler so provider/Apify logic is never duplicated.
 */
export const createSocialComplaintsComposition = (
  config: AppConfig,
  db: Database,
): SocialComplaintsComposition => {
  const repository = createSocialComplaintsRepository(db);

  return {
    repository,
    service: createSocialComplaintsService(repository),
    syncService: createSocialMediaSyncService({
      transactionManager: createTransactionManager(db),
      repository,
      providers: createSocialMediaProviders(
        config.apify,
        createApifyClient(config.apify),
      ),
    }),
  };
};
