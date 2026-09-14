import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const holidayCategoryEnum = pgEnum("holiday_category", [
  "lebaran",
  "nataru",
  "imlek",
  "other_long_holiday",
  "regular_holiday",
]);

export const holidaySourceEnum = pgEnum("holiday_source", [
  "skb_3_menteri",
  "manual",
]);

export const holidays = pgTable(
  "holidays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    date: date("date", { mode: "string" }).notNull(),
    category: holidayCategoryEnum("category").notNull(),
    isJointLeave: boolean("is_joint_leave").notNull().default(false),
    source: holidaySourceEnum("source").notNull().default("manual"),
    sourceReference: text("source_reference"),
    monitoringBefore: integer("monitoring_before"),
    monitoringAfter: integer("monitoring_after"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("holidays_date_source_unique").on(table.date, table.source),
    index("holidays_date_idx").on(table.date),
  ],
);

export type Holiday = typeof holidays.$inferSelect;
export type NewHoliday = typeof holidays.$inferInsert;
