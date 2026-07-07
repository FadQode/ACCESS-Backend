import { t } from "elysia";

import { complaintCategorySchema } from "../complaints/complaints.dto";
import { responseTargetSchema } from "./quick-responses.dto";

const suggestionArraySchema = t.Array(t.String(), {
  minItems: 3,
  maxItems: 3,
});

const relevantReferenceSchema = t.Object({
  id: t.String(),
  title: t.String(),
  category: t.Union([complaintCategorySchema, t.Null()]),
  sourceType: t.String(),
  snippet: t.String(),
  fileName: t.Union([t.String(), t.Null()]),
});

const similarResolvedCaseSchema = t.Object({
  category: complaintCategorySchema,
  complaintTextPreview: t.String(),
  finalResponsePreview: t.String(),
  resolvedAt: t.Union([t.String(), t.Null()]),
});

export const quickResponsePreviewBodySchema = t.Object({
  complaintText: t.String({ minLength: 5, maxLength: 20_000 }),
  category: t.Optional(complaintCategorySchema),
  responseTone: t.Optional(t.Union([t.String({ maxLength: 80 }), t.Null()])),
  responseTarget: t.Optional(responseTargetSchema),
});

export const quickResponsePreviewResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    suggestionSource: t.Union([t.Literal("ai"), t.Literal("fallback")]),
    suggestions: t.Object({
      hear: suggestionArraySchema,
      empathize: suggestionArraySchema,
      apologize: suggestionArraySchema,
      takeAction: suggestionArraySchema,
    }),
    relevantReferences: t.Array(relevantReferenceSchema),
    similarResolvedCases: t.Array(similarResolvedCaseSchema),
  }),
});
