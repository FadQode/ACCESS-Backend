import { t } from "elysia";

import { actionRequestReferenceItemSchema } from "../action-requests/action-requests.dto";
import {
  complaintCategorySchema,
  complaintStatusSchema,
} from "../complaints/complaints.dto";

export const ticketStatusSchema = t.Union([
  t.Literal("open"),
  t.Literal("hea_sent"),
  t.Literal("waiting_manager_action"),
  t.Literal("manager_action_done"),
  t.Literal("ready_to_close"),
  t.Literal("closed"),
]);

export const ticketPrioritySchema = t.Union([
  t.Literal("low"),
  t.Literal("medium"),
  t.Literal("high"),
  t.Literal("urgent"),
]);

export const ticketParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

export const ticketListQuerySchema = t.Object({
  status: t.Optional(ticketStatusSchema),
  priority: t.Optional(ticketPrioritySchema),
  agentId: t.Optional(t.String({ format: "uuid" })),
  category: t.Optional(complaintCategorySchema),
  search: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

const dateTimeSchema = t.String({ format: "date-time" });
const nullableDateTimeSchema = t.Union([dateTimeSchema, t.Null()]);
const managerActionSchema = t.Union([
  t.Object({
    actionRequestId: t.String({ format: "uuid" }),
    actionTaken: t.Union([t.String(), t.Null()]),
    closureMessage: t.Union([t.String(), t.Null()]),
  }),
  t.Null(),
]);
const ticketListItemSchema = t.Object({
  id: t.String({ format: "uuid" }),
  complaintId: t.String({ format: "uuid" }),
  agentId: t.Union([t.String({ format: "uuid" }), t.Null()]),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  category: complaintCategorySchema,
  complaintStatus: complaintStatusSchema,
  complaintText: t.String(),
  referenceNo: t.String(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  managerAction: managerActionSchema,
});

export const ticketDetailSchema = t.Composite([
  ticketListItemSchema,
  t.Object({
    heaResponse: t.Union([t.String(), t.Null()]),
    heaSentAt: nullableDateTimeSchema,
    closureMessage: t.Union([t.String(), t.Null()]),
    closureSentAt: nullableDateTimeSchema,
    agent: t.Union([
      t.Object({
        id: t.String({ format: "uuid" }),
        name: t.String(),
        email: t.String({ format: "email" }),
      }),
      t.Null(),
    ]),
  }),
]);

export const ticketListResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    items: t.Array(ticketListItemSchema),
    pagination: t.Object({
      page: t.Number(),
      limit: t.Number(),
      total: t.Number(),
      totalPages: t.Number(),
    }),
  }),
});

export const ticketDetailResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({ ticket: ticketDetailSchema }),
});

export const ticketEscalationResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    ticket: ticketDetailSchema,
    actionRequest: t.Object({
      id: t.String({ format: "uuid" }),
      referenceNo: t.String(),
      category: complaintCategorySchema,
      issueKey: t.String(),
      groupingKey: t.String(),
      clusterLabel: t.Union([t.String(), t.Null()]),
      status: t.String(),
      issueSummary: t.String(),
      raisedAt: dateTimeSchema,
      resolvedAt: nullableDateTimeSchema,
      createdAt: dateTimeSchema,
      updatedAt: dateTimeSchema,
    }),
    actionRequestReused: t.Boolean(),
  }),
});

export const ticketClosureContextResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    ticket: t.Object({
      id: t.String({ format: "uuid" }),
      status: ticketStatusSchema,
      priority: ticketPrioritySchema,
    }),
    complaint: t.Object({
      id: t.String({ format: "uuid" }),
      referenceNo: t.String(),
      category: complaintCategorySchema,
      complaintText: t.String(),
      status: complaintStatusSchema,
    }),
    actionRequest: t.Object({
      id: t.String({ format: "uuid" }),
      referenceNo: t.String(),
      clusterLabel: t.Union([t.String(), t.Null()]),
      actionTaken: t.Union([t.String(), t.Null()]),
      closureMessage: t.Union([t.String(), t.Null()]),
      status: t.String(),
    }),
    attachedReferences: t.Array(actionRequestReferenceItemSchema),
  }),
});
