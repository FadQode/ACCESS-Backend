#!/usr/bin/env bun

/**
 * Phase 6 Smoke Test - Reports & Dashboard
 * 
 * Tests the complete dashboard and reporting flow:
 * 1. Agent dashboard summary
 * 2. Manager dashboard summary
 * 3. Agent performance report
 * 4. Single agent report
 */

const BASE_URL = process.env.API_URL || "http://localhost:3000";
const API_BASE = BASE_URL;

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
}

interface AgentDashboardSummary {
  cards: {
    openCount: number;
    resolvedCount: number;
  };
  resolutionTrend: Array<{
    bucket: string;
    resolvedCount: number;
  }>;
  period: {
    from: string;
    to: string;
    groupBy: string;
    timezone: string;
  };
}

interface ManagerDashboardSummary {
  cards: {
    totalComplaints: number;
    resolvedComplaints: number;
    escalatedComplaints: number;
  };
  complaintTrend: Array<{
    bucket: string;
    incoming: number;
    resolved: number;
    escalated: number;
  }>;
  complaintsByCategory: Array<{
    category: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  period: {
    from: string;
    to: string;
    groupBy: string;
    timezone: string;
  };
}

interface AgentsPerformanceReport {
  agents: Array<{
    agentId: string;
    agentName: string;
    agentEmail: string;
    isActive: boolean;
    handledCount: number;
    resolvedCount: number;
    openCount: number;
    escalatedCount: number;
    topCategory: string | null;
    lastActivityAt: string | null;
  }>;
  period: {
    from: string;
    to: string;
    groupBy: string;
    timezone: string;
  };
}

interface SingleAgentReport {
  agent: {
    id: string;
    name: string;
    email: string;
  };
  summary: {
    handledCount: number;
    resolvedCount: number;
    openCount: number;
    escalatedCount: number;
  };
  resolutionTrend: Array<{
    bucket: string;
    handledCount: number;
    resolvedCount: number;
  }>;
  complaintsByCategory: Array<{
    category: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  recentCases: {
    items: Array<{
      complaintId: string;
      referenceNo: string;
      complaintTextPreview: string;
      category: string;
      complaintStatus: string;
      ticketId: string | null;
      ticketStatus: string | null;
      createdAt: string;
      resolvedAt: string | null;
      lastResponseAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  period: {
    from: string;
    to: string;
    groupBy: string;
    timezone: string;
  };
}

class SmokeTestRunner {
  private managerToken: string = "";
  private agentToken: string = "";
  private agent2Token: string = "";
  private managerUserId: string = "";
  private agentUserId: string = "";
  private agent2UserId: string = "";

  private passed = 0;
  private failed = 0;

  async fetch<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok && response.status !== 400 && response.status !== 403 && response.status !== 404) {
      const text = await response.text();
      throw new Error(
        `HTTP ${response.status} ${response.statusText}: ${text}`,
      );
    }

    return response.json();
  }

  assert(condition: boolean, message: string): void {
    if (condition) {
      console.log(`✅ ${message}`);
      this.passed++;
    } else {
      console.log(`❌ ${message}`);
      this.failed++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  async loginManager(): Promise<void> {
    console.log("\n📝 Step 1: Login as Manager");
    const response = await this.fetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "manager1@access.test",
        password: "password123",
      }),
    });

    this.assert(response.success, "Manager login successful");
    this.assert(response.data.user.role === "manager", "User role is manager");
    this.managerToken = response.data.token;
    this.managerUserId = response.data.user.id;
    console.log(`   Manager ID: ${this.managerUserId}`);
  }

