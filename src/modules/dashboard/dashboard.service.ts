import { ForbiddenError } from "../../shared/errors";
import { buildReportBuckets } from "../../shared/utils/report-bucket.util";
import { getCategoryLabel } from "../../shared/utils/category-label.util";
import {
  resolveReportPeriod,
  type ResolvedReportPeriod,
} from "../../shared/utils/report-period.util";
import type { AuthUser } from "../auth/auth.types";
import type { DashboardRepository } from "./dashboard.repository";
import type {
  AgentDashboardSummary,
  CategoryDistributionItem,
  CategoryCount,
  CountByBucket,
  DashboardPeriodResponse,
  DashboardQuery,
  ManagerDashboardSummary,
} from "./dashboard.types";

const toPeriodResponse = (
  period: ResolvedReportPeriod,
): DashboardPeriodResponse => ({
  from: period.fromDate,
  groupBy: period.groupBy,
  timezone: period.timezone,
  to: period.toDate,
});

const countMap = (rows: CountByBucket[]) =>
  new Map(rows.map((row) => [row.bucket, row.count]));

const percentage = (count: number, total: number): number =>
  total === 0 ? 0 : Math.round((count / total) * 100);

const toCategoryDistribution = (
  rows: CategoryCount[],
): CategoryDistributionItem[] => {
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return rows.map((row) => ({
    ...row,
    label: getCategoryLabel(row.category),
    percentage: percentage(row.count, total),
  }));
};

export interface DashboardService {
  getAgentSummary(
    query: DashboardQuery,
    currentUser: AuthUser,
  ): Promise<AgentDashboardSummary>;
  getManagerSummary(
    query: DashboardQuery,
    currentUser: AuthUser,
  ): Promise<ManagerDashboardSummary>;
}

export const createDashboardService = (
  repository: DashboardRepository,
): DashboardService => ({
  async getAgentSummary(query, currentUser) {
    if (currentUser.role !== "agent") {
      throw new ForbiddenError(
        "Only agents can access the personal dashboard",
        "AGENT_DASHBOARD_FORBIDDEN",
      );
    }

    const period = resolveReportPeriod(query, "7d");
    const [resolvedCount, openCount, trendRows] = await Promise.all([
      repository.getAgentResolvedCount(currentUser.id, period),
      repository.getAgentOpenCount(currentUser.id),
      repository.getAgentResolutionTrend(currentUser.id, period),
    ]);
    const trendCounts = countMap(trendRows);

    return {
      cards: {
        openCount,
        resolvedCount,
      },
      period: toPeriodResponse(period),
      resolutionSummary: {
        resolvedInPeriod: resolvedCount,
      },
      resolutionTrend: buildReportBuckets(period).map((bucket) => ({
        bucket,
        resolvedCount: trendCounts.get(bucket) ?? 0,
      })),
    };
  },

  async getManagerSummary(query, currentUser) {
    if (currentUser.role !== "manager" && currentUser.role !== "admin") {
      throw new ForbiddenError(
        "Only managers can access the manager dashboard",
        "MANAGER_DASHBOARD_FORBIDDEN",
      );
    }

    const period = resolveReportPeriod(query, "30d");
    const [
      totalComplaints,
      resolvedComplaints,
      escalatedComplaints,
      incomingTrend,
      resolvedTrend,
      escalatedTrend,
      categoryRows,
    ] = await Promise.all([
      repository.getManagerTotalComplaints(period),
      repository.getManagerResolvedComplaints(period),
      repository.getManagerEscalatedComplaints(period),
      repository.getManagerIncomingTrend(period),
      repository.getManagerResolvedTrend(period),
      repository.getManagerEscalatedTrend(period),
      repository.getManagerComplaintsByCategory(period),
    ]);
    const incomingCounts = countMap(incomingTrend);
    const resolvedCounts = countMap(resolvedTrend);
    const escalatedCounts = countMap(escalatedTrend);

    return {
      cards: {
        escalatedComplaints,
        resolvedComplaints,
        totalComplaints,
      },
      complaintTrend: buildReportBuckets(period).map((bucket) => ({
        bucket,
        escalated: escalatedCounts.get(bucket) ?? 0,
        incoming: incomingCounts.get(bucket) ?? 0,
        resolved: resolvedCounts.get(bucket) ?? 0,
      })),
      complaintsByCategory: toCategoryDistribution(categoryRows),
      period: toPeriodResponse(period),
    };
  },
});
