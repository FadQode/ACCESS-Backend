import { relations } from "drizzle-orm";

import {
  actionRequestComplaints,
  actionRequests,
} from "./action-requests.schema";
import { agentPerformance } from "./agent-performance.schema";
import { auditLogs } from "./audit-logs.schema";
import { complaints } from "./complaints.schema";
import { quickResponseSessions } from "./quick-response.schema";
import {
  actionRequestReferences,
  quickResponseReferences,
  referenceSources,
  referenceSourceTags,
  referenceTags,
} from "./references.schema";
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
  referenceSources: many(referenceSources, {
    relationName: "reference_source_creator",
  }),
  quickResponseReferences: many(quickResponseReferences, {
    relationName: "quick_response_reference_referrer",
  }),
  actionRequestReferences: many(actionRequestReferences, {
    relationName: "action_request_reference_attacher",
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
    references: many(quickResponseReferences),
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
    references: many(actionRequestReferences),
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

export const referenceSourcesRelations = relations(
  referenceSources,
  ({ many, one }) => ({
    creator: one(users, {
      fields: [referenceSources.createdBy],
      references: [users.id],
      relationName: "reference_source_creator",
    }),
    tagLinks: many(referenceSourceTags),
    quickResponseReferences: many(quickResponseReferences),
    actionRequestReferences: many(actionRequestReferences),
  }),
);

export const referenceTagsRelations = relations(referenceTags, ({ many }) => ({
  sourceLinks: many(referenceSourceTags),
}));

export const referenceSourceTagsRelations = relations(
  referenceSourceTags,
  ({ one }) => ({
    source: one(referenceSources, {
      fields: [referenceSourceTags.referenceSourceId],
      references: [referenceSources.id],
    }),
    tag: one(referenceTags, {
      fields: [referenceSourceTags.tagId],
      references: [referenceTags.id],
    }),
  }),
);

export const quickResponseReferencesRelations = relations(
  quickResponseReferences,
  ({ one }) => ({
    quickResponseSession: one(quickResponseSessions, {
      fields: [quickResponseReferences.quickResponseSessionId],
      references: [quickResponseSessions.id],
    }),
    source: one(referenceSources, {
      fields: [quickResponseReferences.referenceSourceId],
      references: [referenceSources.id],
    }),
    referrer: one(users, {
      fields: [quickResponseReferences.referencedBy],
      references: [users.id],
      relationName: "quick_response_reference_referrer",
    }),
  }),
);

export const actionRequestReferencesRelations = relations(
  actionRequestReferences,
  ({ one }) => ({
    actionRequest: one(actionRequests, {
      fields: [actionRequestReferences.actionRequestId],
      references: [actionRequests.id],
    }),
    source: one(referenceSources, {
      fields: [actionRequestReferences.referenceSourceId],
      references: [referenceSources.id],
    }),
    attacher: one(users, {
      fields: [actionRequestReferences.attachedBy],
      references: [users.id],
      relationName: "action_request_reference_attacher",
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