  async loginAgent(): Promise<void> {
    console.log("\n📝 Step 2: Login as Agent");
    const response = await this.fetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "agent1@access.test",
        password: "password123",
      }),
    });

    this.assert(response.success, "Agent login successful");
    this.assert(response.data.user.role === "agent", "User role is agent");
    this.agentToken = response.data.token;
    this.agentUserId = response.data.user.id;
    console.log(`   Agent ID: ${this.agentUserId}`);
  }

  async loginAgent2(): Promise<void> {
    console.log("\n📝 Step 3: Login as Agent 2");
    const response = await this.fetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "agent2@access.test",
        password: "password123",
      }),
    });

    this.assert(response.success, "Agent 2 login successful");
    this.assert(response.data.user.role === "agent", "User role is agent");
    this.agent2Token = response.data.token;
    this.agent2UserId = response.data.user.id;
    console.log(`   Agent 2 ID: ${this.agent2UserId}`);
  }

  async testAgentDashboard(): Promise<void> {
    console.log("\n📝 Step 4: Agent GET /dashboard/agent/summary");
    
    const response = await this.fetch<AgentDashboardSummary>(
      "/dashboard/agent/summary?period=7d",
      {
        headers: { Authorization: `Bearer ${this.agentToken}` },
      },
    );

    this.assert(response.success, "Agent dashboard retrieved");
    this.assert(typeof response.data.cards.openCount === "number", "Has openCount");
    this.assert(typeof response.data.cards.resolvedCount === "number", "Has resolvedCount");
    this.assert(Array.isArray(response.data.resolutionTrend), "Has resolutionTrend array");
    this.assert(response.data.period.groupBy === "day", "Default groupBy is day for 7d");
    console.log(`   Open: ${response.data.cards.openCount}, Resolved: ${response.data.cards.resolvedCount}`);
  }

  async testManagerCannotAccessAgentDashboard(): Promise<void> {
    console.log("\n📝 Step 5: Manager GET /dashboard/agent/summary (should fail)");
    
    const response = await fetch(`${API_BASE}/dashboard/agent/summary`, {
      headers: { Authorization: `Bearer ${this.managerToken}` },
    });
    this.assert(response.status === 403, "Manager access returns 403");
  }

  async testManagerDashboard(): Promise<void> {
    console.log("\n📝 Step 6: Manager GET /dashboard/manager/summary");
    
    const response = await this.fetch<ManagerDashboardSummary>(
      "/dashboard/manager/summary?period=30d",
      {
        headers: { Authorization: `Bearer ${this.managerToken}` },
      },
    );

    this.assert(response.success, "Manager dashboard retrieved");
    this.assert(typeof response.data.cards.totalComplaints === "number", "Has totalComplaints");
    this.assert(typeof response.data.cards.resolvedComplaints === "number", "Has resolvedComplaints");
    this.assert(typeof response.data.cards.escalatedComplaints === "number", "Has escalatedComplaints");
    this.assert(Array.isArray(response.data.complaintTrend), "Has complaintTrend array");
    this.assert(Array.isArray(response.data.complaintsByCategory), "Has complaintsByCategory array");
    
    // Verify category percentages
    const totalPercentage = response.data.complaintsByCategory.reduce(
      (sum, cat) => sum + cat.percentage,
      0,
    );
    if (response.data.complaintsByCategory.length > 0) {
      this.assert(
        totalPercentage === 100 || totalPercentage === 0 || (totalPercentage >= 99 && totalPercentage <= 101),
        "Category percentages roughly sum to 100 (rounding allowed)",
      );
    }
    
    console.log(`   Total: ${response.data.cards.totalComplaints}, Resolved: ${response.data.cards.resolvedComplaints}, Escalated: ${response.data.cards.escalatedComplaints}`);
  }

  async testAgentCannotAccessManagerDashboard(): Promise<void> {
    console.log("\n📝 Step 7: Agent GET /dashboard/manager/summary (should fail)");
    
    const response = await fetch(`${API_BASE}/dashboard/manager/summary`, {
      headers: { Authorization: `Bearer ${this.agentToken}` },
    });
    this.assert(response.status === 403, "Agent access returns 403");
  }

  async testAgentsPerformance(): Promise<void> {
    console.log("\n📝 Step 8: Manager GET /reports/agents/performance");
    
    const response = await this.fetch<AgentsPerformanceReport>(
      "/reports/agents/performance?period=30d",
      {
        headers: { Authorization: `Bearer ${this.managerToken}` },
      },
    );

    this.assert(response.success, "Agent performance report retrieved");
    this.assert(Array.isArray(response.data.agents), "Has agents array");
    this.assert(response.data.agents.length > 0, "Has at least one agent");
    
    const firstAgent = response.data.agents[0];
    if (firstAgent) {
      this.assert(typeof firstAgent.handledCount === "number", "Agent has handledCount");
      this.assert(typeof firstAgent.resolvedCount === "number", "Agent has resolvedCount");
      this.assert(typeof firstAgent.openCount === "number", "Agent has openCount");
      this.assert(typeof firstAgent.escalatedCount === "number", "Agent has escalatedCount");
      this.assert(typeof firstAgent.isActive === "boolean", "Agent has isActive");
    }
    
    console.log(`   Total agents: ${response.data.agents.length}`);
  }

  async testAgentsPerformanceWithInactive(): Promise<void> {
    console.log("\n📝 Step 9: Manager GET /reports/agents/performance?includeInactive=true");
    
    const response = await this.fetch<AgentsPerformanceReport>(
      "/reports/agents/performance?period=30d&includeInactive=true",
      {
        headers: { Authorization: `Bearer ${this.managerToken}` },
      },
    );

    this.assert(response.success, "Agent performance report with inactive retrieved");
    console.log(`   Total agents (including inactive): ${response.data.agents.length}`);
  }

  async testAgentCannotAccessPerformanceReport(): Promise<void> {
    console.log("\n📝 Step 10: Agent GET /reports/agents/performance (should fail)");
    
    const response = await fetch(`${API_BASE}/reports/agents/performance`, {
      headers: { Authorization: `Bearer ${this.agentToken}` },
    });
    this.assert(response.status === 403, "Agent access returns 403");
  }

  async testSingleAgentReportByManager(): Promise<void> {
    console.log("\n📝 Step 11: Manager GET /reports/agents/:agentId");
    
    const response = await this.fetch<SingleAgentReport>(
      `/reports/agents/${this.agentUserId}?period=30d`,
      {
        headers: { Authorization: `Bearer ${this.managerToken}` },
      },
    );

    this.assert(response.success, "Single agent report retrieved by manager");
    this.assert(response.data.agent.id === this.agentUserId, "Correct agent ID");
    this.assert(typeof response.data.summary.handledCount === "number", "Has handledCount");
    this.assert(typeof response.data.summary.resolvedCount === "number", "Has resolvedCount");
    this.assert(typeof response.data.summary.openCount === "number", "Has openCount");
    this.assert(typeof response.data.summary.escalatedCount === "number", "Has escalatedCount");
    this.assert(Array.isArray(response.data.resolutionTrend), "Has resolutionTrend");
    this.assert(Array.isArray(response.data.complaintsByCategory), "Has complaintsByCategory");
    this.assert(Array.isArray(response.data.recentCases.items), "Has recentCases items");
    this.assert(typeof response.data.recentCases.pagination.total === "number", "Has pagination total");
    
    console.log(`   Agent: ${response.data.agent.name}`);
    console.log(`   Handled: ${response.data.summary.handledCount}, Resolved: ${response.data.summary.resolvedCount}`);
  }

  async testSingleAgentReportBySelf(): Promise<void> {
    console.log("\n📝 Step 12: Agent GET own /reports/agents/:agentId");
    
    const response = await this.fetch<SingleAgentReport>(
      `/reports/agents/${this.agentUserId}?period=7d`,
      {
        headers: { Authorization: `Bearer ${this.agentToken}` },
      },
    );

    this.assert(response.success, "Agent can access own report");
    this.assert(response.data.agent.id === this.agentUserId, "Correct agent ID");
    console.log(`   Agent accessing own report: ${response.data.agent.name}`);
  }

  async testAgentCannotAccessOtherAgentReport(): Promise<void> {
    console.log("\n📝 Step 13: Agent GET other agent /reports/agents/:agentId (should fail)");
    
    const response = await fetch(`${API_BASE}/reports/agents/${this.agent2UserId}`, {
      headers: { Authorization: `Bearer ${this.agentToken}` },
    });
    this.assert(response.status === 404, "Agent accessing other returns 404");
  }

  async testDateFilterCustom(): Promise<void> {
    console.log("\n📝 Step 14: Test custom date filter");
    
    const response = await this.fetch<ManagerDashboardSummary>(
      "/dashboard/manager/summary?period=custom&from=2026-06-01&to=2026-07-03",
      {
        headers: { Authorization: `Bearer ${this.managerToken}` },
      },
    );

    this.assert(response.success, "Custom period retrieved");
    this.assert(response.data.period.from === "2026-06-01", "Custom from date correct");
    this.assert(response.data.period.to === "2026-07-03", "Custom to date correct");
    console.log(`   Period: ${response.data.period.from} to ${response.data.period.to}`);
  }

  async testDateFilterInvalidCustom(): Promise<void> {
    console.log("\n📝 Step 15: Test invalid custom date filter (should fail)");
    
    const response = await fetch(
      `${API_BASE}/dashboard/manager/summary?period=custom`,
      { headers: { Authorization: `Bearer ${this.managerToken}` } },
    );
    this.assert(response.status === 400, "Missing from/to returns 400");
  }

  async testRecentCasesPagination(): Promise<void> {
    console.log("\n📝 Step 16: Test recent cases pagination");
    
    const response = await this.fetch<SingleAgentReport>(
      `/reports/agents/${this.agentUserId}?period=30d&page=1&limit=5`,
      {
        headers: { Authorization: `Bearer ${this.managerToken}` },
      },
    );

    this.assert(response.success, "Paginated recent cases retrieved");
    this.assert(response.data.recentCases.pagination.page === 1, "Page is 1");
    this.assert(response.data.recentCases.pagination.limit === 5, "Limit is 5");
    this.assert(
      response.data.recentCases.items.length <= 5,
      "Items count respects limit",
    );
    console.log(`   Recent cases: ${response.data.recentCases.items.length} items`);
  }

  async run(): Promise<void> {
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║       Phase 6 Dashboard & Reports Smoke Test        ║");
    console.log("╚══════════════════════════════════════════════════════╝");
    console.log(`\nTesting against: ${BASE_URL}`);
    console.log(`Started at: ${new Date().toISOString()}\n`);

    try {
      await this.loginManager();
      await this.loginAgent();
      await this.loginAgent2();
      await this.testAgentDashboard();
      await this.testManagerCannotAccessAgentDashboard();
      await this.testManagerDashboard();
      await this.testAgentCannotAccessManagerDashboard();
      await this.testAgentsPerformance();
      await this.testAgentsPerformanceWithInactive();
      await this.testAgentCannotAccessPerformanceReport();
      await this.testSingleAgentReportByManager();
      await this.testSingleAgentReportBySelf();
      await this.testAgentCannotAccessOtherAgentReport();
      await this.testDateFilterCustom();
      await this.testDateFilterInvalidCustom();
      await this.testRecentCasesPagination();

      console.log("\n╔══════════════════════════════════════════════════════╗");
      console.log("║                  TEST RESULTS                        ║");
      console.log("╚══════════════════════════════════════════════════════╝");
      console.log(`✅ Passed: ${this.passed}`);
      console.log(`❌ Failed: ${this.failed}`);
      console.log(`\nStatus: ${this.failed === 0 ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);
      console.log(`\nCompleted at: ${new Date().toISOString()}`);

      if (this.failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error("\n💥 Test execution failed:");
      console.error(error);
      console.log(`\n✅ Passed: ${this.passed}`);
      console.log(`❌ Failed: ${this.failed + 1}`);
      process.exit(1);
    }
  }
}

// Run smoke test
const runner = new SmokeTestRunner();
runner.run();
