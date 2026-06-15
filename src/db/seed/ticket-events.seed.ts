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
    note: "Ticket created for delay notification issue.",
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
    note: "Assigned to app cancellation support agent.",
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
] as const satisfies ReadonlyArray<NewTicketEvent>;

export const seedTicketEvents = async (db: Database): Promise<number> => {
  const createdAt = new Date("2026-05-27T03:25:00.000Z");

  const seededEvents = await db
    .insert(ticketEvents)
    .values(ticketEventSeedData.map((event) => ({ ...event, createdAt })))
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
