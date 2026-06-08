import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { complaintCategoryEnum } from "./complaints.schema";
import { quickResponseSessions } from "./quick-response.schema";
import { tickets } from "./tickets.schema";
import { users } from "./users.schema";

export const documentTypeEnum = pgEnum("document_type", [
  "sop",
  "faq",
  "policy",
  "guide",
  "template",
  "known_issue",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "active",
  "draft",
  "archived",
]);

export const contextDocuments = pgTable(
  "context_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 255 }).notNull(),
    docType: documentTypeEnum("doc_type").notNull(),
    category: complaintCategoryEnum("category").notNull(),
    status: documentStatusEnum("status").notNull().default("draft"),
    version: varchar("version", { length: 32 }).notNull().default("1.0"),
    content: text("content").notNull(),
    searchText: text("search_text"),
    fileUrl: text("file_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("context_documents_uploaded_by_idx").on(table.uploadedBy),
    index("context_documents_title_idx").on(table.title),
    index("context_documents_doc_type_idx").on(table.docType),
    index("context_documents_category_idx").on(table.category),
    index("context_documents_status_idx").on(table.status),
  ],
);

export const documentTags = pgTable(
  "document_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("document_tags_name_unique").on(table.name),
  ],
);

export const contextDocumentTags = pgTable(
  "context_document_tags",
  {
    contextDocumentId: uuid("context_document_id")
      .notNull()
      .references(() => contextDocuments.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => documentTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      name: "context_document_tags_pk",
      columns: [table.contextDocumentId, table.tagId],
    }),
    index("context_document_tags_tag_id_idx").on(table.tagId),
  ],
);

export const documentReferences = pgTable(
  "document_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contextDocumentId: uuid("context_document_id")
      .notNull()
      .references(() => contextDocuments.id),
    ticketId: uuid("ticket_id").references(() => tickets.id, {
      onDelete: "cascade",
    }),
    quickResponseSessionId: uuid("quick_response_session_id").references(
      () => quickResponseSessions.id,
      { onDelete: "cascade" },
    ),
    referencedBy: uuid("referenced_by")
      .notNull()
      .references(() => users.id),
    referenceReason: text("reference_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "document_references_has_target",
      sql`${table.ticketId} is not null or ${table.quickResponseSessionId} is not null`,
    ),
    index("document_references_context_document_id_idx").on(
      table.contextDocumentId,
    ),
    index("document_references_ticket_id_idx").on(table.ticketId),
    index("document_references_quick_response_session_id_idx").on(
      table.quickResponseSessionId,
    ),
    index("document_references_referenced_by_idx").on(table.referencedBy),
  ],
);

export type ContextDocument = typeof contextDocuments.$inferSelect;
export type NewContextDocument = typeof contextDocuments.$inferInsert;
export type DocumentTag = typeof documentTags.$inferSelect;
export type NewDocumentTag = typeof documentTags.$inferInsert;
export type DocumentReference = typeof documentReferences.$inferSelect;
export type NewDocumentReference = typeof documentReferences.$inferInsert;
