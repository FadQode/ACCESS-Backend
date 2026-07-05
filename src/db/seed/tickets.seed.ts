import { sql } from "drizzle-orm";

import type { Database } from "../index";
import { tickets, type NewTicket } from "../schema";

export const ticketSeedData = [
  {
    id: "00000000-0000-4000-8002-000000000001",
    complaintId: "00000000-0000-4000-8001-000000000001",
    agentId: "00000000-0000-4000-8000-000000000004",
    status: "waiting_manager_action",
    priority: "urgent",
    heaResponse:
      "Kami memahami saldo terpotong tanpa tiket muncul. Kami mohon maaf dan sedang meminta tindak lanjut tim terkait.",
    heaSentAt: new Date("2026-05-25T04:10:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8002-000000000002",
    complaintId: "00000000-0000-4000-8001-000000000002",
    agentId: "00000000-0000-4000-8000-000000000005",
    status: "manager_action_done",
    priority: "high",
    heaResponse:
      "Kami memahami keterlambatan tanpa pemberitahuan mengganggu perjalanan Anda. Mohon maaf, kami koordinasikan pembaruan informasi.",
    heaSentAt: new Date("2026-05-25T05:00:00.000Z"),
    closureMessage:
      "Pembaruan notifikasi delay sudah dikirim ulang dan tim operasional memperbaiki kanal pengumuman.",
  },
  {
    id: "00000000-0000-4000-8002-000000000003",
    complaintId: "00000000-0000-4000-8001-000000000003",
    agentId: "00000000-0000-4000-8000-000000000006",
    status: "hea_sent",
    priority: "medium",
    heaResponse:
      "Kami memahami kendala pembatalan tiket dari aplikasi. Mohon maaf atas ketidaknyamanan ini.",
    heaSentAt: new Date("2026-05-25T06:20:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8002-000000000004",
    complaintId: "00000000-0000-4000-8001-000000000005",
    agentId: "00000000-0000-4000-8000-000000000007",
    status: "ready_to_close",
    priority: "urgent",
    heaResponse:
      "Kami memahami aplikasi error saat pembayaran dan mohon maaf atas kendalanya.",
    heaSentAt: new Date("2026-05-25T07:00:00.000Z"),
    closureMessage:
      "Gangguan payment gateway telah dipulihkan dan transaksi terdampak masuk proses rekonsiliasi refund.",
  },
  {
    id: "00000000-0000-4000-8002-000000000005",
    complaintId: "00000000-0000-4000-8001-000000000007",
    agentId: "00000000-0000-4000-8000-000000000008",
    status: "closed",
    priority: "low",
    heaResponse:
      "Kami memahami fasilitas stasiun yang tidak berfungsi mengganggu kenyamanan perjalanan Anda.",
    heaSentAt: new Date("2026-05-25T08:00:00.000Z"),
    closureMessage:
      "Petugas stasiun telah memperbaiki fasilitas dan melakukan pemeriksaan ulang.",
    closureSentAt: new Date("2026-05-26T02:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8002-000000000006",
    complaintId: "00000000-0000-4000-8001-000000000008",
    agentId: "00000000-0000-4000-8000-000000000006",
    status: "manager_action_done",
    priority: "medium",
    heaResponse:
      "Kami memahami informasi perubahan jadwal belum tampil di aplikasi. Mohon maaf atas ketidaknyamanan ini.",
    heaSentAt: new Date("2026-05-25T09:00:00.000Z"),
    closureMessage:
      "Tim operasional telah memperbarui sinkronisasi jadwal dan notifikasi rute terdampak.",
  },
] as const satisfies ReadonlyArray<NewTicket>;

export const seedTickets = async (db: Database): Promise<number> => {
  const now = new Date("2026-05-27T03:05:00.000Z");

  const seededTickets = await db
    .insert(tickets)
    .values(ticketSeedData.map((ticket) => ({ ...ticket, updatedAt: now })))
    .onConflictDoUpdate({
      target: tickets.id,
      set: {
        complaintId: sql`excluded.complaint_id`,
        agentId: sql`excluded.agent_id`,
        status: sql`excluded.status`,
        priority: sql`excluded.priority`,
        heaResponse: sql`excluded.hea_response`,
        heaSentAt: sql`excluded.hea_sent_at`,
        closureMessage: sql`excluded.closure_message`,
        closureSentAt: sql`excluded.closure_sent_at`,
        updatedAt: now,
      },
    })
    .returning({ id: tickets.id });

  return seededTickets.length;
};
