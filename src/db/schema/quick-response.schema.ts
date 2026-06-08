import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { complaints, complaintSourceEnum } from "./complaints.schema";
import { tickets } from "./tickets.schema";
import { users } from "./users.schema";

export const responseTargetEnum = pgEnum("response_target", [
  "public_reply",
  "dm",
  "app_review",
  "internal_note",
]);

export const quickResponseOutcomeEnum = pgEnum("quick_response_outcome", [
  "sent_resolved",
  "sent_hea_action",
  "saved_ticket",
  "escalated",
  "copy_only",
]);

export const quickResponseSessions = pgTable(
  "quick_response_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id),
    complaintId: uuid("complaint_id")
      .notNull()
      .references(() => complaints.id),
    ticketId: uuid("ticket_id").references(() => tickets.id, {
      onDelete: "set null",
    }),
    sourceChannel: complaintSourceEnum("source_channel").notNull(),
    sourceHandle: varchar("source_handle", { length: 255 }),
    responseTone: varchar("response_tone", { length: 80 }),
    responseTarget: responseTargetEnum("response_target").notNull(),
    selectedHear: text("selected_hear"),
    selectedEmpathize: text("selected_empathize"),
    selectedApologize: text("selected_apologize"),
    selectedTakeAction: text("selected_take_action"),
    finalResponse: text("final_response"),
    outcome: quickResponseOutcomeEnum("outcome"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("quick_response_sessions_agent_id_idx").on(table.agentId),
    index("quick_response_sessions_complaint_id_idx").on(table.complaintId),
    index("quick_response_sessions_ticket_id_idx").on(table.ticketId),
    index("quick_response_sessions_outcome_idx").on(table.outcome),
    index("quick_response_sessions_created_at_idx").on(table.createdAt),
  ],
);

export type QuickResponseSession = typeof quickResponseSessions.$inferSelect;
export type NewQuickResponseSession =
  typeof quickResponseSessions.$inferInsert;
