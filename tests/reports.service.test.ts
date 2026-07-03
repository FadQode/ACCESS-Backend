import { describe, expect, test } from "bun:test";

import type { AuthUser } from "../src/modules/auth/auth.types";
import type { ReportsRepository } from "../src/modules/reports/reports.repository";
import { createReportsService } from "../src/modules/reports/reports.service";

const agent: AuthUser = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "Agent",
  email: "agent@access.test",
  role: "agent",
};

const otherAgent: AuthUser = {
  id: "00000000-0000-4000-8000-000000000005",
  name: "Other Agent",
  email: "other-agent@access.test",
  role: "agent",
};

const manager: AuthUser = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Manager",
  email: "manager@access.test",
  role: "manager",
};

const now = new Date("2026-07-03T05:00:00.000Z");

describe("reports service", () => {
  test("returns active agents performance and forwards includeInactive", async () => {
    let includeInactiveSeen: boolean | null = null;
    const repository = {
      async findAgents(
        includeInactive: Parameters<ReportsRepository["findAgents"]>[0],
      ) {
        includeInactiveSeen = includeInactive;
        return [
          {
            id: agent.id,
            name: agent.name,
            email: agent.email,
            isActive: true,
          },
        ];
      },
      async getActivityMetricsByAgent() {
        return [
          {
            agentId: agent.id,
            handledCount: 5,
            resolvedCount: 3,
            lastActivityAt: now,
          },
        ];
      },
      async getOpenCountsByAgent() {
        return [{ agentId: agent.id, count: 2 }];
      },
      async getEscalatedCountsByAgent() {
        return [{ agentId: agent.id, count: 1 }];
      },
      async getTopCategoryCountsByAgent() {
        return [
          { agentId: agent.id, category: "refund", count: 2 },
          { agentId: agent.id, category: "delay", count: 4 },
        ];
      },
    } as unknown as ReportsRepository;
    const service = createReportsService(repository);

    const result = await service.getAgentsPerformance(
      { includeInactive: true, from: "2026-07-01", to: "2026-07-03" },
      manager,
    );

    expect(Boolean(includeInactiveSeen)).toBe(true);
    expect(result.agents).toEqual([
      {
        agentEmail: agent.email,
        agentId: agent.id,
        agentName: agent.name,
        escalatedCount: 1,
        handledCount: 5,
        isActive: true,
        lastActivityAt: now.toISOString(),
        openCount: 2,
        resolvedCount: 3,
        topCategory: "delay",
      },
    ]);
  });

  test("rejects agent access to all agents performance", async () => {
    const service = createReportsService({} as ReportsRepository);

    await expect(
      service.getAgentsPerformance({}, agent),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "AGENT_PERFORMANCE_REPORT_FORBIDDEN",
    });
  });

  test("returns 404 when an agent opens another agent report", async () => {
    const repository = {
      async findAgentById() {
        throw new Error("target agent should not be loaded");
      },
    } as unknown as ReportsRepository;
    const service = createReportsService(repository);

    await expect(
      service.getSingleAgentReport(otherAgent.id, {}, agent),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "AGENT_REPORT_NOT_FOUND",
    });
  });

  test("returns single agent report with pagination, filters, and zero-filled trend", async () => {
    let recentCaseFilters:
      | Parameters<ReportsRepository["getSingleAgentRecentCases"]>[2]
      | null = null;
    const repository = {
      async findAgentById(agentId: string) {
        expect(agentId).toBe(agent.id);
        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          isActive: true,
        };
      },
      async getSingleAgentSummary() {
        return {
          handledCount: 4,
          resolvedCount: 2,
          openCount: 1,
          escalatedCount: 1,
        };
      },
      async getSingleAgentResolutionTrend() {
        return [{ bucket: "2026-07-02", handledCount: 3, resolvedCount: 2 }];
      },
      async getSingleAgentComplaintsByCategory() {
        return [
          { category: "payment", count: 3 },
          { category: "delay", count: 1 },
        ];
      },
      async getSingleAgentRecentCases(
        _agentId: Parameters<
          ReportsRepository["getSingleAgentRecentCases"]
        >[0],
        _period: Parameters<
          ReportsRepository["getSingleAgentRecentCases"]
        >[1],
        filters: Parameters<
          ReportsRepository["getSingleAgentRecentCases"]
        >[2],
      ) {
        recentCaseFilters = filters;
        return {
          total: 1,
          items: [
            {
              complaintId: "10000000-0000-4000-8000-000000000001",
              referenceNo: "ACC-20260701-TEST",
              complaintText: "Saldo terpotong tapi tiket tidak muncul.".repeat(4),
              category: "payment",
              complaintStatus: "resolved",
              ticketId: "30000000-0000-4000-8000-000000000001",
              ticketStatus: "closed",
              createdAt: now,
              resolvedAt: now,
              lastResponseAt: now,
            },
          ],
        };
      },
    } as unknown as ReportsRepository;
    const service = createReportsService(repository);

    const result = await service.getSingleAgentReport(
      agent.id,
      {
        category: "payment",
        from: "2026-07-01",
        limit: 10,
        page: 2,
        status: "resolved",
        to: "2026-07-03",
      },
      manager,
    );

    expect(recentCaseFilters as unknown).toEqual({
      category: "payment",
      status: "resolved",
    });
    expect(result.summary).toEqual({
      escalatedCount: 1,
      handledCount: 4,
      openCount: 1,
      resolvedCount: 2,
    });
    expect(result.resolutionTrend).toEqual([
      { bucket: "2026-07-01", handledCount: 0, resolvedCount: 0 },
      { bucket: "2026-07-02", handledCount: 3, resolvedCount: 2 },
      { bucket: "2026-07-03", handledCount: 0, resolvedCount: 0 },
    ]);
    expect(result.complaintsByCategory).toEqual([
      { category: "payment", count: 3, label: "Pembayaran", percentage: 75 },
      { category: "delay", count: 1, label: "Keterlambatan", percentage: 25 },
    ]);
    expect(result.recentCases.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(result.recentCases.items[0]?.complaintTextPreview.length).toBeLessThanOrEqual(
      120,
    );
  });
});
