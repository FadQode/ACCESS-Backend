import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  lt,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";

import type { Database } from "../../db";
import {
  actionRequestComplaints,
  complaints,
  quickResponseSessions,
  tickets,
  users,
} from "../../db/schema";
import type { PaginationOptions } from "../../shared/utils/pagination";
import type { ResolvedReportPeriod } from "../../shared/utils/report-period.util";
import type {
  AgentActivityMetricRow,
  AgentCategoryCountRow,
  AgentCountRow,
  AgentRecentCasesResult,
  AgentResolutionTrendRow,
  AgentSummaryMetrics,
  SingleAgentReportQuery,
} from "./reports.types";

export interface AgentReportUser {
  email: string;
  id: string;
  isActive: boolean;
  name: string;
}

export interface ReportsRepository {
  findAgentById(agentId: string): Promise<AgentReportUser | null>;
  findAgents(includeInactive: boolean): Promise<AgentReportUser[]>;
  getActivityMetricsByAgent(
    period: ResolvedReportPeriod,
  ): Promise<AgentActivityMetricRow[]>;
  getEscalatedCountsByAgent(
    period: ResolvedReportPeriod,
  ): Promise<AgentCountRow[]>;
  getOpenCountsByAgent(): Promise<AgentCountRow[]>;
  getSingleAgentComplaintsByCategory(
    agentId: string,
    period: ResolvedReportPeriod,
  ): Promise<Array<Omit<AgentCategoryCountRow, "agentId">>>;
  getSingleAgentRecentCases(
    agentId: string,
    period: ResolvedReportPeriod,
    filters: Pick<SingleAgentReportQuery, "category" | "status">,
    pagination: PaginationOptions,
  ): Promise<AgentRecentCasesResult>;
  getSingleAgentResolutionTrend(
    agentId: string,
    period: ResolvedReportPeriod,
  ): Promise<AgentResolutionTrendRow[]>;
  getSingleAgentSummary(
    agentId: string,
    period: ResolvedReportPeriod,
  ): Promise<AgentSummaryMetrics>;
  getTopCategoryCountsByAgent(
    period: ResolvedReportPeriod,
  ): Promise<AgentCategoryCountRow[]>;
}

