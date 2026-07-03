import type { Complaint, Ticket } from "../../db/schema";
import type { ResolvedReportPeriod } from "../../shared/utils/report-period.util";

export interface ReportQuery {
  from?: string;
  groupBy?: ResolvedReportPeriod["groupBy"];
  period?: "7d" | "30d" | "90d" | "custom";
  to?: string;
}

export interface AgentsPerformanceQuery extends ReportQuery {
  includeInactive?: boolean;
}

export interface SingleAgentReportQuery extends ReportQuery {
  category?: Complaint["category"];
  limit?: number;
  page?: number;
  status?: Complaint["status"];
}

export interface ReportPeriodResponse {
  from: string;
  groupBy: ResolvedReportPeriod["groupBy"];
  timezone: ResolvedReportPeriod["timezone"];
  to: string;
}

export interface ReportAgent {
  email: string;
  id: string;
  isActive: boolean;
  name: string;
}

export interface AgentActivityMetricRow {
  agentId: string;
  handledCount: number;
  lastActivityAt: Date | string | null;
  resolvedCount: number;
}

export interface AgentCountRow {
  agentId: string;
  count: number;
}

export interface AgentCategoryCountRow {
  agentId: string;
  category: Complaint["category"];
  count: number;
}

export interface AgentSummaryMetrics {
  escalatedCount: number;
  handledCount: number;
  openCount: number;
  resolvedCount: number;
}

export interface AgentResolutionTrendRow {
  bucket: string;
  handledCount: number;
  resolvedCount: number;
}

export interface AgentRecentCaseRecord {
  category: Complaint["category"];
  complaintId: string;
  complaintStatus: Complaint["status"];
  complaintText: string;
  createdAt: Date;
  lastResponseAt: Date | string;
  referenceNo: string;
  resolvedAt: Date | null;
  ticketId: string | null;
  ticketStatus: Ticket["status"] | null;
}

export interface AgentRecentCasesResult {
  items: AgentRecentCaseRecord[];
  total: number;
}

export interface AgentsPerformanceReport {
  agents: Array<{
    agentEmail: string;
    agentId: string;
    agentName: string;
    escalatedCount: number;
    handledCount: number;
    isActive: boolean;
    lastActivityAt: string | null;
    openCount: number;
    resolvedCount: number;
    topCategory: Complaint["category"] | null;
  }>;
  period: ReportPeriodResponse;
}

export interface SingleAgentReport {
  agent: {
    email: string;
    id: string;
    name: string;
  };
  complaintsByCategory: Array<{
    category: Complaint["category"];
    count: number;
    label: string;
    percentage: number;
  }>;
  period: ReportPeriodResponse;
  recentCases: {
    items: Array<{
      category: Complaint["category"];
      complaintId: string;
      complaintStatus: Complaint["status"];
      complaintTextPreview: string;
      createdAt: string;
      lastResponseAt: string;
      referenceNo: string;
      resolvedAt: string | null;
      ticketId: string | null;
      ticketStatus: Ticket["status"] | null;
    }>;
    pagination: {
      limit: number;
      page: number;
      total: number;
      totalPages: number;
    };
  };
  resolutionTrend: Array<{
    bucket: string;
    handledCount: number;
    resolvedCount: number;
  }>;
  summary: AgentSummaryMetrics;
}
