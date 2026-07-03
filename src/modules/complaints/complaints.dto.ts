import { t } from "elysia";

const nullableString = (options: Record<string, unknown> = {}) =>
  t.Union([t.String(options), t.Null()]);

export const complaintSourceSchema = t.Union([
  t.Literal("web_form"),
  t.Literal("twitter"),
  t.Literal("instagram"),
  t.Literal("facebook"),
  t.Literal("google_play"),
  t.Literal("app_store"),
  t.Literal("other"),
]);

export const complaintCategorySchema = t.Union([
  t.Literal("delay"),
  t.Literal("refund"),
  t.Literal("cancellation"),
  t.Literal("lost_item"),
  t.Literal("facility"),
  t.Literal("payment"),
  t.Literal("account"),
  t.Literal("app_error"),
  t.Literal("other"),
]);

export const complaintStatusSchema = t.Union([
  t.Literal("submitted"),
  t.Literal("waiting_action"),
  t.Literal("resolved"),
  t.Literal("closed"),
]);

export const complaintParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

export const complaintListQuerySchema = t.Object({
  status: t.Optional(complaintStatusSchema),
  category: t.Optional(complaintCategorySchema),
  source: t.Optional(complaintSourceSchema),
  search: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

export const updateComplaintBodySchema = t.Object(
  {
    source: t.Optional(complaintSourceSchema),
    sourceHandle: t.Optional(nullableString({ maxLength: 255 })),
    sourceUrl: t.Optional(nullableString({ maxLength: 2_000 })),
    complainerName: t.Optional(nullableString({ maxLength: 160 })),
    complainerContact: t.Optional(nullableString({ maxLength: 255 })),
    category: t.Optional(complaintCategorySchema),
    complaintText: t.Optional(t.String({ minLength: 10 })),
  },
  { minProperties: 1 },
);

export const updateComplaintStatusBodySchema = t.Object({
  status: complaintStatusSchema,
});

const dateTimeSchema = t.String({ format: "date-time" });
const complaintListItemSchema = t.Object({
  id: t.String({ format: "uuid" }),
  referenceNo: t.String(),
  source: complaintSourceSchema,
  sourceHandle: nullableString(),
  category: complaintCategorySchema,
  complaintText: t.String(),
  status: complaintStatusSchema,
  submittedAt: dateTimeSchema,
  resolvedAt: t.Union([dateTimeSchema, t.Null()]),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const complaintDetailSchema = t.Composite([
  complaintListItemSchema,
  t.Object({
    trackingToken: t.String(),
    sourceUrl: nullableString(),
    complainerName: nullableString(),
    complainerContact: nullableString(),
  }),
]);

export const complaintListResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    items: t.Array(complaintListItemSchema),
    pagination: t.Object({
      page: t.Number(),
      limit: t.Number(),
      total: t.Number(),
      totalPages: t.Number(),
    }),
  }),
});

export const complaintMutationResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({ complaint: complaintDetailSchema }),
});

export const complaintDetailResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    complaint: complaintDetailSchema,
    quickResponseSessions: t.Array(
      t.Object({
        id: t.String({ format: "uuid" }),
        agent: t.Object({
          id: t.String({ format: "uuid" }),
          name: t.String(),
          email: t.String({ format: "email" }),
        }),
        sourceChannel: complaintSourceSchema,
        sourceHandle: nullableString(),
        responseTone: nullableString(),
        responseTarget: t.Union([
          t.Literal("public_reply"),
          t.Literal("dm"),
          t.Literal("app_review"),
          t.Literal("internal_note"),
        ]),
        selectedHear: nullableString(),
        selectedEmpathize: nullableString(),
        selectedApologize: nullableString(),
        selectedTakeAction: nullableString(),
        finalResponse: nullableString(),
        outcome: t.Union([
          t.Literal("sent_resolved"),
          t.Literal("sent_hea_action"),
          t.Literal("saved_ticket"),
          t.Literal("escalated"),
          t.Literal("copy_only"),
        ]),
        references: t.Array(
          t.Object({
            id: t.String({ format: "uuid" }),
            referenceSourceId: t.String({ format: "uuid" }),
            selectionSource: t.String(),
            usageType: t.String(),
            snapshotText: nullableString(),
            note: nullableString(),
            createdAt: dateTimeSchema,
            referenceSource: t.Object({
              id: t.String({ format: "uuid" }),
              title: t.String(),
              sourceType: t.String(),
              category: t.Union([complaintCategorySchema, t.Null()]),
              status: t.String(),
            }),
          }),
        ),
        createdAt: dateTimeSchema,
        updatedAt: dateTimeSchema,
      }),
    ),
  }),
});
