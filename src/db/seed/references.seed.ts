import { sql } from "drizzle-orm";

import type { Database } from "../index";
import {
  actionRequestReferences,
  quickResponseReferences,
  referenceSources,
  referenceSourceTags,
  referenceTags,
  type NewActionRequestReference,
  type NewQuickResponseReference,
  type NewReferenceSource,
  type NewReferenceSourceTag,
  type NewReferenceTag,
} from "../schema";

export const referenceSourceSeedData = [
  {
    id: "00000000-0000-4000-8006-000000000001",
    createdBy: "00000000-0000-4000-8000-000000000001",
    sourceType: "sop",
    title: "SOP Refund Saldo Terpotong",
    category: "refund_cancel",
    content:
      "Langkah verifikasi transaksi gagal, pengecekan booking, dan koordinasi refund saldo terpotong.",
    status: "active",
    version: "1.0",
    searchText:
      "refund saldo terpotong transaksi gagal tiket tidak muncul rekonsiliasi",
  },
  {
    id: "00000000-0000-4000-8006-000000000002",
    createdBy: "00000000-0000-4000-8000-000000000001",
    sourceType: "faq",
    title: "FAQ Refund dan Pembatalan Tiket",
    category: "refund_cancel",
    content:
      "Panduan menjawab kendala pembatalan tiket, status booking, dan eskalasi aplikasi.",
    status: "active",
    version: "1.0",
    searchText: "faq refund pembatalan tiket aplikasi booking cancellation",
  },
  {
    id: "00000000-0000-4000-8006-000000000003",
    createdBy: "00000000-0000-4000-8000-000000000002",
    sourceType: "guide",
    title: "Panduan App Update dan Status Perjalanan",
    category: "app_update",
    content:
      "Gunakan HEA untuk keluhan status aplikasi, cek pengumuman operasional, dan berikan closure setelah notifikasi diperbarui.",
    status: "active",
    version: "1.0",
    searchText: "app update status perjalanan notifikasi operasional pengumuman",
  },
  {
    id: "00000000-0000-4000-8006-000000000004",
    createdBy: "00000000-0000-4000-8000-000000000001",
    sourceType: "template",
    title: "Template Respon App Review",
    category: "app_error",
    content:
      "Template ringkas untuk membalas review aplikasi dengan nada formal dan tindak lanjut jelas.",
    status: "active",
    version: "1.0",
    searchText: "template app review pembayaran error aplikasi",
  },
  {
    id: "00000000-0000-4000-8006-000000000005",
    createdBy: "00000000-0000-4000-8000-000000000002",
    sourceType: "known_issue",
    title: "Known Issue Payment Gateway Timeout",
    category: "payment",
    content:
      "Timeout pada gateway dapat membuat pembayaran sukses tetapi callback penerbitan tiket tertunda.",
    status: "active",
    version: "1.0",
    searchText: "payment gateway timeout tiket tidak muncul saldo terpotong",
  },
  {
    id: "00000000-0000-4000-8006-000000000006",
    createdBy: "00000000-0000-4000-8000-000000000001",
    sourceType: "guide",
    title: "Panduan Barang Tertinggal",
    category: "lost_item",
    content:
      "Panduan pengecekan laporan barang tertinggal, stasiun tujuan, dan pengambilan barang.",
    status: "active",
    version: "1.0",
    searchText: "barang tertinggal lost item kereta loket layanan",
  },
  {
    id: "00000000-0000-4000-8006-000000000007",
    createdBy: "00000000-0000-4000-8000-000000000002",
    sourceType: "previous_action",
    title: "Previous Action: Payment Gateway Timeout 25 Mei",
    category: "payment",
    content:
      "Manager menyetujui batch rekonsiliasi untuk transaksi gateway timeout tanggal 25 Mei.",
    status: "active",
    version: "1.0",
    searchText: "previous action payment gateway timeout 25 Mei closure",
    metadata: { originalActionRequest: "AR-2026-0001" },
  },
  {
    id: "00000000-0000-4000-8006-000000000008",
    createdBy: "00000000-0000-4000-8000-000000000003",
    sourceType: "internal_note",
    title: "Internal Note: Refund Batch Coordination",
    category: "refund_cancel",
    content:
      "Refund batch diproses oleh finance setelah daftar transaksi terdampak dikonfirmasi.",
    status: "active",
    version: "1.0",
    searchText: "internal note refund batch finance rekonsiliasi",
  },
  {
    id: "00000000-0000-4000-8006-000000000009",
    createdBy: "00000000-0000-4000-8000-000000000003",
    sourceType: "external_link",
    title: "External Link: Payment Gateway Incident Report",
    category: "payment",
    content:
      "Incident report from payment provider for timeout spike and callback delay.",
    url: "https://status.payment.example.test/incidents/2026-05-25",
    status: "active",
    version: "1.0",
    searchText: "external incident report payment gateway callback delay",
  },
  {
    id: "00000000-0000-4000-8006-000000000010",
    createdBy: "00000000-0000-4000-8000-000000000001",
    sourceType: "policy",
    title: "Policy Update Status dan Notifikasi",
    category: "app_update",
    content:
      "Kebijakan komunikasi pelanggan saat status aplikasi atau notifikasi belum sinkron.",
    status: "active",
    version: "1.0",
    searchText: "policy app update status notifikasi sinkronisasi",
  },
  {
    id: "00000000-0000-4000-8006-000000000011",
    createdBy: "00000000-0000-4000-8000-000000000001",
    sourceType: "uploaded_file",
    title: "Checklist Fasilitas Stasiun",
    category: "facility",
    content:
      "Checklist pemeriksaan fasilitas stasiun setelah laporan pelanggan.",
    fileUrl: "https://files.example.test/facility-checklist.pdf",
    status: "active",
    version: "1.0",
    searchText: "uploaded file checklist fasilitas stasiun",
  },
  {
    id: "00000000-0000-4000-8006-000000000012",
    createdBy: "00000000-0000-4000-8000-000000000001",
    sourceType: "faq",
    title: "FAQ Ticket dan Booking",
    category: "ticket_booking",
    content:
      "Panduan pengecekan kode booking, tiket tidak muncul, dan status penerbitan tiket.",
    status: "active",
    version: "1.0",
    searchText: "ticket booking tiket tidak muncul kode booking penerbitan tiket",
  },
  {
    id: "00000000-0000-4000-8006-000000000013",
    createdBy: "00000000-0000-4000-8000-000000000001",
    sourceType: "guide",
    title: "Panduan Login OTP dan Akun",
    category: "account",
    content:
      "Panduan menjawab kendala login, OTP tidak masuk, nomor akun, dan pemulihan akses.",
    status: "active",
    version: "1.0",
    searchText: "login otp akun nomor telepon pemulihan akses",
  },
  {
    id: "00000000-0000-4000-8006-000000000014",
    createdBy: "00000000-0000-4000-8000-000000000002",
    sourceType: "sop",
    title: "SOP CS Tidak Merespons",
    category: "no_response_cs",
    content:
      "Langkah eskalasi saat pelanggan melaporkan chat CS tidak dibalas atau respons terlalu lama.",
    status: "active",
    version: "1.0",
    searchText: "cs tidak merespons customer service no response chat tidak dibalas",
  },
  {
    id: "00000000-0000-4000-8006-000000000015",
    createdBy: "00000000-0000-4000-8000-000000000002",
    sourceType: "known_issue",
    title: "Known Issue Antrean Promo",
    category: "queue_problem",
    content:
      "Panduan komunikasi untuk antrean promo, promo war, dan traffic tinggi saat pembelian tiket.",
    status: "active",
    version: "1.0",
    searchText: "queue antrean promo war traffic tinggi pembelian tiket",
  },
  {
    id: "00000000-0000-4000-8006-000000000016",
    createdBy: "00000000-0000-4000-8000-000000000001",
    sourceType: "template",
    title: "Template Keluhan Umum",
    category: "other",
    content:
      "Template respons aman untuk keluhan umum, no signal, atau laporan yang belum masuk kategori spesifik.",
    status: "active",
    version: "1.0",
    searchText: "generic other lainnya no signal keluhan umum",
  },
] as const satisfies ReadonlyArray<NewReferenceSource>;

