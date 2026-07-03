import { t } from "elysia";

import {
  complaintCategorySchema,
  complaintStatusSchema,
} from "../complaints/complaints.dto";
import {
  dashboardPeriodResponseSchema,
  reportGroupBySchema,
  reportPeriodSchema,
} from "../dashboard/dashboard.dto";
import { ticketStatusSchema } from "../tickets/tickets.dto";

export const agentsPerformanceQuerySchema = t.Object({
  from: t.Optional(t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
  groupBy: t.Optional(reportGroupBySchema),
  includeInactive: t.Optional(t.Boolean({ default: false })),
  period: t.Optional(reportPeriodSchema),
  to: t.Optional(t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
});

export const agentReportParamsSchema = t.Object({
  agentId: t.String({ format: "uuid" }),
});

export const singleAgentReportQuerySchema = t.Object({
  category: t.Optional(complaintCategorySchema),
  from: t.Optional(t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
  groupBy: t.Optional(reportGroupBySchema),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  period: t.Optional(reportPeriodSchema),
  status: t.Optional(complaintStatusSchema),
  to: t.Optional(t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
});

export const agentsPerformanceResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    agents: t.Array(
      t.Object({
        agentEmail: t.String({ format: "email" }),
        agentId: t.String({ format: "uuid" }),
        agentName: t.String(),
        escalatedCount: t.Number(),
        handledCount: t.Number(),
        isActive: t.Boolean(),
        lastActivityAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
        openCount: t.Number(),
        resolvedCount: t.Number(),
        topCategory: t.Union([complaintCategorySchema, t.Null()]),
      }),
    ),
    period: dashboardPeriodResponseSchema,
  }),
});

export const singleAgentReportResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    agent: t.Object({
      email: t.String({ format: "email" }),
      id: t.String({ format: "uuid" }),
      name: t.String(),
    }),
    complaintsByCategory: t.Array(
      t.Object({
        category: complaintCategorySchema,
        count: t.Number(),
        label: t.String(),
        percentage: t.Number(),
      }),
    ),
    period: dashboardPeriodResponseSchema,
    recentCases: t.Object({
      items: t.Array(
        t.Object({
          category: complaintCategorySchema,
          complaintId: t.String({ format: "uuid" }),
          complaintStatus: complaintStatusSchema,
          complaintTextPreview: t.String(),
          createdAt: t.String({ format: "date-time" }),
          lastResponseAt: t.String({ format: "date-time" }),
          referenceNo: t.String(),
          resolvedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
          ticketId: t.Union([t.String({ format: "uuid" }), t.Null()]),
          ticketStatus: t.Union([ticketStatusSchema, t.Null()]),
        }),
      ),
      pagination: t.Object({
        limit: t.Number(),
        page: t.Number(),
        total: t.Number(),
        totalPages: t.Number(),
      }),
    }),
    resolutionTrend: t.Array(
      t.Object({
        bucket: t.String(),
        handledCount: t.Number(),
        resolvedCount: t.Number(),
      }),
    ),
    summary: t.Object({
      escalatedCount: t.Number(),
      handledCount: t.Number(),
      openCount: t.Number(),
      resolvedCount: t.Number(),
    }),
  }),
});
