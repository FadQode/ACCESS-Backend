import { sql } from "drizzle-orm";

import type { Database } from "../index";
import { ticketEvents, type NewTicketEvent } from "../schema";

export const ticketEventSeedData = [
  {
    id: "00000000-0000-4000-8010-000000000001",
    ticketId: "00000000-0000-4000-8002-000000000001",
    actorId: "00000000-0000-4000-8000-000000000004",
    eventType: "created",
    note: "Ticket created after HEA response for payment issue.",
  },
  {
    id: "00000000-0000-4000-8010-000000000002",
    ticketId: "00000000-0000-4000-8002-000000000001",
    actorId: "00000000-0000-4000-8000-000000000004",
    eventType: "hea_sent",
    note: "HEA sent while waiting for payment reconciliation.",
  },
  {
    id: "00000000-0000-4000-8010-000000000003",
    ticketId: "00000000-0000-4000-8002-000000000001",
    actorId: "00000000-0000-4000-8000-000000000004",
    eventType: "manager_action_linked",
    note: "Linked to grouped payment gateway action request.",
    metadata: { actionRequestReferenceNo: "AR-2026-0001" },
  },
  {
    id: "00000000-0000-4000-8010-000000000004",
    ticketId: "00000000-0000-4000-8002-000000000002",
    actorId: "00000000-0000-4000-8000-000000000005",
    eventType: "created",
    note: "Ticket created for app status notification issue.",
  },
  {
    id: "00000000-0000-4000-8010-000000000005",
    ticketId: "00000000-0000-4000-8002-000000000002",
    actorId: "00000000-0000-4000-8000-000000000003",
    eventType: "manager_action_done",
    note: "Manager confirmed notification resend and station announcement fix.",
  },
  {
    id: "00000000-0000-4000-8010-000000000006",
    ticketId: "00000000-0000-4000-8002-000000000003",
    actorId: "00000000-0000-4000-8000-000000000006",
    eventType: "assigned",
    note: "Assigned to refund/cancellation support agent.",
  },
  {
    id: "00000000-0000-4000-8010-000000000007",
    ticketId: "00000000-0000-4000-8002-000000000003",
    actorId: "00000000-0000-4000-8000-000000000006",
    eventType: "hea_sent",
    note: "HEA sent before manager review is complete.",
  },
  {
    id: "00000000-0000-4000-8010-000000000008",
    ticketId: "00000000-0000-4000-8002-000000000004",
    actorId: "00000000-0000-4000-8000-000000000007",
    eventType: "escalated",
    note: "App payment error escalated to payment gateway action request.",
  },
  {
    id: "00000000-0000-4000-8010-000000000009",
    ticketId: "00000000-0000-4000-8002-000000000005",
    actorId: "00000000-0000-4000-8000-000000000008",
    eventType: "closed",
    note: "Facility issue closed after station repair confirmation.",
  },
  {
    id: "00000000-0000-4000-8010-000000000010",
    ticketId: "00000000-0000-4000-8002-000000000006",
    actorId: null,
    eventType: "created",
    note: "System-created ticket from call-center complaint.",
  },
  {
    id: "00000000-0000-4000-8010-000000000011",
    ticketId: "00000000-0000-4000-8002-000000000007",
    actorId: "00000000-0000-4000-8000-000000000004",
    eventType: "manager_action_linked",
    note: "Double-charge payment issue linked to the open payment cluster.",
    metadata: { actionRequestReferenceNo: "AR-2026-0001" },
  },
  {
    id: "00000000-0000-4000-8010-000000000012",
    ticketId: "00000000-0000-4000-8002-000000000008",
    actorId: "00000000-0000-4000-8000-000000000003",
    eventType: "manager_action_done",
    note: "Delay notification fix completed for the linked operational cluster.",
    metadata: { actionRequestReferenceNo: "AR-2026-0002" },
  },
  {
    id: "00000000-0000-4000-8010-000000000013",
    ticketId: "00000000-0000-4000-8002-000000000009",
    actorId: "00000000-0000-4000-8000-000000000005",
    eventType: "manager_action_linked",
    note: "Ticket-not-issued payment issue linked to the open payment cluster.",
    metadata: { actionRequestReferenceNo: "AR-2026-0001" },
  },
  {
    id: "00000000-0000-4000-8010-000000000014",
    ticketId: "00000000-0000-4000-8002-000000000010",
    actorId: "00000000-0000-4000-8000-000000000006",
    eventType: "manager_action_linked",
    note: "Cancellation failure linked to the manager review cluster.",
    metadata: { actionRequestReferenceNo: "AR-2026-0003" },
  },
  {
    id: "00000000-0000-4000-8010-000000000015",
    ticketId: "00000000-0000-4000-8002-000000000011",
    actorId: "00000000-0000-4000-8000-000000000006",
    eventType: "manager_action_linked",
    note: "Checkout crash linked to the open app checkout cluster.",
    metadata: { actionRequestReferenceNo: "AR-2026-0005" },
  },
  {
    id: "00000000-0000-4000-8010-000000000016",
    ticketId: "00000000-0000-4000-8002-000000000012",
    actorId: "00000000-0000-4000-8000-000000000007",
    eventType: "manager_action_linked",
    note: "Promo checkout error linked to the open app checkout cluster.",
    metadata: { actionRequestReferenceNo: "AR-2026-0005" },
  },
  {
    id: "00000000-0000-4000-8010-000000000017",
    ticketId: "00000000-0000-4000-8002-000000000013",
    actorId: "00000000-0000-4000-8000-000000000007",
    eventType: "manager_action_linked",
    note: "Pending booking after charge linked to the open payment cluster.",
    metadata: { actionRequestReferenceNo: "AR-2026-0001" },
  },
  {
    id: "00000000-0000-4000-8010-000000000018",
    ticketId: "00000000-0000-4000-8002-000000000014",
    actorId: "00000000-0000-4000-8000-000000000008",
    eventType: "closed",
    note: "Station facility case closed after staff opened access and added checks.",
  },
  {
    id: "00000000-0000-4000-8010-000000000019",
    ticketId: "00000000-0000-4000-8002-000000000015",
    actorId: "00000000-0000-4000-8000-000000000003",
    eventType: "manager_action_done",
    note: "Station and app status information were synchronized.",
    metadata: { actionRequestReferenceNo: "AR-2026-0002" },
  },
  {
    id: "00000000-0000-4000-8010-000000000020",
    ticketId: "00000000-0000-4000-8002-000000000016",
    actorId: "00000000-0000-4000-8000-000000000004",
    eventType: "manager_action_linked",
    note: "QR payment ticket-not-issued issue linked to the open payment cluster.",
    metadata: { actionRequestReferenceNo: "AR-2026-0001" },
  },
  {
    id: "00000000-0000-4000-8010-000000000021",
    ticketId: "00000000-0000-4000-8002-000000000017",
    actorId: "00000000-0000-4000-8000-000000000004",
    eventType: "manager_action_linked",
    note: "Recent payment issue linked to the open payment cluster.",
    metadata: { actionRequestReferenceNo: "AR-2026-0001" },
    createdAt: new Date("2026-07-02T02:45:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8010-000000000022",
    ticketId: "00000000-0000-4000-8002-000000000018",
    actorId: "00000000-0000-4000-8000-000000000003",
    eventType: "manager_action_done",
    note: "Recent app status information mismatch resolved by operations.",
    metadata: { actionRequestReferenceNo: "AR-2026-0002" },
    createdAt: new Date("2026-07-03T04:25:00.000Z"),
  },
] as const satisfies ReadonlyArray<NewTicketEvent>;

export const seedTicketEvents = async (db: Database): Promise<number> => {
  const createdAt = new Date("2026-05-27T03:25:00.000Z");

  const seededEvents = await db
    .insert(ticketEvents)
    .values(
      ticketEventSeedData.map((event) => ({
        ...event,
        createdAt: "createdAt" in event ? event.createdAt : createdAt,
      })),
    )
    .onConflictDoUpdate({
      target: ticketEvents.id,
      set: {
        ticketId: sql`excluded.ticket_id`,
        actorId: sql`excluded.actor_id`,
        eventType: sql`excluded.event_type`,
        note: sql`excluded.note`,
        metadata: sql`excluded.metadata`,
        createdAt: sql`excluded.created_at`,
      },
    })
    .returning({ id: ticketEvents.id });

  return seededEvents.length;
};
