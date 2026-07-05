import { sql } from "drizzle-orm";

import type { Database } from "../index";
import { complaints, type NewComplaint } from "../schema";

export const complaintSeedData = [
  {
    id: "00000000-0000-4000-8001-000000000001",
    referenceNo: "CMP-2026-0001",
    trackingToken: "TRK-PAY-0001",
    source: "web_form",
    sourceHandle: null,
    sourceUrl: null,
    complainerName: "Dina Pratiwi",
    complainerContact: "dina@example.test",
    category: "payment",
    complaintText: "Saldo saya terpotong tapi tiket tidak muncul.",
    status: "waiting_action",
  },
  {
    id: "00000000-0000-4000-8001-000000000002",
    referenceNo: "CMP-2026-0002",
    trackingToken: "TRK-DLY-0002",
    source: "twitter",
    sourceHandle: "@rangga_access",
    sourceUrl: "https://twitter.example.test/status/2",
    complainerName: "Rangga",
    complainerContact: null,
    category: "delay",
    complaintText: "Kereta terlambat dan tidak ada pemberitahuan.",
    status: "waiting_action",
  },
  {
    id: "00000000-0000-4000-8001-000000000003",
    referenceNo: "CMP-2026-0003",
    trackingToken: "TRK-CAN-0003",
    source: "instagram",
    sourceHandle: "@maya.travel",
    sourceUrl: "https://instagram.example.test/p/3",
    complainerName: "Maya",
    complainerContact: null,
    category: "cancellation",
    complaintText: "Saya tidak bisa membatalkan tiket dari aplikasi.",
    status: "waiting_action",
  },
  {
    id: "00000000-0000-4000-8001-000000000004",
    referenceNo: "CMP-2026-0004",
    trackingToken: "TRK-LOST-0004",
    source: "web_form",
    sourceHandle: null,
    sourceUrl: null,
    complainerName: "Hendra",
    complainerContact: "hendra@example.test",
    category: "lost_item",
    complaintText: "Barang saya tertinggal di kereta.",
    status: "resolved",
    resolvedAt: new Date("2026-05-25T08:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8001-000000000005",
    referenceNo: "CMP-2026-0005",
    trackingToken: "TRK-APP-0005",
    source: "google_play",
    sourceHandle: "play-review-5",
    sourceUrl: "https://play.example.test/review/5",
    complainerName: "Sari",
    complainerContact: null,
    category: "app_error",
    complaintText: "Aplikasi error saat proses pembayaran.",
    status: "waiting_action",
  },
  {
    id: "00000000-0000-4000-8001-000000000006",
    referenceNo: "CMP-2026-0006",
    trackingToken: "TRK-REF-0006",
    source: "app_store",
    sourceHandle: "ios-review-6",
    sourceUrl: "https://appstore.example.test/review/6",
    complainerName: "Bimo",
    complainerContact: null,
    category: "refund",
    complaintText: "Refund belum masuk setelah transaksi gagal.",
    status: "resolved",
    resolvedAt: new Date("2026-05-26T10:15:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8001-000000000007",
    referenceNo: "CMP-2026-0007",
    trackingToken: "TRK-FAC-0007",
    source: "facebook",
    sourceHandle: "nanda.access",
    sourceUrl: "https://facebook.example.test/posts/7",
    complainerName: "Nanda",
    complainerContact: null,
    category: "facility",
    complaintText: "Fasilitas stasiun tidak berfungsi dengan baik.",
    status: "waiting_action",
  },
  {
    id: "00000000-0000-4000-8001-000000000008",
    referenceNo: "CMP-2026-0008",
    trackingToken: "TRK-DLY-0008",
    source: "other",
    sourceHandle: "call-center",
    sourceUrl: null,
    complainerName: "Yusuf",
    complainerContact: "081200000008",
    category: "delay",
    complaintText: "Informasi perubahan jadwal tidak muncul di aplikasi.",
    status: "waiting_action",
  },
] as const satisfies ReadonlyArray<NewComplaint>;

export const seedComplaints = async (db: Database): Promise<number> => {
  const now = new Date("2026-05-27T03:00:00.000Z");

  const seededComplaints = await db
    .insert(complaints)
    .values(
      complaintSeedData.map((complaint) => ({
        ...complaint,
        submittedAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: complaints.id,
      set: {
        referenceNo: sql`excluded.reference_no`,
        trackingToken: sql`excluded.tracking_token`,
        source: sql`excluded.source`,
        sourceHandle: sql`excluded.source_handle`,
        sourceUrl: sql`excluded.source_url`,
        complainerName: sql`excluded.complainer_name`,
        complainerContact: sql`excluded.complainer_contact`,
        category: sql`excluded.category`,
        complaintText: sql`excluded.complaint_text`,
        status: sql`excluded.status`,
        submittedAt: sql`excluded.submitted_at`,
        resolvedAt: sql`excluded.resolved_at`,
        updatedAt: now,
      },
    })
    .returning({ id: complaints.id });

  return seededComplaints.length;
};
