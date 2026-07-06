import { t } from "elysia";

import { complaintCategorySchema } from "../complaints/complaints.dto";
import { responseTargetSchema } from "./quick-responses.dto";

const suggestionArraySchema = t.Array(t.String(), {
  minItems: 3,
  maxItems: 3,
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
  }),
});
