import { t } from "elysia";

import {
  complaintCategorySchema,
  complaintSourceSchema,
  complaintStatusSchema,
} from "../complaints/complaints.dto";

const optionalNullableString = (options: Record<string, unknown> = {}) =>
  t.Optional(t.Union([t.String(options), t.Null()]));

export const stableQuickResponseOutcomeSchema = t.Union([
  t.Literal("sent_resolved"),
  t.Literal("sent_hea_action"),
  t.Literal("copy_only"),
]);

export const responseTargetSchema = t.Union([
  t.Literal("public_reply"),
  t.Literal("dm"),
  t.Literal("app_review"),
  t.Literal("internal_note"),
]);

export const saveQuickResponseBodySchema = t.Object({
  complaint: t.Object({
    complaintText: t.String({ minLength: 10 }),
    source: t.Optional(complaintSourceSchema),
    sourceHandle: optionalNullableString({ maxLength: 255 }),
    sourceUrl: optionalNullableString({ maxLength: 2_000 }),
    complainerName: optionalNullableString({ maxLength: 160 }),
    complainerContact: optionalNullableString({ maxLength: 255 }),
    category: complaintCategorySchema,
  }),
  response: t.Object({
    responseTarget: responseTargetSchema,
    responseTone: optionalNullableString({ maxLength: 80 }),
    selectedHear: optionalNullableString(),
    selectedEmpathize: optionalNullableString(),
    selectedApologize: optionalNullableString(),
    selectedTakeAction: optionalNullableString(),
    finalResponse: optionalNullableString(),
    outcome: stableQuickResponseOutcomeSchema,
  }),
});

export const saveComplaintQuickResponseBodySchema = t.Composite([
  saveQuickResponseBodySchema.properties.response,
  t.Object({
    ticketId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
  }),
]);

const dateTimeSchema = t.String({ format: "date-time" });
const ticketSummarySchema = t.Union([
  t.Object({
    id: t.String({ format: "uuid" }),
    status: t.String(),
  }),
  t.Null(),
]);

export const saveQuickResponseResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    complaint: t.Object({
      id: t.String({ format: "uuid" }),
      referenceNo: t.String(),
      status: complaintStatusSchema,
      category: complaintCategorySchema,
      complaintText: t.String(),
      submittedAt: dateTimeSchema,
      resolvedAt: t.Union([dateTimeSchema, t.Null()]),
    }),
    quickResponseSession: t.Object({
      id: t.String({ format: "uuid" }),
      outcome: stableQuickResponseOutcomeSchema,
      finalResponse: t.Union([t.String(), t.Null()]),
      createdAt: dateTimeSchema,
    }),
    ticket: ticketSummarySchema,
    requiresFollowUp: t.Boolean(),
  }),
});

export const saveComplaintQuickResponseResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    quickResponseSession: t.Object({
      id: t.String({ format: "uuid" }),
      outcome: stableQuickResponseOutcomeSchema,
      finalResponse: t.Union([t.String(), t.Null()]),
      createdAt: dateTimeSchema,
    }),
    ticket: ticketSummarySchema,
    complaint: t.Object({
      id: t.String({ format: "uuid" }),
      status: complaintStatusSchema,
      resolvedAt: t.Union([dateTimeSchema, t.Null()]),
    }),
  }),
});
