import type { SocialComplaint } from "../../db/schema";

export type SocialComplaintSource = SocialComplaint["source"];

/**
 * Normalized representation of one external social record, independent of the
 * provider/Actor payload. Mappers own the raw-to-normalized conversion; the
 * database and sync layers never see raw Apify responses.
 */
export interface SocialComplaintInput {
  source: SocialComplaintSource;
  sourceReference: string;
  content: string;
  author?: string | null;
  sourceUrl?: string | null;
  publishedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
}

export interface SocialComplaintFilters {
  source?: SocialComplaintSource;
  page?: number;
  limit?: number;
}

export interface SocialComplaintListItem {
  id: string;
  source: SocialComplaintSource;
  sourceReference: string;
  content: string;
  author: string | null;
  sourceUrl: string | null;
  publishedAt: string;
  metadata: Record<string, unknown> | null;
  fetchedAt: string;
  createdAt: string;
}

export interface SocialComplaintSyncSummary {
  source: SocialComplaintSource;
  fetched: number;
  created: number;
  unchanged: number;
  failed: number;
}

/** Boundary every social source must implement. Replaceable adapter. */
export interface SocialMediaProvider {
  readonly source: SocialComplaintSource;
  fetch(): Promise<SocialComplaintInput[]>;
}
