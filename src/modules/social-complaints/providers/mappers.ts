import { ValidationError } from "../../../shared/errors";
import type {
  SocialComplaintInput,
  SocialComplaintSource,
} from "../social-complaints.types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function fail(source: SocialComplaintSource, reason: string): never {
  throw new ValidationError(
    `Social complaint ${source}: ${reason}`,
    { source },
    "SOCIAL_SYNC_INVALID_RECORD",
  );
}

const pickString = (
  record: Record<string, unknown>,
  keys: readonly string[],
): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const pickNumber = (
  record: Record<string, unknown>,
  keys: readonly string[],
): number | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() !== "" &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }
  return null;
};

const pickNestedString = (
  record: Record<string, unknown>,
  objectKeys: readonly string[],
  keys: readonly string[],
): string | null => {
  for (const objectKey of objectKeys) {
    const nested = record[objectKey];
    if (isRecord(nested)) {
      const value = pickString(nested, keys);
      if (value) return value;
    }
  }
  return null;
};

const toEpochMs = (value: number): number =>
  Math.abs(value) < 1_000_000_000_000 ? value * 1000 : value;

const parseDateValue = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(toEpochMs(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const date = new Date(toEpochMs(Number(trimmed)));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const pickDate = (
  record: Record<string, unknown>,
  keys: readonly string[],
): Date | null => {
  for (const key of keys) {
    if (key in record) {
      const date = parseDateValue(record[key]);
      if (date) return date;
    }
  }
  return null;
};

const requireReference = (
  source: SocialComplaintSource,
  record: Record<string, unknown>,
  keys: readonly string[],
): string => {
  const reference =
    pickString(record, keys) ?? pickNumber(record, keys)?.toString() ?? null;
  if (!reference) fail(source, "missing external id");
  return reference;
};

const requireContent = (
  source: SocialComplaintSource,
  record: Record<string, unknown>,
  keys: readonly string[],
): string => {
  const content = pickString(record, keys);
  if (!content) fail(source, "missing content");
  return content;
};

const compactMetadata = (
  entries: Record<string, unknown>,
): Record<string, unknown> | null => {
  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value !== null && value !== undefined) metadata[key] = value;
  }
  return Object.keys(metadata).length > 0 ? metadata : null;
};

const assertRecord = (
  source: SocialComplaintSource,
  value: unknown,
): Record<string, unknown> => {
  if (!isRecord(value)) fail(source, "record is not an object");
  return value;
};

/**
 * Some Actors emit non-content marker records (e.g. `{ "noResults": true }`)
 * when a query returns nothing. These carry no external id/content and must be
 * ignored before strict mapping rather than aborting the whole sync.
 */
export const isActorMarker = (value: unknown): boolean =>
  isRecord(value) &&
  (value.noResults === true ||
    value.no_results === true ||
    ("noResults" in value && Object.keys(value).length === 1) ||
    ("no_results" in value && Object.keys(value).length === 1));

export const mapGooglePlayItem = (value: unknown): SocialComplaintInput => {
  const source = "google_play" as const;
  const record = assertRecord(source, value);

  return {
    source,
    sourceReference: requireReference(source, record, [
      "reviewId",
      "review_id",
      "id",
    ]),
    content: requireContent(source, record, [
      "text",
      "content",
      "reviewText",
      "review_text",
      "body",
      "comment",
    ]),
    author: pickString(record, [
      "userName",
      "user_name",
      "authorName",
      "author",
      "reviewerName",
      "name",
    ]),
    sourceUrl: pickString(record, ["reviewUrl", "url", "link", "reviewLink"]),
    publishedAt: pickDate(record, [
      "date",
      "at",
      "publishedAt",
      "published_at",
      "reviewDate",
      "timestamp",
      "updatedAt",
    ]),
    metadata: compactMetadata({
      rating: pickNumber(record, ["score", "rating", "stars"]),
      appVersion: pickString(record, ["appVersion", "app_version", "version"]),
      thumbsUpCount: pickNumber(record, [
        "thumbsUpCount",
        "thumbs_up_count",
        "thumbsUp",
        "likes",
      ]),
    }),
  };
};

