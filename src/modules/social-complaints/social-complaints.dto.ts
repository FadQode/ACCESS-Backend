import { t } from "elysia";

export const socialComplaintSourceSchema = t.Union([
  t.Literal("google_play"),
  t.Literal("facebook"),
  t.Literal("x"),
]);

export const socialComplaintListQuerySchema = t.Object({
  source: t.Optional(socialComplaintSourceSchema),
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

export const socialComplaintSyncBodySchema = t.Object({
  source: socialComplaintSourceSchema,
});

export const socialComplaintSyncResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    source: socialComplaintSourceSchema,
    fetched: t.Integer({ minimum: 0 }),
    created: t.Integer({ minimum: 0 }),
    unchanged: t.Integer({ minimum: 0 }),
    failed: t.Integer({ minimum: 0 }),
  }),
});

export const socialComplaintItemSchema = t.Object({
  id: t.String({ format: "uuid" }),
  source: socialComplaintSourceSchema,
  sourceReference: t.String(),
  content: t.String(),
  author: t.Union([t.String(), t.Null()]),
  sourceUrl: t.Union([t.String(), t.Null()]),
  publishedAt: t.String({ format: "date-time" }),
  metadata: t.Union([t.Record(t.String(), t.Unknown()), t.Null()]),
  fetchedAt: t.String({ format: "date-time" }),
  createdAt: t.String({ format: "date-time" }),
});

export const socialComplaintListResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    items: t.Array(socialComplaintItemSchema),
    pagination: t.Object({
      page: t.Number(),
      limit: t.Number(),
      total: t.Number(),
      totalPages: t.Number(),
    }),
  }),
});
