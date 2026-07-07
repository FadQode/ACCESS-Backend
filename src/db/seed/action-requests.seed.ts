import { sql } from "drizzle-orm";

import type { Database } from "../index";
import {
  actionRequestComplaints,
  actionRequests,
  type NewActionRequest,
  type NewActionRequestComplaint,
} from "../schema";

export const actionRequestSeedData = [
  {
    id: "00000000-0000-4000-8004-000000000001",
    managerId: "00000000-0000-4000-8000-000000000002",
    referenceNo: "AR-2026-0001",
    clusterLabel: "Payment deducted but ticket not issued",
    category: "payment",
    issueKey: "payment_failed",
    groupingKey: "payment:payment_failed",
    status: "open",
    issueSummary:
      "Payment gateway accepted charge but ticket issuance callback was delayed for multiple passengers.",
    actionTaken:
      "Coordinate payment reconciliation batch and prioritize affected booking IDs.",
    closureMessage:
      "Transaksi terdampak masuk proses rekonsiliasi dan refund/tiket akan dikonfirmasi maksimal 1x24 jam.",
    raisedAt: new Date("2026-07-02T02:45:00.000Z"),
    createdAt: new Date("2026-07-02T02:45:00.000Z"),
    updatedAt: new Date("2026-07-02T02:45:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8004-000000000002",
    managerId: "00000000-0000-4000-8000-000000000003",
    referenceNo: "AR-2026-0002",
    clusterLabel: "App status update issue",
    category: "app_update",
    issueKey: "app_update_issue",
    groupingKey: "app_update:app_update_issue",
    status: "action_taken",
    issueSummary:
      "App status updates and notifications were not delivered consistently with station information.",
    actionTaken:
      "Operations synchronized app status data and station teams repeated manual announcements.",
    closureMessage:
      "Status aplikasi dan notifikasi telah disinkronkan ulang dengan informasi operasional terbaru.",
    raisedAt: new Date("2026-07-03T04:05:00.000Z"),
    resolvedAt: new Date("2026-07-03T04:25:00.000Z"),
    createdAt: new Date("2026-07-03T04:05:00.000Z"),
    updatedAt: new Date("2026-07-03T04:25:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8004-000000000003",
    managerId: null,
    referenceNo: "AR-2026-0003",
    clusterLabel: "Refund or cancellation failure",
    category: "refund_cancel",
    issueKey: "refund_not_received",
    groupingKey: "refund_cancel:refund_not_received",
    status: "reviewing",
    issueSummary:
      "Customers cannot cancel tickets or receive refund confirmation for selected booking states.",
  },
  {
    id: "00000000-0000-4000-8004-000000000004",
    managerId: "00000000-0000-4000-8000-000000000002",
    referenceNo: "AR-2026-0004",
    clusterLabel: "Station facility issue",
    category: "facility",
    issueKey: "facility_general",
    groupingKey: "facility:facility_general",
    status: "closed",
    issueSummary:
      "Station passenger facility was unavailable during morning traffic.",
    actionTaken:
      "Station staff repaired the facility and added a recurring inspection.",
    closureMessage:
      "Fasilitas sudah diperbaiki dan akan dipantau melalui pemeriksaan rutin.",
    resolvedAt: new Date("2026-05-26T02:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8004-000000000005",
    managerId: "00000000-0000-4000-8000-000000000003",
    referenceNo: "AR-2026-0005",
    clusterLabel: "App checkout error blocking payment",
    category: "app_error",
    issueKey: "app_error_checkout",
    groupingKey: "app_error:app_error_checkout",
    status: "open",
    issueSummary:
      "Multiple customers cannot complete checkout after promo or seat selection steps.",
    raisedAt: new Date("2026-07-02T10:45:00.000Z"),
    createdAt: new Date("2026-07-02T10:45:00.000Z"),
    updatedAt: new Date("2026-07-02T10:45:00.000Z"),
  },
] as const satisfies ReadonlyArray<NewActionRequest>;

export const actionRequestComplaintSeedData = [
  {
    id: "00000000-0000-4000-8005-000000000001",
    actionRequestId: "00000000-0000-4000-8004-000000000001",
    complaintId: "00000000-0000-4000-8001-000000000001",
    ticketId: "00000000-0000-4000-8002-000000000001",
    agentId: "00000000-0000-4000-8000-000000000004",
  },
  {
    id: "00000000-0000-4000-8005-000000000002",
    actionRequestId: "00000000-0000-4000-8004-000000000005",
    complaintId: "00000000-0000-4000-8001-000000000005",
    ticketId: "00000000-0000-4000-8002-000000000004",
    agentId: "00000000-0000-4000-8000-000000000007",
  },
  {
    id: "00000000-0000-4000-8005-000000000003",
    actionRequestId: "00000000-0000-4000-8004-000000000002",
    complaintId: "00000000-0000-4000-8001-000000000002",
    ticketId: "00000000-0000-4000-8002-000000000002",
    agentId: "00000000-0000-4000-8000-000000000005",
  },
  {
    id: "00000000-0000-4000-8005-000000000004",
    actionRequestId: "00000000-0000-4000-8004-000000000002",
    complaintId: "00000000-0000-4000-8001-000000000008",
    ticketId: "00000000-0000-4000-8002-000000000006",
    agentId: "00000000-0000-4000-8000-000000000006",
  },
  {
    id: "00000000-0000-4000-8005-000000000005",
    actionRequestId: "00000000-0000-4000-8004-000000000003",
    complaintId: "00000000-0000-4000-8001-000000000003",
    ticketId: "00000000-0000-4000-8002-000000000003",
    agentId: "00000000-0000-4000-8000-000000000006",
  },
  {
    id: "00000000-0000-4000-8005-000000000006",
    actionRequestId: "00000000-0000-4000-8004-000000000001",
    complaintId: "00000000-0000-4000-8001-000000000009",
    ticketId: "00000000-0000-4000-8002-000000000007",
    agentId: "00000000-0000-4000-8000-000000000004",
  },
  {
    id: "00000000-0000-4000-8005-000000000007",
    actionRequestId: "00000000-0000-4000-8004-000000000002",
    complaintId: "00000000-0000-4000-8001-000000000011",
    ticketId: "00000000-0000-4000-8002-000000000008",
    agentId: "00000000-0000-4000-8000-000000000005",
  },
  {
    id: "00000000-0000-4000-8005-000000000008",
    actionRequestId: "00000000-0000-4000-8004-000000000001",
    complaintId: "00000000-0000-4000-8001-000000000012",
    ticketId: "00000000-0000-4000-8002-000000000009",
    agentId: "00000000-0000-4000-8000-000000000005",
  },
  {
    id: "00000000-0000-4000-8005-000000000009",
    actionRequestId: "00000000-0000-4000-8004-000000000003",
    complaintId: "00000000-0000-4000-8001-000000000013",
    ticketId: "00000000-0000-4000-8002-000000000010",
    agentId: "00000000-0000-4000-8000-000000000006",
  },
  {
    id: "00000000-0000-4000-8005-000000000010",
    actionRequestId: "00000000-0000-4000-8004-000000000005",
    complaintId: "00000000-0000-4000-8001-000000000014",
    ticketId: "00000000-0000-4000-8002-000000000011",
    agentId: "00000000-0000-4000-8000-000000000006",
  },
  {
    id: "00000000-0000-4000-8005-000000000011",
    actionRequestId: "00000000-0000-4000-8004-000000000005",
    complaintId: "00000000-0000-4000-8001-000000000015",
    ticketId: "00000000-0000-4000-8002-000000000012",
    agentId: "00000000-0000-4000-8000-000000000007",
  },
  {
    id: "00000000-0000-4000-8005-000000000012",
    actionRequestId: "00000000-0000-4000-8004-000000000001",
    complaintId: "00000000-0000-4000-8001-000000000016",
    ticketId: "00000000-0000-4000-8002-000000000013",
    agentId: "00000000-0000-4000-8000-000000000007",
  },
  {
    id: "00000000-0000-4000-8005-000000000013",
    actionRequestId: "00000000-0000-4000-8004-000000000002",
    complaintId: "00000000-0000-4000-8001-000000000019",
    ticketId: "00000000-0000-4000-8002-000000000015",
    agentId: "00000000-0000-4000-8000-000000000008",
  },
  {
    id: "00000000-0000-4000-8005-000000000014",
    actionRequestId: "00000000-0000-4000-8004-000000000001",
    complaintId: "00000000-0000-4000-8001-000000000020",
    ticketId: "00000000-0000-4000-8002-000000000016",
    agentId: "00000000-0000-4000-8000-000000000004",
  },
  {
    id: "00000000-0000-4000-8005-000000000015",
    actionRequestId: "00000000-0000-4000-8004-000000000001",
    complaintId: "00000000-0000-4000-8001-000000000021",
    ticketId: "00000000-0000-4000-8002-000000000017",
    agentId: "00000000-0000-4000-8000-000000000004",
    linkedAt: new Date("2026-07-02T02:45:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8005-000000000016",
    actionRequestId: "00000000-0000-4000-8004-000000000002",
    complaintId: "00000000-0000-4000-8001-000000000022",
    ticketId: "00000000-0000-4000-8002-000000000018",
    agentId: "00000000-0000-4000-8000-000000000005",
    linkedAt: new Date("2026-07-03T04:05:00.000Z"),
  },
] as const satisfies ReadonlyArray<NewActionRequestComplaint>;

export const seedActionRequests = async (db: Database): Promise<number> => {
  const now = new Date("2026-05-27T03:15:00.000Z");

  const seededActionRequests = await db
    .insert(actionRequests)
    .values(
      actionRequestSeedData.map((request) => ({
        ...request,
        raisedAt: "raisedAt" in request ? request.raisedAt : now,
        createdAt: "createdAt" in request ? request.createdAt : now,
        updatedAt: "updatedAt" in request ? request.updatedAt : now,
      })),
    )
    .onConflictDoUpdate({
      target: actionRequests.id,
      set: {
        managerId: sql`excluded.manager_id`,
        referenceNo: sql`excluded.reference_no`,
        clusterLabel: sql`excluded.cluster_label`,
        category: sql`excluded.category`,
        issueKey: sql`excluded.issue_key`,
        groupingKey: sql`excluded.grouping_key`,
        status: sql`excluded.status`,
        issueSummary: sql`excluded.issue_summary`,
        actionTaken: sql`excluded.action_taken`,
        closureMessage: sql`excluded.closure_message`,
        raisedAt: sql`excluded.raised_at`,
        resolvedAt: sql`excluded.resolved_at`,
        updatedAt: now,
      },
    })
    .returning({ id: actionRequests.id });

  await db
    .insert(actionRequestComplaints)
    .values([...actionRequestComplaintSeedData])
    .onConflictDoUpdate({
      target: actionRequestComplaints.id,
      set: {
        actionRequestId: sql`excluded.action_request_id`,
        complaintId: sql`excluded.complaint_id`,
        ticketId: sql`excluded.ticket_id`,
        agentId: sql`excluded.agent_id`,
        linkedAt: sql`excluded.linked_at`,
      },
    });

  return seededActionRequests.length + actionRequestComplaintSeedData.length;
};
