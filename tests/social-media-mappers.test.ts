import { describe, expect, test } from "bun:test";

import {
  mapFacebookCommentItem,
  mapGooglePlayItem,
  mapXItem,
} from "../src/modules/social-complaints/providers/mappers";
import { ValidationError } from "../src/shared/errors";

describe("mapGooglePlayItem", () => {
  test("maps a normal review to a normalized record", () => {
    const mapped = mapGooglePlayItem({
      reviewId: "play-review-1001",
      text: "Aplikasinya sering error ketika melakukan pembayaran.",
      userName: "Rina",
      reviewUrl: "https://play.example.test/review/1001",
      date: "2026-09-08T09:15:00.000Z",
      score: 1,
      appVersion: "3.2.1",
    });

    expect(mapped.source).toBe("google_play");
    expect(mapped.sourceReference).toBe("play-review-1001");
    expect(mapped.content).toBe(
      "Aplikasinya sering error ketika melakukan pembayaran.",
    );
    expect(mapped.author).toBe("Rina");
    expect(mapped.publishedAt).toBeInstanceOf(Date);
    expect(mapped.metadata).toEqual({ rating: 1, appVersion: "3.2.1" });
  });

  test("tolerates missing optional fields", () => {
    const mapped = mapGooglePlayItem({ id: 42, content: "Aplikasi error." });

    expect(mapped.sourceReference).toBe("42");
    expect(mapped.author).toBeNull();
    expect(mapped.sourceUrl).toBeNull();
    expect(mapped.publishedAt).toBeNull();
    expect(mapped.metadata).toBeNull();
  });

  test("rejects a missing external id", () => {
    expect(() => mapGooglePlayItem({ text: "no id" })).toThrow(ValidationError);
  });

  test("rejects missing content", () => {
    expect(() => mapGooglePlayItem({ reviewId: "x-1" })).toThrow(
      ValidationError,
    );
  });

  test("rejects a malformed (non-object) record", () => {
    expect(() => mapGooglePlayItem("not-an-object")).toThrow(ValidationError);
    expect(() => mapGooglePlayItem(null)).toThrow(ValidationError);
  });
});

describe("mapFacebookCommentItem", () => {
  test("maps a flattened comment row to a normalized record", () => {
    const mapped = mapFacebookCommentItem({
      id: "1388179326800013",
      permalink: "https://www.facebook.com/CCKAI121/posts/pfbid0ABC",
      text: "Postingan KAI tentang perjalanan.",
      authorName: "KAI121",
      publishTimeIso: "2026-09-08T07:20:00.000Z",
      commentId: "Y29tbWVudDoxMDE1MTE3MjQ2MzQ2OTYxNV8xMDE1MTE3NzM1MjkyOTYxNQ==",
      commentText: "Kenapa status jadwal terlambat diperbarui?",
      commentAuthorName: "Nanda Kusuma",
      commentPermalink: "https://www.facebook.com/CCKAI121/posts/pfbid0ABC?comment_id=1",
      commentReplyCount: 1,
      commentReactionCount: 4,
      commentIndex: 1,
    });

    expect(mapped).not.toBeNull();
    expect(mapped?.source).toBe("facebook");
    expect(mapped?.sourceReference).toBe(
      "Y29tbWVudDoxMDE1MTE3MjQ2MzQ2OTYxNV8xMDE1MTE3NzM1MjkyOTYxNQ==",
    );
    expect(mapped?.content).toBe("Kenapa status jadwal terlambat diperbarui?");
    expect(mapped?.author).toBe("Nanda Kusuma");
    expect(mapped?.sourceUrl).toBe(
      "https://www.facebook.com/CCKAI121/posts/pfbid0ABC?comment_id=1",
    );
    expect(mapped?.publishedAt).toBeInstanceOf(Date);
    expect(mapped?.metadata).toEqual({
      post_id: "1388179326800013",
      post_url: "https://www.facebook.com/CCKAI121/posts/pfbid0ABC",
      post_text: "Postingan KAI tentang perjalanan.",
      post_published_at: "2026-09-08T07:20:00.000Z",
      comment_reply_count: 1,
      comment_reaction_count: 4,
      comment_index: 1,
    });
  });

  test("skips post rows that have no comment", () => {
    const mapped = mapFacebookCommentItem({
      id: "1388179326800013",
      permalink: "https://www.facebook.com/CCKAI121/posts/pfbid0ABC",
      text: "Postingan tanpa komentar.",
      authorName: "KAI121",
    });

    expect(mapped).toBeNull();
  });

  test("skips comments with empty text", () => {
    const mapped = mapFacebookCommentItem({
      id: "1388179326800013",
      commentId: "Y29tbWVudDox",
      commentText: "",
      commentAuthorName: "Budi",
    });

    expect(mapped).toBeNull();
  });

  test("rejects a malformed (non-object) record", () => {
    expect(() => mapFacebookCommentItem("not-an-object")).toThrow(
      ValidationError,
    );
  });
});

describe("mapXItem", () => {
  test("maps a normal post to a normalized record", () => {
    const mapped = mapXItem({
      id_str: "x-post-3001",
      full_text: "Saldo sudah terpotong tapi kode booking belum masuk.",
      user: { screen_name: "dimas_rail" },
      url: "https://x.example.test/dimas_rail/status/3001",
      created_at: "2026-09-08T13:30:00.000Z",
      like_count: 9,
      retweet_count: 2,
    });

    expect(mapped.source).toBe("x");
    expect(mapped.sourceReference).toBe("x-post-3001");
    expect(mapped.author).toBe("dimas_rail");
    expect(mapped.metadata).toEqual({ likeCount: 9, retweetCount: 2 });
  });

  test("supports numeric epoch timestamps in seconds", () => {
    const mapped = mapXItem({
      id: 123,
      text: "pembayaran gagal",
      timestamp: 1_752_000_000,
    });

    expect(mapped.sourceReference).toBe("123");
    expect(mapped.publishedAt?.getUTCFullYear()).toBe(2025);
  });

  test("rejects a missing external id", () => {
    expect(() => mapXItem({ text: "no id" })).toThrow(ValidationError);
  });
});
