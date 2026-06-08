import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema";

const percentageCheck = (
  column: { getSQL: () => unknown },
) => sql`${column} between 0 and 100`;

export const agentPerformance = pgTable(
  "agent_performance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id),
    periodMonth: integer("period_month").notNull(),
    periodYear: integer("period_year").notNull(),
    complaintsResolved: integer("complaints_resolved").notNull().default(0),
    escalationsCount: integer("escalations_count").notNull().default(0),
    avgFirstResponseMin: numeric("avg_first_response_min", {
      precision: 10,
      scale: 2,
    }),
    avgResolutionHrs: numeric("avg_resolution_hrs", {
      precision: 10,
      scale: 2,
    }),
    qualityScore: numeric("quality_score", { precision: 5, scale: 2 }),
    complianceRespondedBeforeAction: numeric(
      "compliance_responded_before_action",
      { precision: 5, scale: 2 },
    ),
    complianceReferencedIssue: numeric("compliance_referenced_issue", {
      precision: 5,
      scale: 2,
    }),
    complianceActionOnClose: numeric("compliance_action_on_close", {
      precision: 5,
      scale: 2,
    }),
    complianceFirstReplyUnder1h: numeric(
      "compliance_first_reply_under_1h",
      { precision: 5, scale: 2 },
    ),
    complianceNoSlaBreach: numeric("compliance_no_sla_breach", {
      precision: 5,
      scale: 2,
    }),
    calculatedAt: timestamp("calculated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("agent_performance_agent_period_unique").on(
      table.agentId,
      table.periodMonth,
      table.periodYear,
    ),
    check(
      "agent_performance_period_month_check",
      sql`${table.periodMonth} between 1 and 12`,
    ),
    check(
      "agent_performance_period_year_check",
      sql`${table.periodYear} between 2000 and 9999`,
    ),
    check(
      "agent_performance_complaints_resolved_check",
      sql`${table.complaintsResolved} >= 0`,
    ),
    check(
      "agent_performance_escalations_count_check",
      sql`${table.escalationsCount} >= 0`,
    ),
    check(
      "agent_performance_avg_first_response_check",
      sql`${table.avgFirstResponseMin} is null or ${table.avgFirstResponseMin} >= 0`,
    ),
    check(
      "agent_performance_avg_resolution_check",
      sql`${table.avgResolutionHrs} is null or ${table.avgResolutionHrs} >= 0`,
    ),
    check(
      "agent_performance_quality_score_check",
      sql`${table.qualityScore} is null or ${percentageCheck(table.qualityScore)}`,
    ),
    check(
      "agent_performance_responded_before_action_check",
      sql`${table.complianceRespondedBeforeAction} is null or ${percentageCheck(table.complianceRespondedBeforeAction)}`,
    ),
    check(
      "agent_performance_referenced_issue_check",
      sql`${table.complianceReferencedIssue} is null or ${percentageCheck(table.complianceReferencedIssue)}`,
    ),
    check(
      "agent_performance_action_on_close_check",
      sql`${table.complianceActionOnClose} is null or ${percentageCheck(table.complianceActionOnClose)}`,
    ),
    check(
      "agent_performance_first_reply_under_1h_check",
      sql`${table.complianceFirstReplyUnder1h} is null or ${percentageCheck(table.complianceFirstReplyUnder1h)}`,
    ),
    check(
      "agent_performance_no_sla_breach_check",
      sql`${table.complianceNoSlaBreach} is null or ${percentageCheck(table.complianceNoSlaBreach)}`,
    ),
    index("agent_performance_agent_id_idx").on(table.agentId),
  ],
);

export type AgentPerformance = typeof agentPerformance.$inferSelect;
export type NewAgentPerformance = typeof agentPerformance.$inferInsert;
