import {
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  vector,
  integer,
} from "drizzle-orm/pg-core";

import { complaints } from "./complaints.schema";
import { quickResponseSessions } from "./quick-response.schema";
import { referenceSources } from "./references.schema";

export const referenceSourceEmbeddings = pgTable(
  "reference_source_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referenceSourceId: uuid("reference_source_id")
      .notNull()
      .references(() => referenceSources.id, { onDelete: "cascade" }),
    embeddedText: text("embedded_text").notNull(),
    embedding: vector("embedding", { dimensions: 384 }).notNull(),
    modelName: text("model_name").notNull(),
    embeddingVersion: integer("embedding_version").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("reference_source_embeddings_source_model_version_unique").on(
      table.referenceSourceId,
      table.modelName,
      table.embeddingVersion,
    ),
  ],
);

export const resolvedCaseEmbeddings = pgTable(
  "resolved_case_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    complaintId: uuid("complaint_id")
      .notNull()
      .references(() => complaints.id, { onDelete: "cascade" }),
    quickResponseSessionId: uuid("quick_response_session_id")
      .notNull()
      .references(() => quickResponseSessions.id, { onDelete: "cascade" }),
    embeddedText: text("embedded_text").notNull(),
    embedding: vector("embedding", { dimensions: 384 }).notNull(),
    modelName: text("model_name").notNull(),
    embeddingVersion: integer("embedding_version").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("resolved_case_embeddings_case_session_model_version_unique").on(
      table.complaintId,
      table.quickResponseSessionId,
      table.modelName,
      table.embeddingVersion,
    ),
  ],
);

export type ReferenceSourceEmbedding =
  typeof referenceSourceEmbeddings.$inferSelect;
export type NewReferenceSourceEmbedding =
  typeof referenceSourceEmbeddings.$inferInsert;
export type ResolvedCaseEmbedding = typeof resolvedCaseEmbeddings.$inferSelect;
export type NewResolvedCaseEmbedding =
  typeof resolvedCaseEmbeddings.$inferInsert;
