export type ApifyFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface ApifyRunActorInput {
  actorId: string;
  input?: Record<string, unknown>;
}

export interface ApifyClient {
  /**
   * Runs an Actor synchronously and returns the dataset items.
   * Blocking by design: the caller is responsible for bounding the wait via
   * APIFY_TIMEOUT_MS.
   */
  runActorAndGetDatasetItems(run: ApifyRunActorInput): Promise<unknown[]>;
}
