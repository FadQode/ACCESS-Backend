import { t } from "elysia";

import { complaintCategorySchema } from "../complaints/complaints.dto";

const nullableString = (options: Record<string, unknown> = {}) =>
  t.Union([t.String(options), t.Null()]);

const nullableNumber = () => t.Union([t.Number(), t.Null()]);

export const referenceSourceTypeSchema = t.Union([
  t.Literal("sop"),
  t.Literal("faq"),
  t.Literal("policy"),
  t.Literal("guide"),
  t.Literal("template"),
  t.Literal("known_issue"),
  t.Literal("external_link"),
  t.Literal("uploaded_file"),
  t.Literal("previous_action"),
  t.Literal("internal_note"),
]);

const nonFileReferenceSourceTypeSchema = t.Union([
  t.Literal("sop"),
  t.Literal("faq"),
  t.Literal("policy"),
  t.Literal("guide"),
  t.Literal("template"),
  t.Literal("known_issue"),
  t.Literal("external_link"),
  t.Literal("previous_action"),
  t.Literal("internal_note"),
]);

export const referenceStatusSchema = t.Union([
  t.Literal("active"),
  t.Literal("draft"),
  t.Literal("archived"),
]);

export const referenceParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

const tagArraySchema = t.Array(t.String({ minLength: 1, maxLength: 100 }), {
  maxItems: 30,
});

export const createReferenceBodySchema = t.Object({
  sourceType: nonFileReferenceSourceTypeSchema,
  title: t.String({ minLength: 1, maxLength: 255 }),
  category: t.Optional(t.Union([complaintCategorySchema, t.Null()])),
  content: t.Optional(nullableString()),
  url: t.Optional(nullableString({ maxLength: 2_000 })),
  tags: t.Optional(tagArraySchema),
  status: t.Optional(referenceStatusSchema),
  version: t.Optional(t.String({ minLength: 1, maxLength: 32 })),
  metadata: t.Optional(t.Union([t.Record(t.String(), t.Unknown()), t.Null()])),
});

export const updateReferenceBodySchema = t.Object(
  {
    title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
    category: t.Optional(t.Union([complaintCategorySchema, t.Null()])),
    content: t.Optional(nullableString()),
    url: t.Optional(nullableString({ maxLength: 2_000 })),
    tags: t.Optional(tagArraySchema),
    status: t.Optional(referenceStatusSchema),
    version: t.Optional(t.String({ minLength: 1, maxLength: 32 })),
    metadata: t.Optional(t.Union([t.Record(t.String(), t.Unknown()), t.Null()])),
  },
  { minProperties: 1 },
);

export const listReferencesQuerySchema = t.Object({
  query: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  category: t.Optional(complaintCategorySchema),
  sourceType: t.Optional(referenceSourceTypeSchema),
  tag: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  status: t.Optional(referenceStatusSchema),
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

export const createTagBodySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
});

export const uploadReferenceBodySchema = t.Object({
  file: t.File(),
  title: t.String({ minLength: 1, maxLength: 255 }),
  category: t.Optional(t.Union([complaintCategorySchema, t.Null()])),
  content: t.Optional(nullableString()),
  tags: t.Optional(t.Union([tagArraySchema, t.String()])),
  status: t.Optional(referenceStatusSchema),
  version: t.Optional(t.String({ minLength: 1, maxLength: 32 })),
  metadata: t.Optional(t.Union([t.Record(t.String(), t.Unknown()), t.Null()])),
});

const dateTimeSchema = t.String({ format: "date-time" });

export const referenceListItemSchema = t.Object({
  id: t.String({ format: "uuid" }),
  sourceType: referenceSourceTypeSchema,
  title: t.String(),
  category: t.Union([complaintCategorySchema, t.Null()]),
  content: t.Union([t.String(), t.Null()]),
  url: t.Union([t.String(), t.Null()]),
  fileUrl: t.Union([t.String(), t.Null()]),
  storageProvider: t.Union([t.String(), t.Null()]),
  storageBucket: t.Union([t.String(), t.Null()]),
  storageKey: t.Union([t.String(), t.Null()]),
  fileName: t.Union([t.String(), t.Null()]),
  fileMimeType: t.Union([t.String(), t.Null()]),
  fileSize: nullableNumber(),
  status: referenceStatusSchema,
  version: t.String(),
  searchText: t.Union([t.String(), t.Null()]),
  metadata: t.Union([t.Record(t.String(), t.Unknown()), t.Null()]),
  tags: t.Array(t.String()),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const referenceDetailSchema = t.Composite([
  referenceListItemSchema,
  t.Object({
    createdBy: t.String({ format: "uuid" }),
  }),
]);

const referenceTagSchema = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  createdAt: dateTimeSchema,
});

export const referenceListResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    items: t.Array(referenceListItemSchema),
    pagination: t.Object({
      page: t.Number(),
      limit: t.Number(),
      total: t.Number(),
      totalPages: t.Number(),
    }),
  }),
});

export const referenceMutationResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({ reference: referenceDetailSchema }),
});

export const referenceDetailResponseSchema = referenceMutationResponseSchema;

export const referenceFileUrlResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    signedUrl: t.String(),
    expiresIn: t.Number(),
  }),
});

export const referenceTagsResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    tags: t.Array(referenceTagSchema),
  }),
});

export const referenceTagMutationResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    tag: referenceTagSchema,
  }),
});