export const referenceTagSeedData = [
  { id: "00000000-0000-4000-8007-000000000001", name: "refund_cancel" },
  { id: "00000000-0000-4000-8007-000000000002", name: "payment_failed" },
  { id: "00000000-0000-4000-8007-000000000003", name: "saldo_terpotong" },
  { id: "00000000-0000-4000-8007-000000000004", name: "ticket_not_issued" },
  { id: "00000000-0000-4000-8007-000000000005", name: "app_update" },
  { id: "00000000-0000-4000-8007-000000000006", name: "ticket_booking" },
  { id: "00000000-0000-4000-8007-000000000007", name: "app_error" },
  { id: "00000000-0000-4000-8007-000000000008", name: "lost_item" },
  { id: "00000000-0000-4000-8007-000000000009", name: "facility" },
  { id: "00000000-0000-4000-8007-000000000010", name: "gateway_timeout" },
  { id: "00000000-0000-4000-8007-000000000011", name: "closure_template" },
  { id: "00000000-0000-4000-8007-000000000012", name: "account" },
  { id: "00000000-0000-4000-8007-000000000013", name: "no_response_cs" },
  { id: "00000000-0000-4000-8007-000000000014", name: "queue_problem" },
  { id: "00000000-0000-4000-8007-000000000015", name: "other" },
] satisfies NewReferenceTag[];

