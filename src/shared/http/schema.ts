import { t } from "elysia";

export const apiErrorResponseSchema = t.Object({
  success: t.Literal(false),
  message: t.String(),
  error: t.Object({
    code: t.String(),
    details: t.Optional(t.Unknown()),
  }),
});
