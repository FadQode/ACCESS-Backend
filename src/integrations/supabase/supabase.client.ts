import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { SupabaseConfig } from "../../config/env";
import { ServiceUnavailableError } from "../../shared/errors";

export const createSupabaseClient = (
  config: SupabaseConfig,
): SupabaseClient => {
  if (!config.url || !config.serviceRoleKey) {
    throw new ServiceUnavailableError(
      "Storage is not configured",
      "STORAGE_NOT_CONFIGURED",
    );
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
