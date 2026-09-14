import { t } from "elysia";

export const holidayCategorySchema = t.Union([
  t.Literal("lebaran"),
  t.Literal("nataru"),
  t.Literal("imlek"),
  t.Literal("other_long_holiday"),
  t.Literal("regular_holiday"),
]);

export const holidaySourceSchema = t.Union([
  t.Literal("skb_3_menteri"),
  t.Literal("manual"),
]);

const isoDateSchema = t.String({ format: "date" });

export const holidayParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

const monitoringOverrideSchema = {
  monitoringBefore: t.Optional(
    t.Union([t.Integer({ minimum: 0, maximum: 180 }), t.Null()]),
  ),
  monitoringAfter: t.Optional(
    t.Union([t.Integer({ minimum: 0, maximum: 180 }), t.Null()]),
  ),
};

export const createHolidayBodySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  date: isoDateSchema,
  category: holidayCategorySchema,
  isJointLeave: t.Optional(t.Boolean({ default: false })),
  source: t.Optional(holidaySourceSchema),
  sourceReference: t.Optional(t.Union([t.String(), t.Null()])),
  ...monitoringOverrideSchema,
});

export const updateHolidayBodySchema = t.Partial(createHolidayBodySchema);

export const holidayListQuerySchema = t.Object({
  year: t.Optional(t.Numeric({ minimum: 1900, maximum: 2999 })),
  category: t.Optional(holidayCategorySchema),
  source: t.Optional(holidaySourceSchema),
});

export const calendarQuerySchema = t.Object({
  start: isoDateSchema,
  end: isoDateSchema,
});

export const holidaySyncBodySchema = t.Object({
  year: t.Integer({ minimum: 1900, maximum: 2999 }),
});

export const holidaySyncResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    year: t.Integer(),
    fetched: t.Integer({ minimum: 0 }),
    created: t.Integer({ minimum: 0 }),
    updated: t.Integer({ minimum: 0 }),
    unchanged: t.Integer({ minimum: 0 }),
    failed: t.Integer({ minimum: 0 }),
  }),
});

const holidayItemSchema = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  date: isoDateSchema,
  category: holidayCategorySchema,
  isJointLeave: t.Boolean(),
  source: holidaySourceSchema,
  sourceReference: t.Union([t.String(), t.Null()]),
  monitoringBefore: t.Union([t.Integer(), t.Null()]),
  monitoringAfter: t.Union([t.Integer(), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

export const holidayResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({ holiday: holidayItemSchema }),
});

export const holidayListResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({ holidays: t.Array(holidayItemSchema) }),
});

export const holidayDeleteResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({ deleted: t.Boolean() }),
});

const calendarDayHolidaySchema = t.Object({
  name: t.String(),
  date: isoDateSchema,
  category: holidayCategorySchema,
  isJointLeave: t.Boolean(),
});

const calendarDaySchema = t.Object({
  date: isoDateSchema,
  isWeekend: t.Boolean(),
  isHoliday: t.Boolean(),
  isJointLeave: t.Boolean(),
  isBridgeDay: t.Boolean(),
  isMonitoring: t.Boolean(),
  relativeDay: t.Union([t.Integer(), t.Null()]),
  holiday: t.Union([calendarDayHolidaySchema, t.Null()]),
});

const longWeekendSchema = t.Object({
  type: t.Literal("long_weekend"),
  start: isoDateSchema,
  end: isoDateSchema,
  duration: t.Integer({ minimum: 2 }),
});

export const calendarResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    period: t.Object({ start: isoDateSchema, end: isoDateSchema }),
    days: t.Array(calendarDaySchema),
    longWeekends: t.Array(longWeekendSchema),
  }),
});

const monitoringRuleSchema = t.Object({
  before: t.Integer({ minimum: 0 }),
  after: t.Integer({ minimum: 0 }),
});

const monitoringPeriodSchema = t.Composite([
  monitoringRuleSchema,
  t.Object({
    start: isoDateSchema,
    end: isoDateSchema,
    isOverride: t.Boolean(),
  }),
]);

const overviewHolidaySchema = t.Object({
  name: t.String(),
  date: isoDateSchema,
  category: holidayCategorySchema,
});

export const holidayOverviewResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    status: t.Union([
      t.Literal("normal"),
      t.Literal("monitoring"),
      t.Literal("holiday"),
    ]),
    referenceDate: isoDateSchema,
    relativeDay: t.Union([t.Integer(), t.Null()]),
    currentHoliday: t.Union([overviewHolidaySchema, t.Null()]),
    monitoringPeriod: t.Union([monitoringPeriodSchema, t.Null()]),
    next: t.Union([
      t.Object({
        holiday: overviewHolidaySchema,
        monitoring: monitoringPeriodSchema,
      }),
      t.Null(),
    ]),
    rules: t.Object({
      lebaran: monitoringRuleSchema,
      nataru: monitoringRuleSchema,
      imlek: monitoringRuleSchema,
      other_long_holiday: monitoringRuleSchema,
      regular_holiday: monitoringRuleSchema,
    }),
  }),
});
