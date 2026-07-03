import { ForbiddenError, NotFoundError } from "../../shared/errors";
import { normalizePagination } from "../../shared/utils/pagination";
import { buildReportBuckets } from "../../shared/utils/report-bucket.util";
import { getCategoryLabel } from "../../shared/utils/category-label.util";
import {
  resolveReportPeriod,
  type ResolvedReportPeriod,
} from "../../shared/utils/report-period.util";
import type { AuthUser } from "../auth/auth.types";
import type { ReportsRepository } from "./reports.repository";
import type {
  AgentsPerformanceQuery,
  AgentsPerformanceReport,
  AgentCategoryCountRow,
  AgentCountRow,
  AgentResolutionTrendRow,
  ReportPeriodResponse,
  SingleAgentReport,
  SingleAgentReportQuery,
} from "./reports.types";

const iso = (date: Date | string | null): string | null => {
  if (!date) return null;
  return (date instanceof Date ? date : new Date(date)).toISOString();
};

const toPeriodResponse = (
  period: ResolvedReportPeriod,
): ReportPeriodResponse => ({
  from: period.fromDate,
  groupBy: period.groupBy,
  timezone: period.timezone,
  to: period.toDate,
});

const countMap = (rows: AgentCountRow[]) =>
  new Map(rows.map((row) => [row.agentId, row.count]));

const percentage = (count: number, total: number): number =>
  total === 0 ? 0 : Math.round((count / total) * 100);

const previewText = (value: string): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 120
    ? `${normalized.slice(0, 117)}...`
    : normalized;
};

const topCategoryMap = (rows: AgentCategoryCountRow[]) => {
  const result = new Map<string, AgentCategoryCountRow>();

  for (const row of rows) {
    const current = result.get(row.agentId);
    if (!current || row.count > current.count) {
      result.set(row.agentId, row);
    }
  }

  return result;
};

const trendMap = (rows: AgentResolutionTrendRow[]) =>
  new Map(rows.map((row) => [row.bucket, row]));

export interface ReportsService {
  getAgentsPerformance(
    query: AgentsPerformanceQuery,
    currentUser: AuthUser,
  ): Promise<AgentsPerformanceReport>;
  getSingleAgentReport(
    agentId: string,
    query: SingleAgentReportQuery,
    currentUser: AuthUser,
  ): Promise<SingleAgentReport>;
}

export const createReportsService = (
  repository: ReportsRepository,
): ReportsService => ({
  async getAgentsPerformance(query, currentUser) {
    if (currentUser.role !== "manager" && currentUser.role !== "admin") {
      throw new ForbiddenError(
        "Only managers can access agent performance reports",
        "AGENT_PERFORMANCE_REPORT_FORBIDDEN",
      );
    }

    const period = resolveReportPeriod(query, "30d");
    const [
      agents,
      activityRows,
      openRows,
      escalatedRows,
      categoryRows,
    ] = await Promise.all([
      repository.findAgents(query.includeInactive ?? false),
      repository.getActivityMetricsByAgent(period),
      repository.getOpenCountsByAgent(),
      repository.getEscalatedCountsByAgent(period),
      repository.getTopCategoryCountsByAgent(period),
    ]);
    const activityByAgent = new Map(
      activityRows.map((row) => [row.agentId, row]),
    );
    const openByAgent = countMap(openRows);
    const escalatedByAgent = countMap(escalatedRows);
    const topByAgent = topCategoryMap(categoryRows);

    return {
      agents: agents.map((agent) => {
        const activity = activityByAgent.get(agent.id);

        return {
          agentEmail: agent.email,
          agentId: agent.id,
          agentName: agent.name,
          escalatedCount: escalatedByAgent.get(agent.id) ?? 0,
          handledCount: activity?.handledCount ?? 0,
          isActive: agent.isActive,
          lastActivityAt: iso(activity?.lastActivityAt ?? null),
          openCount: openByAgent.get(agent.id) ?? 0,
          resolvedCount: activity?.resolvedCount ?? 0,
          topCategory: topByAgent.get(agent.id)?.category ?? null,
        };
      }),
      period: toPeriodResponse(period),
    };
  },

  async getSingleAgentReport(agentId, query, currentUser) {
    if (currentUser.role === "agent" && currentUser.id !== agentId) {
      throw new NotFoundError("Agent report not found", "AGENT_REPORT_NOT_FOUND");
    }

    if (!["agent", "manager", "admin"].includes(currentUser.role)) {
      throw new ForbiddenError(
        "You cannot access agent reports",
        "AGENT_REPORT_FORBIDDEN",
      );
    }

    const [agent, period] = await Promise.all([
      repository.findAgentById(agentId),
      Promise.resolve(resolveReportPeriod(query, "30d")),
    ]);

    if (!agent) {
      throw new NotFoundError("Agent report not found", "AGENT_REPORT_NOT_FOUND");
    }

    const pagination = normalizePagination({
      limit: query.limit ?? 20,
      page: query.page ?? 1,
    });
    const [summary, trendRows, categoryRows, recentCases] = await Promise.all([
      repository.getSingleAgentSummary(agentId, period),
      repository.getSingleAgentResolutionTrend(agentId, period),
      repository.getSingleAgentComplaintsByCategory(agentId, period),
      repository.getSingleAgentRecentCases(
        agentId,
        period,
        {
          category: query.category,
          status: query.status,
        },
        pagination,
      ),
    ]);
    const trends = trendMap(trendRows);
    const categoryTotal = categoryRows.reduce(
      (sum, row) => sum + row.count,
      0,
    );

    return {
      agent: {
        email: agent.email,
        id: agent.id,
        name: agent.name,
      },
      complaintsByCategory: categoryRows.map((row) => ({
        category: row.category,
        count: row.count,
        label: getCategoryLabel(row.category),
        percentage: percentage(row.count, categoryTotal),
      })),
      period: toPeriodResponse(period),
      recentCases: {
        items: recentCases.items.map((item) => ({
          category: item.category,
          complaintId: item.complaintId,
          complaintStatus: item.complaintStatus,
          complaintTextPreview: previewText(item.complaintText),
          createdAt: item.createdAt.toISOString(),
          lastResponseAt: iso(item.lastResponseAt) ?? "",
          referenceNo: item.referenceNo,
          resolvedAt: iso(item.resolvedAt),
          ticketId: item.ticketId,
          ticketStatus: item.ticketStatus,
        })),
        pagination: {
          limit: pagination.limit,
          page: pagination.page,
          total: recentCases.total,
          totalPages: Math.ceil(recentCases.total / pagination.limit),
        },
      },
      resolutionTrend: buildReportBuckets(period).map((bucket) => {
        const row = trends.get(bucket);
        return {
          bucket,
          handledCount: row?.handledCount ?? 0,
          resolvedCount: row?.resolvedCount ?? 0,
        };
      }),
      summary,
    };
  },
});
