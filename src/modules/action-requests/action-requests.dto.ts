import { t } from "elysia";

import { complaintCategorySchema } from "../complaints/complaints.dto";

export const actionRequestStatusSchema = t.Union([
  t.Literal("open"),
  t.Literal("reviewing"),
  t.Literal("action_planned"),
  t.Literal("action_taken"),
  t.Literal("closed"),
]);

export const actionRequestParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

export const actionRequestListQuerySchema = t.Object({
  status: t.Optional(actionRequestStatusSchema),
  category: t.Optional(complaintCategorySchema),
  search: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

export const takeActionBodySchema = t.Object({
  actionTaken: t.String({ minLength: 1 }),
  closureMessage: t.String({ minLength: 1 }),
});

const dateTimeSchema = t.String({ format: "date-time" });
const nullableDateTimeSchema = t.Union([dateTimeSchema, t.Null()]);
const actionRequestListItemSchema = t.Object({
  id: t.String({ format: "uuid" }),
  referenceNo: t.String(),
  category: complaintCategorySchema,
  issueKey: t.String(),
  groupingKey: t.String(),
  clusterLabel: t.Union([t.String(), t.Null()]),
  status: actionRequestStatusSchema,
  issueSummary: t.String(),
  raisedAt: dateTimeSchema,
  resolvedAt: nullableDateTimeSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const actionRequestDetailSchema = t.Composite([
  actionRequestListItemSchema,
  t.Object({
    actionTaken: t.Union([t.String(), t.Null()]),
    closureMessage: t.Union([t.String(), t.Null()]),
    linkedComplaints: t.Array(
      t.Object({
        id: t.String({ format: "uuid" }),
        actionRequestId: t.String({ format: "uuid" }),
        complaintId: t.String({ format: "uuid" }),
        ticketId: t.Union([t.String({ format: "uuid" }), t.Null()]),
        agentId: t.Union([t.String({ format: "uuid" }), t.Null()]),
        linkedAt: dateTimeSchema,
        complaintText: t.String(),
        ticketStatus: t.Union([t.String(), t.Null()]),
      }),
    ),
  }),
]);

export const actionRequestListResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    items: t.Array(actionRequestListItemSchema),
    pagination: t.Object({
      page: t.Number(),
      limit: t.Number(),
      total: t.Number(),
      totalPages: t.Number(),
    }),
  }),
});

export const actionRequestDetailResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({ actionRequest: actionRequestDetailSchema }),
});

export const takeActionResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    actionRequest: actionRequestDetailSchema,
    updatedTickets: t.Number(),
  }),
});
