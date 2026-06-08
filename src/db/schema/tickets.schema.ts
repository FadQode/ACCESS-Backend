import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { complaints } from "./complaints.schema";
import { users } from "./users.schema";

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "hea_sent",
  "waiting_manager_action",
  "manager_action_done",
  "ready_to_close",
  "closed",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    complaintId: uuid("complaint_id")
      .notNull()
      .references(() => complaints.id),
    agentId: uuid("agent_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: ticketStatusEnum("status").notNull().default("open"),
    priority: ticketPriorityEnum("priority").notNull().default("medium"),
    heaResponse: text("hea_response"),
    heaSentAt: timestamp("hea_sent_at", { withTimezone: true }),
    closureMessage: text("closure_message"),
    closureSentAt: timestamp("closure_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tickets_complaint_id_unique").on(table.complaintId),
    index("tickets_agent_id_idx").on(table.agentId),
    index("tickets_status_idx").on(table.status),
    index("tickets_priority_idx").on(table.priority),
    index("tickets_created_at_idx").on(table.createdAt),
  ],
);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