/**
 * Facebook page ingestion (`unseenuser/fb-posts`) emits one flattened dataset
 * row per comment, repeating the parent post fields on each row. Posts are only
 * contextual data: a row without a comment is skipped (returns null), and the
 * post id/url/text are preserved in metadata for provenance.
 *
 * Returns null for non-comment rows or comments with empty text instead of
 * aborting the whole sync, because pages commonly contain sticker/gif comments
 * and comment-less posts.
 */
export const mapFacebookCommentItem = (
  value: unknown,
): SocialComplaintInput | null => {
  const source = "facebook" as const;
  const record = assertRecord(source, value);

  const sourceReference = pickString(record, ["commentId", "comment_id"]);
  const content = pickString(record, [
    "commentText",
    "comment_text",
    "message",
    "content",
  ]);

  if (!sourceReference || !content) return null;

  return {
    source,
    sourceReference,
    content,
    author: pickString(record, [
      "commentAuthorName",
      "comment_author_name",
      "commentAuthorShortName",
      "authorName",
      "profileName",
    ]),
    sourceUrl:
      pickString(record, [
        "commentPermalink",
        "comment_permalink",
        "commentUrl",
        "comment_url",
      ]) ?? pickString(record, ["permalink", "url"]),
    publishedAt: pickDate(record, [
      "commentTime",
      "commentCreatedAt",
      "comment_created_at",
      "publishTimeIso",
      "publishTime",
    ]),
    metadata: compactMetadata({
      post_id: pickString(record, ["id", "postId", "post_id"]),
      post_url: pickString(record, ["permalink", "url"]),
      post_text: pickString(record, ["text"]),
      post_published_at: pickString(record, ["publishTimeIso"]),
      post_reaction_count: pickNumber(record, ["reactionCount", "reaction_count"]),
      post_comment_count: pickNumber(record, ["commentCount", "comment_count"]),
      comment_reply_count: pickNumber(record, [
        "commentReplyCount",
        "comment_reply_count",
      ]),
      comment_reaction_count: pickNumber(record, [
        "commentReactionCount",
        "comment_reaction_count",
      ]),
      comment_index: pickNumber(record, ["commentIndex", "comment_index"]),
    }),
  };
};

export const mapXItem = (value: unknown): SocialComplaintInput => {
  const source = "x" as const;
  const record = assertRecord(source, value);

  const sourceReference = requireReference(source, record, [
    "id_str",
    "id",
    "tweetId",
    "tweet_id",
  ]);
  const username =
    pickString(record, ["username", "screen_name", "userName", "author"]) ??
    pickNestedString(record, ["user", "author"], [
      "screen_name",
      "username",
      "name",
    ]);

  return {
    source,
    sourceReference,
    content: requireContent(source, record, [
      "full_text",
      "fullText",
      "text",
      "content",
      "tweet",
    ]),
    author: username,
    sourceUrl:
      pickString(record, [
        "url",
        "tweetUrl",
        "tweet_url",
        "permalink",
        "link",
      ]) ??
      (username ? `https://x.com/${username}/status/${sourceReference}` : null),
    publishedAt: pickDate(record, [
      "created_at",
      "createdAt",
      "publishedAt",
      "published_at",
      "date",
      "time",
      "timestamp",
    ]),
    metadata: compactMetadata({
      likeCount: pickNumber(record, [
        "likeCount",
        "like_count",
        "favorite_count",
        "likes",
      ]),
      retweetCount: pickNumber(record, [
        "retweetCount",
        "retweet_count",
        "retweets",
      ]),
      replyCount: pickNumber(record, [
        "replyCount",
        "reply_count",
        "replies",
      ]),
    }),
  };
};
