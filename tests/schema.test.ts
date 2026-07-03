import { describe, expect, test } from "bun:test";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";

import {
  actionRequestComplaints,
  actionRequests,
  agentPerformance,
  auditLogs,
  complaints,
  actionRequestReferences,
  quickResponseReferences,
  quickResponseSessions,
  referenceSources,
  referenceSourceTags,
  referenceTags,
  ticketEvents,
  tickets,
  users,
} from "../src/db/schema";

const plannedTables = [
  users,
  complaints,
  tickets,
  quickResponseSessions,
  actionRequests,
  actionRequestComplaints,
  referenceSources,
  referenceTags,
  referenceSourceTags,
  quickResponseReferences,
  actionRequestReferences,
  ticketEvents,
  auditLogs,
  agentPerformance,
] as const;

const postponedTables = [
  "context_documents",
  "document_tags",
  "context_document_tags",
  "document_references",
  "rag_sources",
  "rag_chunks",
  "rag_retrievals",
] as const;

const configFor = (table: PgTable) => getTableConfig(table);

const uniqueNamesFor = (table: PgTable) => {
  const config = configFor(table);

  return [
    ...config.indexes
      .filter((index) => index.config.unique)
      .map((index) => index.config.name),
    ...config.uniqueConstraints.map((constraint) => constraint.name),
    ...config.primaryKeys.map((primaryKey) => primaryKey.getName()),
  ];
};

describe("database schema", () => {
  test("contains every planned v1 table", () => {
    expect(plannedTables.map((table) => configFor(table).name)).toEqual([
      "users",
      "complaints",
      "tickets",
      "quick_response_sessions",
      "action_requests",
      "action_request_complaints",
      "reference_sources",
      "reference_tags",
      "reference_source_tags",
      "quick_response_references",
      "action_request_references",
      "ticket_events",
      "audit_logs",
      "agent_performance",
    ]);
  });

  test("does not include postponed document or RAG tables", () => {
    const tableNames = plannedTables.map((table) => configFor(table).name);

    for (const tableName of postponedTables) {
      expect(tableNames).not.toContain(tableName);
    }
  });

  test("preserves the plan's critical uniqueness rules", () => {
    expect(uniqueNamesFor(users)).toContain("users_email_unique");
    expect(uniqueNamesFor(complaints)).toEqual(
      expect.arrayContaining([
        "complaints_reference_no_unique",
        "complaints_tracking_token_unique",
      ]),
    );
    expect(uniqueNamesFor(tickets)).toContain("tickets_complaint_id_unique");
    expect(uniqueNamesFor(actionRequests)).toContain(
      "action_requests_reference_no_unique",
    );
    expect(uniqueNamesFor(actionRequestComplaints)).toContain(
      "action_request_complaints_request_complaint_unique",
    );
    expect(uniqueNamesFor(referenceTags)).toContain(
      "reference_tags_name_unique",
    );
    expect(uniqueNamesFor(referenceSourceTags)).toContain(
      "reference_source_tags_pk",
    );
    expect(uniqueNamesFor(actionRequestReferences)).toContain(
      "action_request_references_request_source_unique",
    );
    expect(uniqueNamesFor(quickResponseReferences)).toContain(
      "quick_response_references_session_source_unique",
    );
    expect(uniqueNamesFor(agentPerformance)).toContain(
      "agent_performance_agent_period_unique",
    );
  });

  test("indexes complaint creation time for paginated reads", () => {
    expect(
      configFor(complaints).indexes.map((index) => index.config.name),
    ).toContain("complaints_created_at_idx");
    expect(
      configFor(actionRequests).indexes.map((index) => index.config.name),
    ).toEqual(
      expect.arrayContaining([
        "action_requests_issue_key_idx",
        "action_requests_grouping_key_idx",
      ]),
    );
    expect(
      configFor(referenceSources).indexes.map((index) => index.config.name),
    ).toContain("reference_sources_storage_key_idx");
    expect(
      configFor(quickResponseReferences).indexes.map(
        (index) => index.config.name,
      ),
    ).toContain("quick_response_references_selection_source_idx");
  });

  test("enforces expected foreign-key counts", () => {
    expect(configFor(tickets).foreignKeys).toHaveLength(2);
    expect(configFor(quickResponseSessions).foreignKeys).toHaveLength(3);
    expect(configFor(actionRequestComplaints).foreignKeys).toHaveLength(4);
    expect(configFor(referenceSources).foreignKeys).toHaveLength(1);
    expect(configFor(quickResponseReferences).foreignKeys).toHaveLength(3);
    expect(configFor(actionRequestReferences).foreignKeys).toHaveLength(3);
  });
});
