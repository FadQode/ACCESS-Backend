import {
  index,
  jsonb,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { actionRequests } from "./action-requests.schema";
import { complaintCategoryEnum } from "./complaints.schema";
import { quickResponseSessions } from "./quick-response.schema";
import { users } from "./users.schema";

export const referenceSourceTypeEnum = pgEnum("reference_source_type", [
  "sop",
  "faq",
  "policy",
  "guide",
  "template",
  "known_issue",
  "external_link",
  "uploaded_file",
  "previous_action",
  "internal_note",
]);

export const referenceStatusEnum = pgEnum("reference_status", [
  "active",
  "draft",
  "archived",
]);

export const quickResponseReferenceUsageEnum = pgEnum(
  "quick_response_reference_usage",
  [
    "response_basis",
    "template_used",
    "policy_support",
    "known_issue",
    "previous_resolution",
    "action_closure",
  ],
);

export const actionRequestReferenceUsageEnum = pgEnum(
  "action_request_reference_usage",
  [
    "evidence",
    "action_basis",
    "policy_support",
    "closure_support",
    "related_link",
    "internal_note",
  ],
);

export const referenceSources = pgTable(
  "reference_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    sourceType: referenceSourceTypeEnum("source_type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    category: complaintCategoryEnum("category"),
    content: text("content"),
    url: text("url"),
    fileUrl: text("file_url"),
    storageProvider: varchar("storage_provider", { length: 64 }),
    storageBucket: varchar("storage_bucket", { length: 255 }),
    storageKey: text("storage_key"),
    fileName: varchar("file_name", { length: 255 }),
    fileMimeType: varchar("file_mime_type", { length: 255 }),
    fileSize: integer("file_size"),
    status: referenceStatusEnum("status").notNull().default("active"),
    version: varchar("version", { length: 32 }).notNull().default("1.0"),
    searchText: text("search_text"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reference_sources_created_by_idx").on(table.createdBy),
    index("reference_sources_source_type_idx").on(table.sourceType),
    index("reference_sources_category_idx").on(table.category),
    index("reference_sources_status_idx").on(table.status),
    index("reference_sources_title_idx").on(table.title),
    index("reference_sources_storage_key_idx").on(table.storageKey),
  ],
);

export const referenceTags = pgTable(
  "reference_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("reference_tags_name_unique").on(table.name),
  ],
);

export const referenceSourceTags = pgTable(
  "reference_source_tags",
  {
    referenceSourceId: uuid("reference_source_id")
      .notNull()
      .references(() => referenceSources.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => referenceTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      name: "reference_source_tags_pk",
      columns: [table.referenceSourceId, table.tagId],
    }),
    index("reference_source_tags_tag_id_idx").on(table.tagId),
  ],
);

export const quickResponseReferences = pgTable(
  "quick_response_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quickResponseSessionId: uuid("quick_response_session_id")
      .notNull()
      .references(() => quickResponseSessions.id, { onDelete: "cascade" }),
    referenceSourceId: uuid("reference_source_id")
      .notNull()
      .references(() => referenceSources.id),
    referencedBy: uuid("referenced_by")
      .notNull()
      .references(() => users.id),
    usageType: quickResponseReferenceUsageEnum("usage_type").notNull(),
    relevanceScore: numeric("relevance_score", { precision: 6, scale: 4 }),
    snapshotText: text("snapshot_text"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("quick_response_references_session_id_idx").on(
      table.quickResponseSessionId,
    ),
    index("quick_response_references_source_id_idx").on(
      table.referenceSourceId,
    ),
    index("quick_response_references_referenced_by_idx").on(
      table.referencedBy,
    ),
    index("quick_response_references_usage_type_idx").on(table.usageType),
  ],
);

export const actionRequestReferences = pgTable(
  "action_request_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actionRequestId: uuid("action_request_id")
      .notNull()
      .references(() => actionRequests.id, { onDelete: "cascade" }),
    referenceSourceId: uuid("reference_source_id")
      .notNull()
      .references(() => referenceSources.id),
    attachedBy: uuid("attached_by")
      .notNull()
      .references(() => users.id),
    usageType: actionRequestReferenceUsageEnum("usage_type").notNull(),
    snapshotText: text("snapshot_text"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("action_request_references_action_request_id_idx").on(
      table.actionRequestId,
    ),
    index("action_request_references_source_id_idx").on(
      table.referenceSourceId,
    ),
    index("action_request_references_attached_by_idx").on(table.attachedBy),
    index("action_request_references_usage_type_idx").on(table.usageType),
  ],
);

export type ReferenceSource = typeof referenceSources.$inferSelect;
export type NewReferenceSource = typeof referenceSources.$inferInsert;
export type ReferenceTag = typeof referenceTags.$inferSelect;
export type NewReferenceTag = typeof referenceTags.$inferInsert;
export type ReferenceSourceTag = typeof referenceSourceTags.$inferSelect;
export type NewReferenceSourceTag = typeof referenceSourceTags.$inferInsert;
export type QuickResponseReference =
  typeof quickResponseReferences.$inferSelect;
export type NewQuickResponseReference =
  typeof quickResponseReferences.$inferInsert;
export type ActionRequestReference =
  typeof actionRequestReferences.$inferSelect;
export type NewActionRequestReference =
  typeof actionRequestReferences.$inferInsert;
