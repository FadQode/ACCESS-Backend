import { relations } from "drizzle-orm";

import {
  actionRequestComplaints,
  actionRequests,
} from "./action-requests.schema";
import { agentPerformance } from "./agent-performance.schema";
import { auditLogs } from "./audit-logs.schema";
import { complaints } from "./complaints.schema";
import {
  contextDocuments,
  contextDocumentTags,
  documentReferences,
  documentTags,
} from "./documents.schema";
import { quickResponseSessions } from "./quick-response.schema";
import { ticketEvents } from "./ticket-events.schema";
import { tickets } from "./tickets.schema";
import { users } from "./users.schema";

export const usersRelations = relations(users, ({ many }) => ({
  assignedTickets: many(tickets, { relationName: "ticket_agent" }),
  quickResponseSessions: many(quickResponseSessions, {
    relationName: "quick_response_agent",
  }),
  managedActionRequests: many(actionRequests, {
    relationName: "action_request_manager",
  }),
  linkedActionRequestComplaints: many(actionRequestComplaints, {
    relationName: "action_request_complaint_agent",
  }),
  uploadedDocuments: many(contextDocuments, {
    relationName: "document_uploader",
  }),
  documentReferences: many(documentReferences, {
    relationName: "document_referrer",
  }),
  ticketEvents: many(ticketEvents, { relationName: "ticket_event_actor" }),
  auditLogs: many(auditLogs, { relationName: "audit_log_actor" }),
  performanceSnapshots: many(agentPerformance, {
    relationName: "agent_performance_agent",
  }),
}));

export const complaintsRelations = relations(complaints, ({ many, one }) => ({
  ticket: one(tickets),
  quickResponseSessions: many(quickResponseSessions),
  actionRequestLinks: many(actionRequestComplaints),
}));

export const ticketsRelations = relations(tickets, ({ many, one }) => ({
  complaint: one(complaints, {
    fields: [tickets.complaintId],
    references: [complaints.id],
  }),
  agent: one(users, {
    fields: [tickets.agentId],
    references: [users.id],
    relationName: "ticket_agent",
  }),
  quickResponseSessions: many(quickResponseSessions),
  actionRequestLinks: many(actionRequestComplaints),
  documentReferences: many(documentReferences),
  events: many(ticketEvents),
}));

export const quickResponseSessionsRelations = relations(
  quickResponseSessions,
  ({ many, one }) => ({
    agent: one(users, {
      fields: [quickResponseSessions.agentId],
      references: [users.id],
      relationName: "quick_response_agent",
    }),
    complaint: one(complaints, {
      fields: [quickResponseSessions.complaintId],
      references: [complaints.id],
    }),
    ticket: one(tickets, {
      fields: [quickResponseSessions.ticketId],
      references: [tickets.id],
    }),
    documentReferences: many(documentReferences),
  }),
);

export const actionRequestsRelations = relations(
  actionRequests,
  ({ many, one }) => ({
    manager: one(users, {
      fields: [actionRequests.managerId],
      references: [users.id],
      relationName: "action_request_manager",
    }),
    complaintLinks: many(actionRequestComplaints),
  }),
);

export const actionRequestComplaintsRelations = relations(
  actionRequestComplaints,
  ({ one }) => ({
    actionRequest: one(actionRequests, {
      fields: [actionRequestComplaints.actionRequestId],
      references: [actionRequests.id],
    }),
    complaint: one(complaints, {
      fields: [actionRequestComplaints.complaintId],
      references: [complaints.id],
    }),
    ticket: one(tickets, {
      fields: [actionRequestComplaints.ticketId],
      references: [tickets.id],
    }),
    agent: one(users, {
      fields: [actionRequestComplaints.agentId],
      references: [users.id],
      relationName: "action_request_complaint_agent",
    }),
  }),
);

export const contextDocumentsRelations = relations(
  contextDocuments,
  ({ many, one }) => ({
    uploader: one(users, {
      fields: [contextDocuments.uploadedBy],
      references: [users.id],
      relationName: "document_uploader",
    }),
    tagLinks: many(contextDocumentTags),
    references: many(documentReferences),
  }),
);

export const documentTagsRelations = relations(documentTags, ({ many }) => ({
  documentLinks: many(contextDocumentTags),
}));

export const contextDocumentTagsRelations = relations(
  contextDocumentTags,
  ({ one }) => ({
    document: one(contextDocuments, {
      fields: [contextDocumentTags.contextDocumentId],
      references: [contextDocuments.id],
    }),
    tag: one(documentTags, {
      fields: [contextDocumentTags.tagId],
      references: [documentTags.id],
    }),
  }),
);

export const documentReferencesRelations = relations(
  documentReferences,
  ({ one }) => ({
    document: one(contextDocuments, {
      fields: [documentReferences.contextDocumentId],
      references: [contextDocuments.id],
    }),
    ticket: one(tickets, {
      fields: [documentReferences.ticketId],
      references: [tickets.id],
    }),
    quickResponseSession: one(quickResponseSessions, {
      fields: [documentReferences.quickResponseSessionId],
      references: [quickResponseSessions.id],
    }),
    referrer: one(users, {
      fields: [documentReferences.referencedBy],
      references: [users.id],
      relationName: "document_referrer",
    }),
  }),
);

export const ticketEventsRelations = relations(ticketEvents, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketEvents.ticketId],
    references: [tickets.id],
  }),
  actor: one(users, {
    fields: [ticketEvents.actorId],
    references: [users.id],
    relationName: "ticket_event_actor",
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
    relationName: "audit_log_actor",
  }),
}));

export const agentPerformanceRelations = relations(
  agentPerformance,
  ({ one }) => ({
    agent: one(users, {
      fields: [agentPerformance.agentId],
      references: [users.id],
      relationName: "agent_performance_agent",
    }),
  }),
);
