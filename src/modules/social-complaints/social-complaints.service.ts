import { NotFoundError } from "../../shared/errors";
import type { SocialComplaintsRepository } from "./social-complaints.repository";
import type {
  SocialComplaintFilters,
  SocialComplaintListItem,
} from "./social-complaints.types";

const iso = (date: Date): string => date.toISOString();

const toListItem = (row: {
  id: string;
  source: SocialComplaintListItem["source"];
  sourceReference: string;
  content: string;
  author: string | null;
  sourceUrl: string | null;
  publishedAt: Date;
  metadata: Record<string, unknown> | null;
  fetchedAt: Date;
  createdAt: Date;
}): SocialComplaintListItem => ({
  id: row.id,
  source: row.source,
  sourceReference: row.sourceReference,
  content: row.content,
  author: row.author,
  sourceUrl: row.sourceUrl,
  publishedAt: iso(row.publishedAt),
  metadata: row.metadata,
  fetchedAt: iso(row.fetchedAt),
  createdAt: iso(row.createdAt),
});

export interface SocialComplaintsService {
  listSocialComplaints(filters: SocialComplaintFilters): Promise<{
    items: SocialComplaintListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>;
  getSocialComplaintById(id: string): Promise<SocialComplaintListItem>;
}

export const createSocialComplaintsService = (
  repository: SocialComplaintsRepository,
): SocialComplaintsService => ({
  async listSocialComplaints(filters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const result = await repository.findSocialComplaints({
      ...filters,
      page,
      limit,
    });

    return {
      items: result.items.map(toListItem),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  },

  async getSocialComplaintById(id) {
    const socialComplaint = await repository.findSocialComplaintById(id);
    if (!socialComplaint) {
      throw new NotFoundError(
        "Social complaint not found",
        "SOCIAL_COMPLAINT_NOT_FOUND",
      );
    }
    return toListItem(socialComplaint);
  },
});
