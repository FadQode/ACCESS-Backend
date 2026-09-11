import type { ComplaintSource } from "../complaints/complaints.types";
import type { SocialComplaintSource } from "./social-complaints.types";

/**
 * The ingestion vocabulary and the processed-complaint vocabulary are separate
 * (see the social media complaint plan §3). This is the single place that maps
 * between them; the client never sends a mapped source.
 */
const COMPLAINT_SOURCE_BY_SOCIAL_SOURCE: Record<
  SocialComplaintSource,
  ComplaintSource
> = {
  google_play: "google_play",
  facebook: "facebook",
  x: "twitter",
};

export const toComplaintSource = (
  source: SocialComplaintSource,
): ComplaintSource => COMPLAINT_SOURCE_BY_SOCIAL_SOURCE[source];