export const referenceSourceTagSeedData = [
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000001",
    tagId: "00000000-0000-4000-8007-000000000001",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000001",
    tagId: "00000000-0000-4000-8007-000000000003",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000001",
    tagId: "00000000-0000-4000-8007-000000000004",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000002",
    tagId: "00000000-0000-4000-8007-000000000006",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000003",
    tagId: "00000000-0000-4000-8007-000000000005",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000004",
    tagId: "00000000-0000-4000-8007-000000000007",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000004",
    tagId: "00000000-0000-4000-8007-000000000011",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000005",
    tagId: "00000000-0000-4000-8007-000000000002",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000005",
    tagId: "00000000-0000-4000-8007-000000000010",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000006",
    tagId: "00000000-0000-4000-8007-000000000008",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000007",
    tagId: "00000000-0000-4000-8007-000000000010",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000008",
    tagId: "00000000-0000-4000-8007-000000000001",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000009",
    tagId: "00000000-0000-4000-8007-000000000002",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000010",
    tagId: "00000000-0000-4000-8007-000000000005",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000011",
    tagId: "00000000-0000-4000-8007-000000000009",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000012",
    tagId: "00000000-0000-4000-8007-000000000006",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000013",
    tagId: "00000000-0000-4000-8007-000000000012",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000014",
    tagId: "00000000-0000-4000-8007-000000000013",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000015",
    tagId: "00000000-0000-4000-8007-000000000014",
  },
  {
    referenceSourceId: "00000000-0000-4000-8006-000000000016",
    tagId: "00000000-0000-4000-8007-000000000015",
  },
] satisfies NewReferenceSourceTag[];

