import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { tickets } from "./tickets.schema";
import { users } from "./users.schema";

export const ticketEventTypeEnum = pgEnum("ticket_event_type", [
  "created",
  "assigned",
  "hea_sent",
  "escalated",
  "manager_action_linked",
  "resolved",
  "closed",
  "reopened",
]);

export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    eventType: ticketEventTypeEnum("event_type").notNull(),
    note: text("note"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ticket_events_ticket_id_idx").on(table.ticketId),
    index("ticket_events_actor_id_idx").on(table.actorId),
    index("ticket_events_event_type_idx").on(table.eventType),
    index("ticket_events_created_at_idx").on(table.createdAt),
  ],
);

export type TicketEvent = typeof ticketEvents.$inferSelect;
export type NewTicketEvent = typeof ticketEvents.$inferInsert;
