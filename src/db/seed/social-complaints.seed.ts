import { sql } from "drizzle-orm";

import type { Database } from "../index";
import { socialComplaints, type NewSocialComplaint } from "../schema";

// Realistic ingested social complaints for development/demo. Mirrors what the
// Apify providers would normalize so the frontend can be built before real
// credentials exist.
export const socialComplaintSeedData = [
  {
    id: "00000000-0000-4000-800b-000000000001",
    source: "google_play",
    sourceReference: "play-review-1001",
    content: "Aplikasinya sering error ketika melakukan pembayaran.",
    author: "Rina",
    sourceUrl: "https://play.google.com/store/apps/details?id=access&reviewId=1001",
    publishedAt: new Date("2026-09-08T09:15:00.000Z"),
    metadata: { rating: 1, appVersion: "3.2.1" },
  },
  {
    id: "00000000-0000-4000-800b-000000000002",
    source: "google_play",
    sourceReference: "play-review-1002",
    content: "Saldo terpotong dua kali tapi tiket belum muncul di aplikasi.",
    author: "Bayu",
    sourceUrl: "https://play.google.com/store/apps/details?id=access&reviewId=1002",
    publishedAt: new Date("2026-09-08T11:40:00.000Z"),
    metadata: { rating: 2, appVersion: "3.2.1" },
  },
  {
    id: "00000000-0000-4000-800b-000000000003",
    source: "google_play",
    sourceReference: "play-review-1003",
    content: "Aplikasi crash saat checkout setelah memilih kursi.",
    author: "Sinta",
    sourceUrl: "https://play.google.com/store/apps/details?id=access&reviewId=1003",
    publishedAt: new Date("2026-09-09T02:05:00.000Z"),
    metadata: { rating: 1, appVersion: "3.2.0" },
  },
  {
    id: "00000000-0000-4000-800b-000000000004",
    source: "facebook",
    sourceReference: "facebook-comment-2001",
    content: "Kenapa status jadwal di aplikasi terlambat diperbarui?",
    author: "Nanda Kusuma",
    sourceUrl: "https://facebook.example.test/access/posts/2001",
    publishedAt: new Date("2026-09-08T07:20:00.000Z"),
    metadata: { likesCount: 4, commentsCount: 1 },
  },
  {
    id: "00000000-0000-4000-800b-000000000005",
    source: "facebook",
    sourceReference: "facebook-comment-2002",
    content: "Refund tiket batal belum masuk meski sudah seminggu.",
    author: "Intan Permata",
    sourceUrl: "https://facebook.example.test/access/posts/2002",
    publishedAt: new Date("2026-09-09T01:10:00.000Z"),
    metadata: { likesCount: 12, commentsCount: 3 },
  },
  {
    id: "00000000-0000-4000-800b-000000000006",
    source: "facebook",
    sourceReference: "facebook-comment-2003",
    content: "Fasilitas toilet stasiun terkunci saat jam padat, mohon ditindak.",
    author: "Hendra Wijaya",
    sourceUrl: "https://facebook.example.test/access/posts/2003",
    publishedAt: new Date("2026-09-09T05:45:00.000Z"),
    metadata: { likesCount: 7, commentsCount: 2 },
  },
  {
    id: "00000000-0000-4000-800b-000000000007",
    source: "x",
    sourceReference: "x-post-3001",
    content:
      "@ACCESS_help saya kecewa, saldo sudah terpotong tapi kode booking belum masuk.",
    author: "@dimas_rail",
    sourceUrl: "https://x.example.test/dimas_rail/status/3001",
    publishedAt: new Date("2026-09-08T13:30:00.000Z"),
    metadata: { likeCount: 9, retweetCount: 2, replyCount: 1 },
  },
  {
    id: "00000000-0000-4000-800b-000000000008",
    source: "x",
    sourceReference: "x-post-3002",
    content:
      "@ACCESS_help pembayaran gagal terus, tidak bisa checkout dari tadi pagi.",
    author: "@maya_travel",
    sourceUrl: "https://x.example.test/maya_travel/status/3002",
    publishedAt: new Date("2026-09-09T03:00:00.000Z"),
    metadata: { likeCount: 3, retweetCount: 0, replyCount: 4 },
  },
  {
    id: "00000000-0000-4000-800b-000000000009",
    source: "x",
    sourceReference: "x-post-3003",
    content: "@ACCESS_help kereta terlambat dua jam tanpa pemberitahuan sama sekali.",
    author: "@rangga_commute",
    sourceUrl: "https://x.example.test/rangga_commute/status/3003",
    publishedAt: new Date("2026-09-09T06:15:00.000Z"),
    metadata: { likeCount: 21, retweetCount: 6, replyCount: 2 },
  },
] satisfies NewSocialComplaint[];

export const seedSocialComplaints = async (db: Database): Promise<number> => {
  const fetchedAt = new Date("2026-09-09T07:00:00.000Z");

  const seeded = await db
    .insert(socialComplaints)
    .values(
      socialComplaintSeedData.map((row) => ({
        ...row,
        fetchedAt,
        createdAt: fetchedAt,
      })),
    )
    .onConflictDoUpdate({
      target: socialComplaints.id,
      set: {
        source: sql`excluded.source`,
        sourceReference: sql`excluded.source_reference`,
        content: sql`excluded.content`,
        author: sql`excluded.author`,
        sourceUrl: sql`excluded.source_url`,
        publishedAt: sql`excluded.published_at`,
        metadata: sql`excluded.metadata`,
        fetchedAt: sql`excluded.fetched_at`,
      },
    })
    .returning({ id: socialComplaints.id });

  return seeded.length;
};
