import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { complaints, complaintCategoryEnum } from "./complaints.schema";
import { tickets } from "./tickets.schema";
import { users } from "./users.schema";

export const actionRequestStatusEnum = pgEnum("action_request_status", [
  "open",
  "reviewing",
  "action_planned",
  "action_taken",
  "closed",
]);

export const actionRequests = pgTable(
  "action_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    managerId: uuid("manager_id").references(() => users.id, {
      onDelete: "set null",
    }),
    referenceNo: varchar("reference_no", { length: 64 }).notNull(),
    clusterLabel: varchar("cluster_label", { length: 255 }),
    category: complaintCategoryEnum("category").notNull(),
    status: actionRequestStatusEnum("status").notNull().default("open"),
    issueSummary: text("issue_summary").notNull(),
    actionTaken: text("action_taken"),
    closureMessage: text("closure_message"),
    raisedAt: timestamp("raised_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("action_requests_reference_no_unique").on(table.referenceNo),
    index("action_requests_manager_id_idx").on(table.managerId),
    index("action_requests_category_idx").on(table.category),
    index("action_requests_status_idx").on(table.status),
    index("action_requests_raised_at_idx").on(table.raisedAt),
  ],
);

export const actionRequestComplaints = pgTable(
  "action_request_complaints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actionRequestId: uuid("action_request_id")
      .notNull()
      .references(() => actionRequests.id, { onDelete: "cascade" }),
    complaintId: uuid("complaint_id")
      .notNull()
      .references(() => complaints.id),
    ticketId: uuid("ticket_id").references(() => tickets.id, {
      onDelete: "set null",
    }),
    agentId: uuid("agent_id").references(() => users.id, {
      onDelete: "set null",
    }),
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("action_request_complaints_request_complaint_unique").on(
      table.actionRequestId,
      table.complaintId,
    ),
    index("action_request_complaints_action_request_id_idx").on(
      table.actionRequestId,
    ),
    index("action_request_complaints_complaint_id_idx").on(table.complaintId),
    index("action_request_complaints_ticket_id_idx").on(table.ticketId),
    index("action_request_complaints_agent_id_idx").on(table.agentId),
  ],
);

export type ActionRequest = typeof actionRequests.$inferSelect;
export type NewActionRequest = typeof actionRequests.$inferInsert;
export type ActionRequestComplaint =
  typeof actionRequestComplaints.$inferSelect;
export type NewActionRequestComplaint =
  typeof actionRequestComplaints.$inferInsert;
