import {
  and,
  eq,
  gte,
  isNotNull,
  lt,
  ne,
  sql,
} from "drizzle-orm";

import type { Database } from "../../db";
import {
  actionRequestComplaints,
  complaints,
  quickResponseSessions,
  tickets,
} from "../../db/schema";
import type { ResolvedReportPeriod } from "../../shared/utils/report-period.util";
import type { CategoryCount, CountByBucket } from "./dashboard.types";

export interface DashboardRepository {
  getAgentOpenCount(agentId: string): Promise<number>;
  getAgentResolutionTrend(
    agentId: string,
    period: ResolvedReportPeriod,
  ): Promise<CountByBucket[]>;
  getAgentResolvedCount(
    agentId: string,
    period: ResolvedReportPeriod,
  ): Promise<number>;
  getManagerComplaintsByCategory(
    period: ResolvedReportPeriod,
  ): Promise<CategoryCount[]>;
  getManagerEscalatedComplaints(
    period: ResolvedReportPeriod,
  ): Promise<number>;
  getManagerEscalatedTrend(
    period: ResolvedReportPeriod,
  ): Promise<CountByBucket[]>;
  getManagerIncomingTrend(
    period: ResolvedReportPeriod,
  ): Promise<CountByBucket[]>;
  getManagerResolvedComplaints(
    period: ResolvedReportPeriod,
  ): Promise<number>;
  getManagerResolvedTrend(
    period: ResolvedReportPeriod,
  ): Promise<CountByBucket[]>;
  getManagerTotalComplaints(period: ResolvedReportPeriod): Promise<number>;
}

export const createDashboardRepository = (
  db: Database,
): DashboardRepository => ({
  async getAgentOpenCount(agentId) {
    const [result] = await db
      .select({
        value: sql<number>`count(*)`.mapWith(Number),
      })
      .from(tickets)
      .where(and(eq(tickets.agentId, agentId), ne(tickets.status, "closed")));

    return result?.value ?? 0;
  },

  async getAgentResolutionTrend(agentId, period) {
    const bucket = sql<string>`to_char(date_trunc(${period.groupBy}, ${quickResponseSessions.createdAt} at time zone ${period.timezone}), 'YYYY-MM-DD')`;

    return db
      .select({
        bucket,
        count:
          sql<number>`count(distinct ${quickResponseSessions.complaintId})`.mapWith(
            Number,
          ),
      })
      .from(quickResponseSessions)
      .where(
        and(
          eq(quickResponseSessions.agentId, agentId),
          eq(quickResponseSessions.outcome, "sent_resolved"),
          gte(quickResponseSessions.createdAt, period.from),
          lt(quickResponseSessions.createdAt, period.toExclusive),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);
  },

  async getAgentResolvedCount(agentId, period) {
    const [result] = await db
      .select({
        value:
          sql<number>`count(distinct ${quickResponseSessions.complaintId})`.mapWith(
            Number,
          ),
      })
      .from(quickResponseSessions)
      .where(
        and(
          eq(quickResponseSessions.agentId, agentId),
          eq(quickResponseSessions.outcome, "sent_resolved"),
          gte(quickResponseSessions.createdAt, period.from),
          lt(quickResponseSessions.createdAt, period.toExclusive),
        ),
      );

    return result?.value ?? 0;
  },

  async getManagerComplaintsByCategory(period) {
    return db
      .select({
        category: complaints.category,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(complaints)
      .where(
        and(
          gte(complaints.submittedAt, period.from),
          lt(complaints.submittedAt, period.toExclusive),
        ),
      )
      .groupBy(complaints.category)
      .orderBy(complaints.category);
  },

  async getManagerEscalatedComplaints(period) {
    const [result] = await db
      .select({
        value:
          sql<number>`count(distinct ${actionRequestComplaints.complaintId})`.mapWith(
            Number,
          ),
      })
      .from(actionRequestComplaints)
      .where(
        and(
          gte(actionRequestComplaints.linkedAt, period.from),
          lt(actionRequestComplaints.linkedAt, period.toExclusive),
        ),
      );

    return result?.value ?? 0;
  },

  async getManagerEscalatedTrend(period) {
    const bucket = sql<string>`to_char(date_trunc(${period.groupBy}, ${actionRequestComplaints.linkedAt} at time zone ${period.timezone}), 'YYYY-MM-DD')`;

    return db
      .select({
        bucket,
        count:
          sql<number>`count(distinct ${actionRequestComplaints.complaintId})`.mapWith(
            Number,
          ),
      })
      .from(actionRequestComplaints)
      .where(
        and(
          gte(actionRequestComplaints.linkedAt, period.from),
          lt(actionRequestComplaints.linkedAt, period.toExclusive),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);
  },

  async getManagerIncomingTrend(period) {
    const bucket = sql<string>`to_char(date_trunc(${period.groupBy}, ${complaints.submittedAt} at time zone ${period.timezone}), 'YYYY-MM-DD')`;

    return db
      .select({
        bucket,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(complaints)
      .where(
        and(
          gte(complaints.submittedAt, period.from),
          lt(complaints.submittedAt, period.toExclusive),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);
  },

  async getManagerResolvedComplaints(period) {
    const [result] = await db
      .select({
        value: sql<number>`count(*)`.mapWith(Number),
      })
      .from(complaints)
      .where(
        and(
          isNotNull(complaints.resolvedAt),
          gte(complaints.resolvedAt, period.from),
          lt(complaints.resolvedAt, period.toExclusive),
        ),
      );

    return result?.value ?? 0;
  },

  async getManagerResolvedTrend(period) {
    const bucket = sql<string>`to_char(date_trunc(${period.groupBy}, ${complaints.resolvedAt} at time zone ${period.timezone}), 'YYYY-MM-DD')`;

    return db
      .select({
        bucket,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(complaints)
      .where(
        and(
          isNotNull(complaints.resolvedAt),
          gte(complaints.resolvedAt, period.from),
          lt(complaints.resolvedAt, period.toExclusive),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);
  },

  async getManagerTotalComplaints(period) {
    const [result] = await db
      .select({
        value: sql<number>`count(*)`.mapWith(Number),
      })
      .from(complaints)
      .where(
        and(
          gte(complaints.submittedAt, period.from),
          lt(complaints.submittedAt, period.toExclusive),
        ),
      );

    return result?.value ?? 0;
  },
});
