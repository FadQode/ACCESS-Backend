import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const complaintSourceEnum = pgEnum("complaint_source", [
  "web_form",
  "twitter",
  "instagram",
  "facebook",
  "google_play",
  "app_store",
  "other",
]);

export const complaintCategoryEnum = pgEnum("complaint_category", [
  "delay",
  "refund",
  "cancellation",
  "lost_item",
  "facility",
  "payment",
  "account",
  "app_error",
  "other",
]);

export const complaintStatusEnum = pgEnum("complaint_status", [
  "submitted",
  "waiting_action",
  "resolved",
  "closed",
]);

export const complaints = pgTable(
  "complaints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referenceNo: varchar("reference_no", { length: 64 }).notNull(),
    trackingToken: varchar("tracking_token", { length: 128 }).notNull(),
    source: complaintSourceEnum("source").notNull(),
    sourceHandle: varchar("source_handle", { length: 255 }),
    sourceUrl: text("source_url"),
    complainerName: varchar("complainer_name", { length: 160 }),
    complainerContact: varchar("complainer_contact", { length: 255 }),
    category: complaintCategoryEnum("category").notNull(),
    complaintText: text("complaint_text").notNull(),
    status: complaintStatusEnum("status").notNull().default("submitted"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
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
    uniqueIndex("complaints_reference_no_unique").on(table.referenceNo),
    uniqueIndex("complaints_tracking_token_unique").on(table.trackingToken),
    index("complaints_source_idx").on(table.source),
    index("complaints_category_idx").on(table.category),
    index("complaints_status_idx").on(table.status),
    index("complaints_submitted_at_idx").on(table.submittedAt),
    index("complaints_created_at_idx").on(table.createdAt),
  ],
);

export type Complaint = typeof complaints.$inferSelect;
export type NewComplaint = typeof complaints.$inferInsert;
