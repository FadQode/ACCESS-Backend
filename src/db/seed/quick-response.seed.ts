import { sql } from "drizzle-orm";

import type { Database } from "../index";
import { quickResponseSessions, type NewQuickResponseSession } from "../schema";

export const quickResponseSeedData = [
  {
    id: "00000000-0000-4000-8003-000000000001",
    agentId: "00000000-0000-4000-8000-000000000004",
    complaintId: "00000000-0000-4000-8001-000000000001",
    ticketId: "00000000-0000-4000-8002-000000000001",
    sourceChannel: "web_form",
    responseTone: "calm",
    responseTarget: "dm",
    selectedHear: "Kami memahami saldo Anda terpotong tetapi tiket belum muncul.",
    selectedEmpathize:
      "Situasi ini tentu membuat rencana perjalanan menjadi tidak nyaman.",
    selectedApologize: "Mohon maaf atas kendala transaksi yang terjadi.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami saldo Anda terpotong tetapi tiket belum muncul. Mohon maaf atas kendala transaksi yang terjadi. Tim kami sedang menindaklanjuti dan akan mengabari perkembangan berikutnya.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000002",
    agentId: "00000000-0000-4000-8000-000000000005",
    complaintId: "00000000-0000-4000-8001-000000000002",
    ticketId: "00000000-0000-4000-8002-000000000002",
    sourceChannel: "twitter",
    sourceHandle: "@rangga_access",
    responseTone: "concise",
    responseTarget: "public_reply",
    selectedHear: "Kami memahami informasi aplikasi belum diterima tepat waktu.",
    selectedEmpathize:
      "Keterlambatan tanpa pemberitahuan membuat perjalanan sulit direncanakan.",
    selectedApologize: "Mohon maaf atas ketidaknyamanan tersebut.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami informasi aplikasi belum diterima tepat waktu. Mohon maaf atas ketidaknyamanan tersebut. Kami koordinasikan pembaruan informasi dengan tim operasional.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000003",
    agentId: "00000000-0000-4000-8000-000000000006",
    complaintId: "00000000-0000-4000-8001-000000000003",
    ticketId: "00000000-0000-4000-8002-000000000003",
    sourceChannel: "instagram",
    sourceHandle: "@maya.travel",
    responseTone: "friendly",
    responseTarget: "dm",
    selectedHear: "Kami memahami kendala pembatalan tiket dari aplikasi.",
    selectedEmpathize:
      "Kendala ini dapat menghambat pengaturan ulang perjalanan Anda.",
    selectedApologize: "Mohon maaf atas gangguan yang Anda alami.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami kendala pembatalan tiket dari aplikasi. Mohon maaf atas gangguan yang Anda alami. Tim kami sedang menindaklanjuti dan akan mengabari perkembangan berikutnya.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000004",
    agentId: "00000000-0000-4000-8000-000000000004",
    complaintId: "00000000-0000-4000-8001-000000000004",
    ticketId: null,
    sourceChannel: "web_form",
    responseTone: "helpful",
    responseTarget: "dm",
    selectedHear: "Kami memahami barang Anda tertinggal di kereta.",
    selectedEmpathize:
      "Kehilangan barang selama perjalanan pasti membuat khawatir.",
    selectedApologize: "Mohon maaf atas ketidaknyamanan yang terjadi.",
    selectedTakeAction:
      "Silakan ambil nomor laporan LOST-2505 di loket layanan, barang telah diamankan petugas.",
    finalResponse:
      "Kami memahami barang Anda tertinggal di kereta. Mohon maaf atas ketidaknyamanan yang terjadi. Silakan ambil nomor laporan LOST-2505 di loket layanan, barang telah diamankan petugas.",
    outcome: "sent_resolved",
  },
  {
    id: "00000000-0000-4000-8003-000000000005",
    agentId: "00000000-0000-4000-8000-000000000007",
    complaintId: "00000000-0000-4000-8001-000000000005",
    ticketId: "00000000-0000-4000-8002-000000000004",
    sourceChannel: "google_play",
    sourceHandle: "play-review-5",
    responseTone: "formal",
    responseTarget: "app_review",
    selectedHear: "Kami memahami aplikasi error saat pembayaran.",
    selectedEmpathize: "Gangguan pembayaran dapat menghambat pembelian tiket.",
    selectedApologize: "Mohon maaf atas kendala pada aplikasi.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami aplikasi error saat pembayaran. Mohon maaf atas kendala pada aplikasi. Tim terkait sedang memeriksa transaksi terdampak.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000006",
    agentId: "00000000-0000-4000-8000-000000000005",
    complaintId: "00000000-0000-4000-8001-000000000006",
    ticketId: null,
    sourceChannel: "app_store",
    sourceHandle: "ios-review-6",
    responseTone: "formal",
    responseTarget: "app_review",
    selectedHear: "Kami memahami refund belum diterima setelah transaksi gagal.",
    selectedEmpathize:
      "Menunggu refund tanpa kepastian tentu tidak nyaman bagi Anda.",
    selectedApologize: "Mohon maaf atas waktu tunggu yang terjadi.",
    selectedTakeAction:
      "Refund Anda telah masuk antrean batch hari ini dan estimasi selesai 1x24 jam.",
    finalResponse:
      "Kami memahami refund belum diterima setelah transaksi gagal. Mohon maaf atas waktu tunggu yang terjadi. Refund Anda telah masuk antrean batch hari ini dan estimasi selesai 1x24 jam.",
    outcome: "sent_resolved",
  },
  {
    id: "00000000-0000-4000-8003-000000000007",
    agentId: "00000000-0000-4000-8000-000000000008",
    complaintId: "00000000-0000-4000-8001-000000000007",
    ticketId: "00000000-0000-4000-8002-000000000005",
    sourceChannel: "facebook",
    sourceHandle: "nanda.access",
    responseTone: "calm",
    responseTarget: "public_reply",
    selectedHear: "Kami memahami fasilitas stasiun tidak berfungsi baik.",
    selectedEmpathize:
      "Fasilitas yang bermasalah dapat mengganggu kenyamanan perjalanan.",
    selectedApologize: "Mohon maaf atas pengalaman tersebut.",
    selectedTakeAction:
      "Petugas telah memperbaiki fasilitas dan melakukan pengecekan ulang.",
    finalResponse:
      "Kami memahami fasilitas stasiun tidak berfungsi baik. Mohon maaf atas pengalaman tersebut. Petugas telah memperbaiki fasilitas dan melakukan pengecekan ulang.",
    outcome: "sent_resolved",
  },
  {
    id: "00000000-0000-4000-8003-000000000008",
    agentId: "00000000-0000-4000-8000-000000000006",
    complaintId: "00000000-0000-4000-8001-000000000008",
    ticketId: "00000000-0000-4000-8002-000000000006",
    sourceChannel: "other",
    sourceHandle: "call-center",
    responseTone: "neutral",
    responseTarget: "dm",
    selectedHear: "Kami memahami informasi perubahan jadwal belum tampil di aplikasi.",
    selectedEmpathize:
      "Kondisi ini dapat membuat perjalanan sulit direncanakan.",
    selectedApologize: "Mohon maaf atas ketidaknyamanan tersebut.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami informasi perubahan jadwal belum tampil di aplikasi. Mohon maaf atas ketidaknyamanan tersebut. Tim kami sedang menindaklanjuti sinkronisasi jadwal dan notifikasi rute terdampak.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000009",
    agentId: "00000000-0000-4000-8000-000000000004",
    complaintId: "00000000-0000-4000-8001-000000000009",
    ticketId: "00000000-0000-4000-8002-000000000007",
    sourceChannel: "twitter",
    sourceHandle: "@lila_trip",
    responseTone: "calm",
    responseTarget: "public_reply",
    selectedHear: "Kami memahami saldo Anda terpotong dua kali.",
    selectedEmpathize:
      "Kondisi ini tentu membuat pembelian tiket terasa tidak aman.",
    selectedApologize: "Mohon maaf atas kendala pembayaran tersebut.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami saldo Anda terpotong dua kali. Mohon maaf atas kendala pembayaran tersebut. Kami eskalasikan agar transaksi dan tiket dapat direkonsiliasi.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000010",
    agentId: "00000000-0000-4000-8000-000000000004",
    complaintId: "00000000-0000-4000-8001-000000000010",
    ticketId: null,
    sourceChannel: "web_form",
    responseTone: "helpful",
    responseTarget: "dm",
    selectedHear: "Kami memahami Anda tidak bisa mengganti nomor telepon akun.",
    selectedEmpathize:
      "Perubahan nomor penting agar akun tetap bisa digunakan dengan aman.",
    selectedApologize: "Mohon maaf atas kendala pengaturan akun ini.",
    selectedTakeAction:
      "Nomor telepon akun telah diperbarui setelah verifikasi data pelanggan.",
    finalResponse:
      "Kami memahami Anda tidak bisa mengganti nomor telepon akun. Mohon maaf atas kendala pengaturan akun ini. Nomor telepon akun telah diperbarui setelah verifikasi data pelanggan.",
    outcome: "sent_resolved",
  },
  {
    id: "00000000-0000-4000-8003-000000000011",
    agentId: "00000000-0000-4000-8000-000000000005",
    complaintId: "00000000-0000-4000-8001-000000000011",
    ticketId: "00000000-0000-4000-8002-000000000008",
    sourceChannel: "instagram",
    sourceHandle: "@tera.commute",
    responseTone: "concise",
    responseTarget: "dm",
    selectedHear: "Kami memahami notifikasi status perjalanan baru muncul setelah berangkat.",
    selectedEmpathize:
      "Keterlambatan informasi membuat perjalanan sulit disesuaikan.",
    selectedApologize: "Mohon maaf atas keterlambatan informasi tersebut.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami notifikasi status perjalanan baru muncul setelah berangkat. Mohon maaf atas keterlambatan informasi tersebut. Tim operasional sedang memperbarui sinkronisasi jadwal.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000012",
    agentId: "00000000-0000-4000-8000-000000000005",
    complaintId: "00000000-0000-4000-8001-000000000012",
    ticketId: "00000000-0000-4000-8002-000000000009",
    sourceChannel: "google_play",
    sourceHandle: "play-review-12",
    responseTone: "formal",
    responseTarget: "app_review",
    selectedHear: "Kami memahami pembayaran berhasil tetapi tiket tidak terbit.",
    selectedEmpathize:
      "Situasi ini dapat mengganggu kepastian rencana perjalanan Anda.",
    selectedApologize: "Mohon maaf atas gangguan transaksi tersebut.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami pembayaran berhasil tetapi tiket tidak terbit. Mohon maaf atas gangguan transaksi tersebut. Laporan Anda kami eskalasikan ke tim pembayaran.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000013",
    agentId: "00000000-0000-4000-8000-000000000006",
    complaintId: "00000000-0000-4000-8001-000000000013",
    ticketId: "00000000-0000-4000-8002-000000000010",
    sourceChannel: "app_store",
    sourceHandle: "ios-review-13",
    responseTone: "friendly",
    responseTarget: "app_review",
    selectedHear: "Kami memahami tombol batal tiket tidak aktif.",
    selectedEmpathize:
      "Kendala pembatalan dapat menyulitkan pengaturan ulang perjalanan.",
    selectedApologize: "Mohon maaf atas gangguan pada fitur pembatalan.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami tombol batal tiket tidak aktif. Mohon maaf atas gangguan pada fitur pembatalan. Tim kami sedang mengecek status booking terkait.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000014",
    agentId: "00000000-0000-4000-8000-000000000006",
    complaintId: "00000000-0000-4000-8001-000000000014",
    ticketId: "00000000-0000-4000-8002-000000000011",
    sourceChannel: "facebook",
    sourceHandle: "intan.access",
    responseTone: "calm",
    responseTarget: "public_reply",
    selectedHear: "Kami memahami aplikasi crash saat checkout.",
    selectedEmpathize:
      "Gangguan pada tahap checkout dapat membuat transaksi tertunda.",
    selectedApologize: "Mohon maaf atas kendala aplikasi tersebut.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami aplikasi crash saat checkout. Mohon maaf atas kendala aplikasi tersebut. Kami teruskan laporan ini ke tim aplikasi untuk ditindaklanjuti.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000015",
    agentId: "00000000-0000-4000-8000-000000000007",
    complaintId: "00000000-0000-4000-8001-000000000015",
    ticketId: "00000000-0000-4000-8002-000000000012",
    sourceChannel: "web_form",
    responseTone: "formal",
    responseTarget: "dm",
    selectedHear: "Kami memahami checkout error setelah promo diterapkan.",
    selectedEmpathize:
      "Kendala ini dapat menghambat penyelesaian pembelian tiket.",
    selectedApologize: "Mohon maaf atas gangguan checkout tersebut.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami checkout error setelah promo diterapkan. Mohon maaf atas gangguan checkout tersebut. Laporan ini kami eskalasikan ke tim aplikasi.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000016",
    agentId: "00000000-0000-4000-8000-000000000007",
    complaintId: "00000000-0000-4000-8001-000000000016",
    ticketId: "00000000-0000-4000-8002-000000000013",
    sourceChannel: "other",
    sourceHandle: "call-center",
    responseTone: "calm",
    responseTarget: "dm",
    selectedHear: "Kami memahami booking masih pending setelah saldo terpotong.",
    selectedEmpathize:
      "Status pending yang lama membuat kepastian tiket menjadi tidak jelas.",
    selectedApologize: "Mohon maaf atas kendala transaksi ini.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami booking masih pending setelah saldo terpotong. Mohon maaf atas kendala transaksi ini. Tim pembayaran akan menindaklanjuti status transaksi Anda.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000017",
    agentId: "00000000-0000-4000-8000-000000000008",
    complaintId: "00000000-0000-4000-8001-000000000017",
    ticketId: "00000000-0000-4000-8002-000000000014",
    sourceChannel: "twitter",
    sourceHandle: "@mega_trip",
    responseTone: "helpful",
    responseTarget: "public_reply",
    selectedHear: "Kami memahami toilet stasiun terkunci saat jam padat.",
    selectedEmpathize:
      "Fasilitas yang tidak siap dapat mengganggu kenyamanan penumpang.",
    selectedApologize: "Mohon maaf atas pengalaman tersebut.",
    selectedTakeAction:
      "Petugas telah membuka akses toilet dan menambah pengecekan area.",
    finalResponse:
      "Kami memahami toilet stasiun terkunci saat jam padat. Mohon maaf atas pengalaman tersebut. Petugas telah membuka akses toilet dan menambah pengecekan area.",
    outcome: "sent_resolved",
  },
  {
    id: "00000000-0000-4000-8003-000000000018",
    agentId: "00000000-0000-4000-8000-000000000008",
    complaintId: "00000000-0000-4000-8001-000000000018",
    ticketId: null,
    sourceChannel: "app_store",
    sourceHandle: "ios-review-18",
    responseTone: "formal",
    responseTarget: "app_review",
    selectedHear: "Kami memahami refund tiket batal belum masuk.",
    selectedEmpathize:
      "Menunggu pengembalian dana tanpa kepastian tentu tidak nyaman.",
    selectedApologize: "Mohon maaf atas waktu tunggu refund tersebut.",
    selectedTakeAction:
      "Refund telah dikonfirmasi dalam antrean transfer dan selesai diproses.",
    finalResponse:
      "Kami memahami refund tiket batal belum masuk. Mohon maaf atas waktu tunggu refund tersebut. Refund telah dikonfirmasi dalam antrean transfer dan selesai diproses.",
    outcome: "sent_resolved",
  },
  {
    id: "00000000-0000-4000-8003-000000000019",
    agentId: "00000000-0000-4000-8000-000000000008",
    complaintId: "00000000-0000-4000-8001-000000000019",
    ticketId: "00000000-0000-4000-8002-000000000015",
    sourceChannel: "instagram",
    sourceHandle: "@rio.rail",
    responseTone: "concise",
    responseTarget: "dm",
    selectedHear:
      "Kami memahami informasi aplikasi berbeda dengan pengumuman stasiun.",
    selectedEmpathize:
      "Perbedaan informasi dapat membuat perjalanan membingungkan.",
    selectedApologize: "Mohon maaf atas ketidaksesuaian informasi tersebut.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami informasi aplikasi berbeda dengan pengumuman stasiun. Mohon maaf atas ketidaksesuaian informasi tersebut. Tim operasional sedang menyelaraskan informasi.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000020",
    agentId: "00000000-0000-4000-8000-000000000004",
    complaintId: "00000000-0000-4000-8001-000000000020",
    ticketId: "00000000-0000-4000-8002-000000000016",
    sourceChannel: "web_form",
    responseTone: "formal",
    responseTarget: "dm",
    selectedHear: "Kami memahami tiket tidak muncul setelah pembayaran QR berhasil.",
    selectedEmpathize:
      "Kondisi ini membuat kepastian perjalanan menjadi tertunda.",
    selectedApologize: "Mohon maaf atas kendala pembayaran QR tersebut.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami tiket tidak muncul setelah pembayaran QR berhasil. Mohon maaf atas kendala pembayaran QR tersebut. Kami eskalasikan untuk pengecekan transaksi.",
    outcome: "sent_hea_action",
  },
  {
    id: "00000000-0000-4000-8003-000000000021",
    agentId: "00000000-0000-4000-8000-000000000004",
    complaintId: "00000000-0000-4000-8001-000000000021",
    ticketId: "00000000-0000-4000-8002-000000000017",
    sourceChannel: "twitter",
    sourceHandle: "@dimas_rail",
    responseTone: "calm",
    responseTarget: "public_reply",
    selectedHear: "Kami memahami kode booking belum muncul setelah saldo terpotong.",
    selectedEmpathize:
      "Kondisi ini membuat kepastian perjalanan menjadi tertunda.",
    selectedApologize: "Mohon maaf atas kendala pembayaran tersebut.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami kode booking belum muncul setelah saldo terpotong. Mohon maaf atas kendala pembayaran tersebut. Kami eskalasikan ke tim pembayaran untuk pengecekan transaksi.",
    outcome: "sent_hea_action",
    createdAt: new Date("2026-07-02T02:35:00.000Z"),
    updatedAt: new Date("2026-07-02T02:35:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8003-000000000022",
    agentId: "00000000-0000-4000-8000-000000000005",
    complaintId: "00000000-0000-4000-8001-000000000022",
    ticketId: "00000000-0000-4000-8002-000000000018",
    sourceChannel: "instagram",
    sourceHandle: "@sena.commute",
    responseTone: "concise",
    responseTarget: "dm",
    selectedHear:
      "Kami memahami informasi aplikasi terlambat dan berbeda antar kanal.",
    selectedEmpathize:
      "Perbedaan informasi membuat perjalanan sulit direncanakan.",
    selectedApologize: "Mohon maaf atas ketidaksesuaian informasi tersebut.",
    selectedTakeAction: null,
    finalResponse:
      "Kami memahami informasi aplikasi terlambat dan berbeda antar kanal. Mohon maaf atas ketidaksesuaian informasi tersebut. Tim operasional sedang menyelaraskan data aplikasi dan stasiun.",
    outcome: "sent_hea_action",
    createdAt: new Date("2026-07-03T03:55:00.000Z"),
    updatedAt: new Date("2026-07-03T03:55:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8003-000000000023",
    agentId: "00000000-0000-4000-8000-000000000008",
    complaintId: "00000000-0000-4000-8001-000000000023",
    ticketId: null,
    sourceChannel: "app_store",
    sourceHandle: "ios-review-23",
    responseTone: "formal",
    responseTarget: "app_review",
    selectedHear:
      "Kami memahami refund sudah diproses tetapi notifikasi aplikasi belum berubah.",
    selectedEmpathize:
      "Status aplikasi yang belum sinkron dapat membuat proses refund terasa belum jelas.",
    selectedApologize: "Mohon maaf atas keterlambatan pembaruan status.",
    selectedTakeAction:
      "Status refund telah disinkronkan ulang dan notifikasi aplikasi diperbarui.",
    finalResponse:
      "Kami memahami refund sudah diproses tetapi notifikasi aplikasi belum berubah. Mohon maaf atas keterlambatan pembaruan status. Status refund telah disinkronkan ulang dan notifikasi aplikasi diperbarui.",
    outcome: "sent_resolved",
    createdAt: new Date("2026-07-04T05:45:00.000Z"),
    updatedAt: new Date("2026-07-04T05:45:00.000Z"),
  },
] as const satisfies ReadonlyArray<NewQuickResponseSession>;

export const seedQuickResponseSessions = async (
  db: Database,
): Promise<number> => {
  const now = new Date("2026-05-27T03:10:00.000Z");

  const seededSessions = await db
    .insert(quickResponseSessions)
    .values(
      quickResponseSeedData.map((session) => ({
        ...session,
        createdAt: "createdAt" in session ? session.createdAt : now,
        updatedAt: "updatedAt" in session ? session.updatedAt : now,
      })),
    )
    .onConflictDoUpdate({
      target: quickResponseSessions.id,
      set: {
        agentId: sql`excluded.agent_id`,
        complaintId: sql`excluded.complaint_id`,
        ticketId: sql`excluded.ticket_id`,
        sourceChannel: sql`excluded.source_channel`,
        sourceHandle: sql`excluded.source_handle`,
        responseTone: sql`excluded.response_tone`,
        responseTarget: sql`excluded.response_target`,
        selectedHear: sql`excluded.selected_hear`,
        selectedEmpathize: sql`excluded.selected_empathize`,
        selectedApologize: sql`excluded.selected_apologize`,
        selectedTakeAction: sql`excluded.selected_take_action`,
        finalResponse: sql`excluded.final_response`,
        outcome: sql`excluded.outcome`,
        updatedAt: now,
      },
    })
    .returning({ id: quickResponseSessions.id });

  return seededSessions.length;
};
