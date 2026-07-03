import { t } from "elysia";

import { complaintCategorySchema } from "../complaints/complaints.dto";

export const reportPeriodSchema = t.Union([
  t.Literal("7d"),
  t.Literal("30d"),
  t.Literal("90d"),
  t.Literal("custom"),
]);

export const reportGroupBySchema = t.Union([
  t.Literal("day"),
  t.Literal("week"),
  t.Literal("month"),
]);

export const dashboardSummaryQuerySchema = t.Object({
  from: t.Optional(t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
  groupBy: t.Optional(reportGroupBySchema),
  period: t.Optional(reportPeriodSchema),
  to: t.Optional(t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
});

export const dashboardPeriodResponseSchema = t.Object({
  from: t.String(),
  groupBy: reportGroupBySchema,
  timezone: t.Literal("Asia/Jakarta"),
  to: t.String(),
});

const countTrendItemSchema = t.Object({
  bucket: t.String(),
  resolvedCount: t.Number(),
});

export const agentDashboardSummaryResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    cards: t.Object({
      openCount: t.Number(),
      resolvedCount: t.Number(),
    }),
    period: dashboardPeriodResponseSchema,
    resolutionSummary: t.Object({
      resolvedInPeriod: t.Number(),
    }),
    resolutionTrend: t.Array(countTrendItemSchema),
  }),
});

export const managerDashboardSummaryResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    cards: t.Object({
      escalatedComplaints: t.Number(),
      resolvedComplaints: t.Number(),
      totalComplaints: t.Number(),
    }),
    complaintTrend: t.Array(
      t.Object({
        bucket: t.String(),
        escalated: t.Number(),
        incoming: t.Number(),
        resolved: t.Number(),
      }),
    ),
    complaintsByCategory: t.Array(
      t.Object({
        category: complaintCategorySchema,
        label: t.String(),
        count: t.Number(),
        percentage: t.Number(),
      }),
    ),
    period: dashboardPeriodResponseSchema,
  }),
});