export const quickResponseReferenceSeedData = [
  {
    id: "00000000-0000-4000-8008-000000000001",
    quickResponseSessionId: "00000000-0000-4000-8003-000000000001",
    referenceSourceId: "00000000-0000-4000-8006-000000000005",
    referencedBy: "00000000-0000-4000-8000-000000000004",
    selectionSource: "agent_selected",
    usageType: "known_issue",
    relevanceScore: "0.9100",
    snapshotText:
      "Timeout pada gateway dapat membuat pembayaran sukses tetapi callback penerbitan tiket tertunda.",
    note: "Used to explain why Take Action is needed.",
  },
  {
    id: "00000000-0000-4000-8008-000000000002",
    quickResponseSessionId: "00000000-0000-4000-8003-000000000004",
    referenceSourceId: "00000000-0000-4000-8006-000000000006",
    referencedBy: "00000000-0000-4000-8000-000000000004",
    selectionSource: "agent_selected",
    usageType: "response_basis",
    relevanceScore: "0.8800",
    snapshotText:
      "Panduan pengecekan laporan barang tertinggal, stasiun tujuan, dan pengambilan barang.",
  },
  {
    id: "00000000-0000-4000-8008-000000000003",
    quickResponseSessionId: "00000000-0000-4000-8003-000000000005",
    referenceSourceId: "00000000-0000-4000-8006-000000000004",
    referencedBy: "00000000-0000-4000-8000-000000000007",
    selectionSource: "agent_selected",
    usageType: "template_used",
    relevanceScore: "0.8300",
    snapshotText:
      "Template ringkas untuk membalas review aplikasi dengan nada formal dan tindak lanjut jelas.",
  },
  {
    id: "00000000-0000-4000-8008-000000000004",
    quickResponseSessionId: "00000000-0000-4000-8003-000000000006",
    referenceSourceId: "00000000-0000-4000-8006-000000000001",
    referencedBy: "00000000-0000-4000-8000-000000000005",
    selectionSource: "agent_selected",
    usageType: "policy_support",
    relevanceScore: "0.8600",
    snapshotText:
      "Langkah verifikasi transaksi gagal, pengecekan booking, dan koordinasi refund saldo terpotong.",
  },
  {
    id: "00000000-0000-4000-8008-000000000005",
    quickResponseSessionId: "00000000-0000-4000-8003-000000000007",
    referenceSourceId: "00000000-0000-4000-8006-000000000011",
    referencedBy: "00000000-0000-4000-8000-000000000008",
    selectionSource: "manager_attached",
    usageType: "action_closure",
    relevanceScore: "0.7600",
    snapshotText:
      "Checklist pemeriksaan fasilitas stasiun setelah laporan pelanggan.",
  },
] as const satisfies ReadonlyArray<NewQuickResponseReference>;

export const actionRequestReferenceSeedData = [
  {
    id: "00000000-0000-4000-8009-000000000001",
    actionRequestId: "00000000-0000-4000-8004-000000000001",
    referenceSourceId: "00000000-0000-4000-8006-000000000009",
    attachedBy: "00000000-0000-4000-8000-000000000002",
    usageType: "evidence",
    snapshotText:
      "Incident report from payment provider for timeout spike and callback delay.",
    note: "Payment provider incident evidence.",
  },
  {
    id: "00000000-0000-4000-8009-000000000002",
    actionRequestId: "00000000-0000-4000-8004-000000000003",
    referenceSourceId: "00000000-0000-4000-8006-000000000002",
    attachedBy: "00000000-0000-4000-8000-000000000003",
    usageType: "policy_support",
    snapshotText:
      "Panduan menjawab kendala pembatalan tiket, status booking, dan eskalasi aplikasi.",
  },
  {
    id: "00000000-0000-4000-8009-000000000003",
    actionRequestId: "00000000-0000-4000-8004-000000000002",
    referenceSourceId: "00000000-0000-4000-8006-000000000003",
    attachedBy: "00000000-0000-4000-8000-000000000003",
    usageType: "internal_note",
    snapshotText:
      "Gunakan HEA untuk keluhan status aplikasi, cek pengumuman operasional, dan berikan closure setelah notifikasi diperbarui.",
  },
  {
    id: "00000000-0000-4000-8009-000000000004",
    actionRequestId: "00000000-0000-4000-8004-000000000004",
    referenceSourceId: "00000000-0000-4000-8006-000000000011",
    attachedBy: "00000000-0000-4000-8000-000000000002",
    usageType: "closure_support",
    snapshotText:
      "Checklist pemeriksaan fasilitas stasiun setelah laporan pelanggan.",
  },
  {
    id: "00000000-0000-4000-8009-000000000005",
    actionRequestId: "00000000-0000-4000-8004-000000000005",
    referenceSourceId: "00000000-0000-4000-8006-000000000004",
    attachedBy: "00000000-0000-4000-8000-000000000003",
    usageType: "policy_support",
    snapshotText:
      "Template ringkas untuk membalas review aplikasi dengan nada formal dan tindak lanjut jelas.",
    note: "Used for app checkout cluster response consistency.",
  },
] as const satisfies ReadonlyArray<NewActionRequestReference>;

