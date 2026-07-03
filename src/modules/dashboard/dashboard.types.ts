import type { Complaint } from "../../db/schema";
import type { ResolvedReportPeriod } from "../../shared/utils/report-period.util";

export interface DashboardQuery {
  from?: string;
  groupBy?: ResolvedReportPeriod["groupBy"];
  period?: "7d" | "30d" | "90d" | "custom";
  to?: string;
}

export interface DashboardPeriodResponse {
  from: string;
  groupBy: ResolvedReportPeriod["groupBy"];
  timezone: ResolvedReportPeriod["timezone"];
  to: string;
}

export interface CountByBucket {
  bucket: string;
  count: number;
}

export interface ManagerTrendBucket {
  bucket: string;
  escalated: number;
  incoming: number;
  resolved: number;
}

export interface CategoryCount {
  category: Complaint["category"];
  count: number;
}

export interface CategoryDistributionItem extends CategoryCount {
  label: string;
  percentage: number;
}

export interface AgentDashboardSummary {
  cards: {
    openCount: number;
    resolvedCount: number;
  };
  period: DashboardPeriodResponse;
  resolutionSummary: {
    resolvedInPeriod: number;
  };
  resolutionTrend: Array<{
    bucket: string;
    resolvedCount: number;
  }>;
}

export interface ManagerDashboardSummary {
  cards: {
    escalatedComplaints: number;
    resolvedComplaints: number;
    totalComplaints: number;
  };
  complaintTrend: ManagerTrendBucket[];
  complaintsByCategory: CategoryDistributionItem[];
  period: DashboardPeriodResponse;
}
