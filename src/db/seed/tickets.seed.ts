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
      "Pembaruan status aplikasi sudah dikirim ulang dan tim operasional memperbaiki kanal pengumuman.",
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
    status: "waiting_manager_action",
    priority: "urgent",
    heaResponse:
      "Kami memahami aplikasi error saat pembayaran dan mohon maaf atas kendalanya.",
    heaSentAt: new Date("2026-05-25T07:00:00.000Z"),
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
  {
    id: "00000000-0000-4000-8002-000000000007",
    complaintId: "00000000-0000-4000-8001-000000000009",
    agentId: "00000000-0000-4000-8000-000000000004",
    status: "waiting_manager_action",
    priority: "urgent",
    heaResponse:
      "Kami memahami saldo terpotong dua kali tanpa tiket muncul. Mohon maaf, kami eskalasikan untuk rekonsiliasi pembayaran.",
    heaSentAt: new Date("2026-05-25T09:20:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8002-000000000008",
    complaintId: "00000000-0000-4000-8001-000000000011",
    agentId: "00000000-0000-4000-8000-000000000005",
    status: "manager_action_done",
    priority: "high",
    heaResponse:
      "Kami memahami notifikasi status perjalanan terlambat diterima. Mohon maaf, tim operasional sedang memeriksa sinkronisasi jadwal.",
    heaSentAt: new Date("2026-05-25T09:40:00.000Z"),
    closureMessage:
      "Sinkronisasi jadwal telah diperbarui dan notifikasi status perjalanan dikirim ulang.",
  },
  {
    id: "00000000-0000-4000-8002-000000000009",
    complaintId: "00000000-0000-4000-8001-000000000012",
    agentId: "00000000-0000-4000-8000-000000000005",
    status: "waiting_manager_action",
    priority: "urgent",
    heaResponse:
      "Kami memahami pembayaran sukses tetapi tiket tidak terbit. Mohon maaf, kami eskalasikan ke tim pembayaran.",
    heaSentAt: new Date("2026-05-25T10:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8002-000000000010",
    complaintId: "00000000-0000-4000-8001-000000000013",
    agentId: "00000000-0000-4000-8000-000000000006",
    status: "hea_sent",
    priority: "medium",
    heaResponse:
      "Kami memahami tombol pembatalan tiket tidak aktif. Mohon maaf, kami sedang cek status booking terkait.",
    heaSentAt: new Date("2026-05-25T10:20:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8002-000000000011",
    complaintId: "00000000-0000-4000-8001-000000000014",
    agentId: "00000000-0000-4000-8000-000000000006",
    status: "waiting_manager_action",
    priority: "high",
    heaResponse:
      "Kami memahami aplikasi crash saat checkout. Mohon maaf, laporan ini kami teruskan ke tim aplikasi.",
    heaSentAt: new Date("2026-05-25T10:40:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8002-000000000012",
    complaintId: "00000000-0000-4000-8001-000000000015",
    agentId: "00000000-0000-4000-8000-000000000007",
    status: "waiting_manager_action",
    priority: "high",
    heaResponse:
      "Kami memahami checkout error setelah promo diterapkan. Mohon maaf, kami eskalasikan ke tim aplikasi.",
    heaSentAt: new Date("2026-05-25T11:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8002-000000000013",
    complaintId: "00000000-0000-4000-8001-000000000016",
    agentId: "00000000-0000-4000-8000-000000000007",
    status: "waiting_manager_action",
    priority: "urgent",
    heaResponse:
      "Kami memahami saldo terpotong dan booking masih pending. Mohon maaf, tim pembayaran akan menindaklanjuti.",
    heaSentAt: new Date("2026-05-25T11:20:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8002-000000000014",
    complaintId: "00000000-0000-4000-8001-000000000017",
    agentId: "00000000-0000-4000-8000-000000000008",
    status: "closed",
    priority: "low",
    heaResponse:
      "Kami memahami toilet stasiun terkunci saat jam padat. Mohon maaf atas ketidaknyamanan ini.",
    heaSentAt: new Date("2026-05-25T11:40:00.000Z"),
    closureMessage:
      "Petugas stasiun sudah membuka akses toilet dan menambah jadwal pengecekan area.",
    closureSentAt: new Date("2026-05-26T03:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8002-000000000015",
    complaintId: "00000000-0000-4000-8001-000000000019",
    agentId: "00000000-0000-4000-8000-000000000008",
    status: "manager_action_done",
    priority: "medium",
    heaResponse:
      "Kami memahami informasi aplikasi berbeda dengan pengumuman stasiun. Mohon maaf, tim operasional sedang menyelaraskan informasi.",
    heaSentAt: new Date("2026-05-25T12:00:00.000Z"),
    closureMessage:
      "Informasi aplikasi dan pengumuman stasiun telah diselaraskan oleh tim operasional.",
  },
  {
    id: "00000000-0000-4000-8002-000000000016",
    complaintId: "00000000-0000-4000-8001-000000000020",
    agentId: "00000000-0000-4000-8000-000000000004",
    status: "waiting_manager_action",
    priority: "urgent",
    heaResponse:
      "Kami memahami tiket tidak muncul setelah pembayaran QR berhasil. Mohon maaf, kami eskalasikan untuk pengecekan transaksi.",
    heaSentAt: new Date("2026-05-25T12:20:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8002-000000000017",
    complaintId: "00000000-0000-4000-8001-000000000021",
    agentId: "00000000-0000-4000-8000-000000000004",
    status: "waiting_manager_action",
    priority: "urgent",
    heaResponse:
      "Kami memahami kode booking belum muncul setelah saldo terpotong. Mohon maaf, kami eskalasikan ke tim pembayaran.",
    heaSentAt: new Date("2026-07-02T02:30:00.000Z"),
    createdAt: new Date("2026-07-02T02:30:00.000Z"),
    updatedAt: new Date("2026-07-02T02:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8002-000000000018",
    complaintId: "00000000-0000-4000-8001-000000000022",
    agentId: "00000000-0000-4000-8000-000000000005",
    status: "manager_action_done",
    priority: "high",
    heaResponse:
      "Kami memahami informasi aplikasi terlambat dan berbeda antar kanal. Mohon maaf, tim operasional sedang menyelaraskan data.",
    heaSentAt: new Date("2026-07-03T03:50:00.000Z"),
    closureMessage:
      "Data aplikasi dan pengumuman stasiun telah diselaraskan ulang.",
    createdAt: new Date("2026-07-03T03:50:00.000Z"),
    updatedAt: new Date("2026-07-03T04:25:00.000Z"),
  },
] as const satisfies ReadonlyArray<NewTicket>;

export const seedTickets = async (db: Database): Promise<number> => {
  const now = new Date("2026-05-27T03:05:00.000Z");

  const seededTickets = await db
    .insert(tickets)
    .values(
      ticketSeedData.map((ticket) => {
        const createdAt =
          "createdAt" in ticket && ticket.createdAt instanceof Date
            ? ticket.createdAt
            : now;
        const updatedAt =
          "updatedAt" in ticket && ticket.updatedAt instanceof Date
            ? ticket.updatedAt
            : createdAt;

        return { ...ticket, createdAt, updatedAt };
      }),
    )
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