export const seedReferences = async (db: Database): Promise<number> => {
  const now = new Date("2026-05-27T03:20:00.000Z");

  const seededSources = await db
    .insert(referenceSources)
    .values(
      referenceSourceSeedData.map((source) => ({
        ...source,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: referenceSources.id,
      set: {
        createdBy: sql`excluded.created_by`,
        sourceType: sql`excluded.source_type`,
        title: sql`excluded.title`,
        category: sql`excluded.category`,
        content: sql`excluded.content`,
        url: sql`excluded.url`,
        fileUrl: sql`excluded.file_url`,
        storageProvider: sql`excluded.storage_provider`,
        storageBucket: sql`excluded.storage_bucket`,
        storageKey: sql`excluded.storage_key`,
        fileName: sql`excluded.file_name`,
        fileMimeType: sql`excluded.file_mime_type`,
        fileSize: sql`excluded.file_size`,
        status: sql`excluded.status`,
        version: sql`excluded.version`,
        searchText: sql`excluded.search_text`,
        metadata: sql`excluded.metadata`,
        updatedAt: now,
      },
    })
    .returning({ id: referenceSources.id });

  const seededTags = await db
    .insert(referenceTags)
    .values(referenceTagSeedData)
    .onConflictDoUpdate({
      target: referenceTags.id,
      set: {
        name: sql`excluded.name`,
      },
    })
    .returning({ id: referenceTags.id });

  await db
    .insert(referenceSourceTags)
    .values(referenceSourceTagSeedData)
    .onConflictDoNothing();

  const seededQuickResponseReferences = await db
    .insert(quickResponseReferences)
    .values([...quickResponseReferenceSeedData])
    .onConflictDoUpdate({
      target: quickResponseReferences.id,
      set: {
        quickResponseSessionId: sql`excluded.quick_response_session_id`,
        referenceSourceId: sql`excluded.reference_source_id`,
        referencedBy: sql`excluded.referenced_by`,
        selectionSource: sql`excluded.selection_source`,
        usageType: sql`excluded.usage_type`,
        relevanceScore: sql`excluded.relevance_score`,
        snapshotText: sql`excluded.snapshot_text`,
        note: sql`excluded.note`,
      },
    })
    .returning({ id: quickResponseReferences.id });

  const seededActionRequestReferences = await db
    .insert(actionRequestReferences)
    .values([...actionRequestReferenceSeedData])
    .onConflictDoUpdate({
      target: actionRequestReferences.id,
      set: {
        actionRequestId: sql`excluded.action_request_id`,
        referenceSourceId: sql`excluded.reference_source_id`,
        attachedBy: sql`excluded.attached_by`,
        usageType: sql`excluded.usage_type`,
        snapshotText: sql`excluded.snapshot_text`,
        note: sql`excluded.note`,
      },
    })
    .returning({ id: actionRequestReferences.id });

  return (
    seededSources.length +
    seededTags.length +
    referenceSourceTagSeedData.length +
    seededQuickResponseReferences.length +
    seededActionRequestReferences.length
  );
};
