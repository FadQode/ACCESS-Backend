import { describe, expect, test } from "bun:test";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";

import {
  actionRequestComplaints,
  actionRequests,
  agentPerformance,
  auditLogs,
  complaints,
  contextDocuments,
  contextDocumentTags,
  documentReferences,
  documentTags,
  quickResponseSessions,
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
  contextDocuments,
  documentTags,
  contextDocumentTags,
  documentReferences,
  ticketEvents,
  auditLogs,
  agentPerformance,
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
      "context_documents",
      "document_tags",
      "context_document_tags",
      "document_references",
      "ticket_events",
      "audit_logs",
      "agent_performance",
    ]);
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
    expect(uniqueNamesFor(documentTags)).toContain(
      "document_tags_name_unique",
    );
    expect(uniqueNamesFor(contextDocumentTags)).toContain(
      "context_document_tags_pk",
    );
    expect(uniqueNamesFor(agentPerformance)).toContain(
      "agent_performance_agent_period_unique",
    );
  });

  test("enforces document targets and expected foreign-key counts", () => {
    expect(
      configFor(documentReferences).checks.map((check) => check.name),
    ).toContain("document_references_has_target");

    expect(configFor(tickets).foreignKeys).toHaveLength(2);
    expect(configFor(quickResponseSessions).foreignKeys).toHaveLength(3);
    expect(configFor(actionRequestComplaints).foreignKeys).toHaveLength(4);
    expect(configFor(documentReferences).foreignKeys).toHaveLength(4);
  });
});
