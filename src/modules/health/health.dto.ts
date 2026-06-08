import { t } from "elysia";

export const healthDataSchema = t.Object({
  service: t.String(),
  status: t.Literal("ok"),
  timestamp: t.String({ format: "date-time" }),
  version: t.String(),
});
