import { describe, expect, test } from "bun:test";

import type { AuthUser } from "../src/modules/auth/auth.types";
import type { DashboardRepository } from "../src/modules/dashboard/dashboard.repository";
import { createDashboardService } from "../src/modules/dashboard/dashboard.service";

const agent: AuthUser = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "Agent",
  email: "agent@access.test",
  role: "agent",
};

const manager: AuthUser = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Manager",
  email: "manager@access.test",
  role: "manager",
};

describe("dashboard service", () => {
  test("returns current agent dashboard with zero-filled resolution trend", async () => {
    let resolvedAgentId = "";
    const repository = {
      async getAgentResolvedCount(agentId: string) {
        resolvedAgentId = agentId;
        return 2;
      },
      async getAgentOpenCount() {
        return 4;
      },
      async getAgentResolutionTrend() {
        return [{ bucket: "2026-07-02", count: 2 }];
      },
    } as unknown as DashboardRepository;
    const service = createDashboardService(repository);

    const result = await service.getAgentSummary(
      { from: "2026-07-01", to: "2026-07-03" },
      agent,
    );

    expect(resolvedAgentId).toBe(agent.id);
    expect(result.cards).toEqual({
      openCount: 4,
      resolvedCount: 2,
    });
    expect(result.resolutionTrend).toEqual([
      { bucket: "2026-07-01", resolvedCount: 0 },
      { bucket: "2026-07-02", resolvedCount: 2 },
      { bucket: "2026-07-03", resolvedCount: 0 },
    ]);
  });

  test("rejects manager access to personal agent dashboard", async () => {
    const service = createDashboardService({} as DashboardRepository);

    await expect(
      service.getAgentSummary({}, manager),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "AGENT_DASHBOARD_FORBIDDEN",
    });
  });

  test("returns manager dashboard cards, merged trends, and category percentages", async () => {
    const repository = {
      async getManagerTotalComplaints() {
        return 10;
      },
      async getManagerResolvedComplaints() {
        return 7;
      },
      async getManagerEscalatedComplaints() {
        return 3;
      },
      async getManagerIncomingTrend() {
        return [{ bucket: "2026-07-01", count: 4 }];
      },
      async getManagerResolvedTrend() {
        return [{ bucket: "2026-07-02", count: 2 }];
      },
      async getManagerEscalatedTrend() {
        return [{ bucket: "2026-07-03", count: 1 }];
      },
      async getManagerComplaintsByCategory() {
        return [
          { category: "delay", count: 6 },
          { category: "refund", count: 4 },
        ];
      },
    } as unknown as DashboardRepository;
    const service = createDashboardService(repository);

    const result = await service.getManagerSummary(
      { from: "2026-07-01", to: "2026-07-03" },
      manager,
    );

    expect(result.cards).toEqual({
      escalatedComplaints: 3,
      resolvedComplaints: 7,
      totalComplaints: 10,
    });
    expect(result.complaintTrend).toEqual([
      { bucket: "2026-07-01", escalated: 0, incoming: 4, resolved: 0 },
      { bucket: "2026-07-02", escalated: 0, incoming: 0, resolved: 2 },
      { bucket: "2026-07-03", escalated: 1, incoming: 0, resolved: 0 },
    ]);
    expect(result.complaintsByCategory).toEqual([
      { category: "delay", label: "Keterlambatan", count: 6, percentage: 60 },
      { category: "refund", label: "Pengembalian Dana", count: 4, percentage: 40 },
    ]);
  });
});
