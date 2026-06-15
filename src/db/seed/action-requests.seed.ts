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
    status: "action_planned",
    issueSummary:
      "Payment gateway accepted charge but ticket issuance callback was delayed for multiple passengers.",
    actionTaken:
      "Coordinate payment reconciliation batch and prioritize affected booking IDs.",
    closureMessage:
      "Transaksi terdampak masuk proses rekonsiliasi dan refund/tiket akan dikonfirmasi maksimal 1x24 jam.",
  },
  {
    id: "00000000-0000-4000-8004-000000000002",
    managerId: "00000000-0000-4000-8000-000000000003",
    referenceNo: "AR-2026-0002",
    clusterLabel: "Delay notification issue",
    category: "delay",
    status: "action_taken",
    issueSummary:
      "Delay notification was not delivered consistently through app and station announcement channels.",
    actionTaken:
      "Operations resent notifications and station teams repeated manual announcements.",
    closureMessage:
      "Notifikasi delay telah dikirim ulang dan kanal pengumuman sudah dicek kembali oleh tim operasional.",
    resolvedAt: new Date("2026-05-26T01:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8004-000000000003",
    managerId: null,
    referenceNo: "AR-2026-0003",
    clusterLabel: "App cancellation failure",
    category: "cancellation",
    status: "reviewing",
    issueSummary:
      "Customers cannot cancel tickets from app for selected booking states.",
  },
  {
    id: "00000000-0000-4000-8004-000000000004",
    managerId: "00000000-0000-4000-8000-000000000002",
    referenceNo: "AR-2026-0004",
    clusterLabel: "Station facility issue",
    category: "facility",
    status: "closed",
    issueSummary:
      "Station passenger facility was unavailable during morning traffic.",
    actionTaken:
      "Station staff repaired the facility and added a recurring inspection.",
    closureMessage:
      "Fasilitas sudah diperbaiki dan akan dipantau melalui pemeriksaan rutin.",
    resolvedAt: new Date("2026-05-26T02:00:00.000Z"),
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
    actionRequestId: "00000000-0000-4000-8004-000000000001",
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
    actionRequestId: "00000000-0000-4000-8004-000000000004",
    complaintId: "00000000-0000-4000-8001-000000000007",
    ticketId: "00000000-0000-4000-8002-000000000005",
    agentId: "00000000-0000-4000-8000-000000000008",
  },
] as const satisfies ReadonlyArray<NewActionRequestComplaint>;

export const seedActionRequests = async (db: Database): Promise<number> => {
  const now = new Date("2026-05-27T03:15:00.000Z");

  const seededActionRequests = await db
    .insert(actionRequests)
    .values(
      actionRequestSeedData.map((request) => ({
        ...request,
        raisedAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: actionRequests.id,
      set: {
        managerId: sql`excluded.manager_id`,
        referenceNo: sql`excluded.reference_no`,
        clusterLabel: sql`excluded.cluster_label`,
        category: sql`excluded.category`,
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
