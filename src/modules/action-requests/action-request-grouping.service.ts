import type { Complaint, Ticket } from "../../db/schema";
import type { ComplaintCategory } from "../complaints/complaints.types";

const categoryWindowDays: Record<ComplaintCategory, number> = {
  ticket_booking: 14,
  app_error: 7,
  account: 14,
  payment: 14,
  app_update: 7,
  no_response_cs: 7,
  refund_cancel: 14,
  queue_problem: 7,
  lost_item: 14,
  facility: 14,
  other: 7,
};

const issueMatchers: Array<{
  issueKey: string;
  categories?: ComplaintCategory[];
  keywords: string[];
  label: string;
}> = [
  {
    issueKey: "payment_failed",
    categories: ["payment"],
    keywords: [
      "payment failed",
      "gagal bayar",
      "transaksi gagal",
      "paid",
      "saldo terpotong",
      "tiket tidak muncul",
      "tiket belum muncul",
      "tiket tidak terbit",
    ],
    label: "Payment failed after customer was charged",
  },
  {
    issueKey: "refund_not_received",
    categories: ["refund_cancel", "payment"],
    keywords: [
      "refund",
      "pengembalian",
      "belum kembali",
      "uang kembali",
      "cancel",
      "batal",
      "dibatalkan",
    ],
    label: "Refund or cancellation issue requiring follow-up",
  },
  {
    issueKey: "ticket_booking_issue",
    categories: ["ticket_booking"],
    keywords: [
      "booking",
      "kode booking",
      "tiket",
      "ticket",
      "tiket tidak muncul",
      "tiket belum muncul",
      "tiket tidak terbit",
    ],
    label: "Ticket or booking issue requiring follow-up",
  },
  {
    issueKey: "app_update_issue",
    categories: ["app_update"],
    keywords: [
      "update",
      "status",
      "notifikasi",
      "notification",
      "sinkron",
      "berubah",
      "complaint update",
    ],
    label: "App status or complaint update issue requiring follow-up",
  },
  {
    issueKey: "app_error_checkout",
    categories: ["app_error"],
    keywords: ["checkout", "error", "bug", "crash", "aplikasi"],
    label: "App error blocking customer flow",
  },
  {
    issueKey: "no_response_cs",
    categories: ["no_response_cs"],
    keywords: ["cs", "customer service", "tidak dibalas", "no response"],
    label: "Customer service response issue requiring follow-up",
  },
  {
    issueKey: "queue_problem",
    categories: ["queue_problem"],
    keywords: ["queue", "antrian", "promo", "war", "antre"],
    label: "Queue or promo war issue requiring follow-up",
  },
];

const normalizeForGrouping = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s:_-]+/g, " ")
    .replace(/\s+/g, " ");

export interface ActionRequestGroupingService {
  detectIssueKey(input: {
    category: ComplaintCategory;
    complaintText: string;
  }): string;
  buildGroupingKey(input: {
    category: ComplaintCategory;
    issueKey: string;
  }): string;
  getGroupingWindowDays(category: ComplaintCategory): number;
  buildClusterLabel(input: {
    category: ComplaintCategory;
    issueKey: string;
  }): string;
  buildIssueSummary(input: { complaint: Complaint; ticket: Ticket }): string;
}

export const createActionRequestGroupingService =
  (): ActionRequestGroupingService => ({
    detectIssueKey(input) {
      const normalized = normalizeForGrouping(input.complaintText);
      const matcher = issueMatchers.find((candidate) => {
        const matchesCategory =
          !candidate.categories || candidate.categories.includes(input.category);
        return (
          matchesCategory &&
          candidate.keywords.some((keyword) => normalized.includes(keyword))
        );
      });

      return matcher?.issueKey ?? `${input.category}_general`;
    },

    buildGroupingKey(input) {
      return `${input.category}:${input.issueKey}`;
    },

    getGroupingWindowDays(category) {
      return categoryWindowDays[category] ?? 7;
    },

    buildClusterLabel(input) {
      const matcher = issueMatchers.find(
        (candidate) => candidate.issueKey === input.issueKey,
      );
      return matcher?.label ?? `${input.category} follow-up`;
    },

    buildIssueSummary(input) {
      const text = input.complaint.complaintText.trim();
      const excerpt = text.length > 220 ? `${text.slice(0, 217)}...` : text;
      return `Ticket ${input.ticket.id} requires manager action: ${excerpt}`;
    },
  });
