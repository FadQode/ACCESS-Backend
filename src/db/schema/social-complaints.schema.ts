import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const socialComplaintSourceEnum = pgEnum("social_complaint_source", [
  "google_play",
  "facebook",
  "x",
]);

export const socialComplaints = pgTable(
  "social_complaints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: socialComplaintSourceEnum("source").notNull(),
    sourceReference: text("source_reference").notNull(),
    content: text("content").notNull(),
    author: varchar("author", { length: 255 }),
    sourceUrl: text("source_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("social_complaints_source_reference_unique").on(
      table.source,
      table.sourceReference,
    ),
    index("social_complaints_source_published_at_idx").on(
      table.source,
      table.publishedAt,
    ),
    index("social_complaints_published_at_idx").on(table.publishedAt),
  ],
);

export type SocialComplaint = typeof socialComplaints.$inferSelect;
export type NewSocialComplaint = typeof socialComplaints.$inferInsert;