export const createReportsRepository = (db: Database): ReportsRepository => {
  const getAgentHandledAndResolved = async (
    agentId: string,
    period: ResolvedReportPeriod,
  ) => {
    const [result] = await db
      .select({
        handledCount:
          sql<number>`count(distinct ${quickResponseSessions.complaintId})`.mapWith(
            Number,
          ),
        resolvedCount:
          sql<number>`count(distinct case when ${quickResponseSessions.outcome} = 'sent_resolved' then ${quickResponseSessions.complaintId} end)`.mapWith(
            Number,
          ),
      })
      .from(quickResponseSessions)
      .where(
        and(
          eq(quickResponseSessions.agentId, agentId),
          gte(quickResponseSessions.createdAt, period.from),
          lt(quickResponseSessions.createdAt, period.toExclusive),
        ),
      );

    return {
      handledCount: result?.handledCount ?? 0,
      resolvedCount: result?.resolvedCount ?? 0,
    };
  };

  const getAgentOpenCount = async (agentId: string) => {
    const [result] = await db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(tickets)
      .where(and(eq(tickets.agentId, agentId), ne(tickets.status, "closed")));

    return result?.value ?? 0;
  };

  const getAgentEscalatedCount = async (
    agentId: string,
    period: ResolvedReportPeriod,
  ) => {
    const [result] = await db
      .select({
        value:
          sql<number>`count(distinct coalesce(${actionRequestComplaints.ticketId}, ${actionRequestComplaints.complaintId}))`.mapWith(
            Number,
          ),
      })
      .from(actionRequestComplaints)
      .where(
        and(
          eq(actionRequestComplaints.agentId, agentId),
          gte(actionRequestComplaints.linkedAt, period.from),
          lt(actionRequestComplaints.linkedAt, period.toExclusive),
        ),
      );

    return result?.value ?? 0;
  };

  return {
    async findAgentById(agentId) {
      const [agent] = await db
        .select({
          email: users.email,
          id: users.id,
          isActive: users.isActive,
          name: users.name,
        })
        .from(users)
        .where(and(eq(users.id, agentId), eq(users.role, "agent")))
        .limit(1);

      return agent ?? null;
    },

    async findAgents(includeInactive) {
      const conditions: SQL[] = [eq(users.role, "agent")];
      if (!includeInactive) conditions.push(eq(users.isActive, true));

      return db
        .select({
          email: users.email,
          id: users.id,
          isActive: users.isActive,
          name: users.name,
        })
        .from(users)
        .where(and(...conditions))
        .orderBy(asc(users.name), asc(users.email));
    },

    async getActivityMetricsByAgent(period) {
      return db
        .select({
          agentId: quickResponseSessions.agentId,
          handledCount:
            sql<number>`count(distinct ${quickResponseSessions.complaintId})`.mapWith(
              Number,
            ),
          lastActivityAt: sql<Date | null>`max(${quickResponseSessions.createdAt})`,
          resolvedCount:
            sql<number>`count(distinct case when ${quickResponseSessions.outcome} = 'sent_resolved' then ${quickResponseSessions.complaintId} end)`.mapWith(
              Number,
            ),
        })
        .from(quickResponseSessions)
        .where(
          and(
            gte(quickResponseSessions.createdAt, period.from),
            lt(quickResponseSessions.createdAt, period.toExclusive),
          ),
        )
        .groupBy(quickResponseSessions.agentId);
    },

    async getEscalatedCountsByAgent(period) {
      return db
        .select({
          agentId: sql<string>`${actionRequestComplaints.agentId}`,
          count:
            sql<number>`count(distinct coalesce(${actionRequestComplaints.ticketId}, ${actionRequestComplaints.complaintId}))`.mapWith(
              Number,
            ),
        })
        .from(actionRequestComplaints)
        .where(
          and(
            isNotNull(actionRequestComplaints.agentId),
            gte(actionRequestComplaints.linkedAt, period.from),
            lt(actionRequestComplaints.linkedAt, period.toExclusive),
          ),
        )
        .groupBy(actionRequestComplaints.agentId);
    },

    async getOpenCountsByAgent() {
      return db
        .select({
          agentId: sql<string>`${tickets.agentId}`,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(tickets)
        .where(and(isNotNull(tickets.agentId), ne(tickets.status, "closed")))
        .groupBy(tickets.agentId);
    },

    async getSingleAgentComplaintsByCategory(agentId, period) {
      return db
        .select({
          category: complaints.category,
          count:
            sql<number>`count(distinct ${quickResponseSessions.complaintId})`.mapWith(
              Number,
            ),
        })
        .from(quickResponseSessions)
        .innerJoin(
          complaints,
          eq(quickResponseSessions.complaintId, complaints.id),
        )
        .where(
          and(
            eq(quickResponseSessions.agentId, agentId),
            gte(quickResponseSessions.createdAt, period.from),
            lt(quickResponseSessions.createdAt, period.toExclusive),
          ),
        )
        .groupBy(complaints.category)
        .orderBy(complaints.category);
    },

    async getSingleAgentRecentCases(agentId, period, filters, pagination) {
      const conditions: SQL[] = [
        eq(quickResponseSessions.agentId, agentId),
        gte(quickResponseSessions.createdAt, period.from),
        lt(quickResponseSessions.createdAt, period.toExclusive),
      ];

      if (filters.category) {
        conditions.push(eq(complaints.category, filters.category));
      }

      if (filters.status) {
        conditions.push(eq(complaints.status, filters.status));
      }

      const where = and(...conditions);
      const lastResponseAt = sql<Date>`max(${quickResponseSessions.createdAt})`;
      const [items, [totalResult]] = await Promise.all([
        db
          .select({
            category: complaints.category,
            complaintId: complaints.id,
            complaintStatus: complaints.status,
            complaintText: complaints.complaintText,
            createdAt: complaints.submittedAt,
            lastResponseAt,
            referenceNo: complaints.referenceNo,
            resolvedAt: complaints.resolvedAt,
            ticketId: tickets.id,
            ticketStatus: tickets.status,
          })
          .from(quickResponseSessions)
          .innerJoin(
            complaints,
            eq(quickResponseSessions.complaintId, complaints.id),
          )
          .leftJoin(tickets, eq(tickets.complaintId, complaints.id))
          .where(where)
          .groupBy(
            complaints.id,
            complaints.referenceNo,
            complaints.complaintText,
            complaints.category,
            complaints.status,
            complaints.submittedAt,
            complaints.resolvedAt,
            tickets.id,
            tickets.status,
          )
          .orderBy(desc(lastResponseAt))
          .limit(pagination.limit)
          .offset(pagination.offset),
        db
          .select({
            value:
              sql<number>`count(distinct ${quickResponseSessions.complaintId})`.mapWith(
                Number,
              ),
          })
          .from(quickResponseSessions)
          .innerJoin(
            complaints,
            eq(quickResponseSessions.complaintId, complaints.id),
          )
          .where(where),
      ]);

      return {
        items,
        total: totalResult?.value ?? 0,
      };
    },

    async getSingleAgentResolutionTrend(agentId, period) {
      const bucket = sql<string>`to_char(date_trunc(${period.groupBy}, ${quickResponseSessions.createdAt} at time zone ${period.timezone}), 'YYYY-MM-DD')`;

      return db
        .select({
          bucket,
          handledCount:
            sql<number>`count(distinct ${quickResponseSessions.complaintId})`.mapWith(
              Number,
            ),
          resolvedCount:
            sql<number>`count(distinct case when ${quickResponseSessions.outcome} = 'sent_resolved' then ${quickResponseSessions.complaintId} end)`.mapWith(
              Number,
            ),
        })
        .from(quickResponseSessions)
        .where(
          and(
            eq(quickResponseSessions.agentId, agentId),
            gte(quickResponseSessions.createdAt, period.from),
            lt(quickResponseSessions.createdAt, period.toExclusive),
          ),
        )
        .groupBy(sql`1`)
        .orderBy(sql`1`);
    },

    async getSingleAgentSummary(agentId, period) {
      const [activity, openCount, escalatedCount] = await Promise.all([
        getAgentHandledAndResolved(agentId, period),
        getAgentOpenCount(agentId),
        getAgentEscalatedCount(agentId, period),
      ]);

      return {
        escalatedCount,
        handledCount: activity.handledCount,
        openCount,
        resolvedCount: activity.resolvedCount,
      };
    },

    async getTopCategoryCountsByAgent(period) {
      return db
        .select({
          agentId: quickResponseSessions.agentId,
          category: complaints.category,
          count:
            sql<number>`count(distinct ${quickResponseSessions.complaintId})`.mapWith(
              Number,
            ),
        })
        .from(quickResponseSessions)
        .innerJoin(
          complaints,
          eq(quickResponseSessions.complaintId, complaints.id),
        )
        .where(
          and(
            gte(quickResponseSessions.createdAt, period.from),
            lt(quickResponseSessions.createdAt, period.toExclusive),
          ),
        )
        .groupBy(quickResponseSessions.agentId, complaints.category);
    },
  };
};
