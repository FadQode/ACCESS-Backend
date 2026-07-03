#!/usr/bin/env bun

const BASE_URL = process.env.API_URL || "http://localhost:3000";

interface ApiResponse<T = unknown> {
  data: T;
  message: string;
  success: boolean;
}

interface LoginData {
  token: string;
  user: {
    email: string;
    id: string;
    name: string;
    role: string;
  };
}

interface AgentsPerformanceData {
  agents: Array<{
    agentId: string;
    agentName: string;
  }>;
}

class SmokeRunner {
  private agentId = "";
  private agentToken = "";
  private failed = 0;
  private managerToken = "";
  private passed = 0;

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<{ body: ApiResponse<T>; status: number }> {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const body = (await response.json()) as ApiResponse<T>;
    return { body, status: response.status };
  }

  private assert(condition: boolean, message: string): void {
    if (!condition) {
      this.failed += 1;
      throw new Error(message);
    }

    this.passed += 1;
    console.log(`PASS ${message}`);
  }

  private async login(
    email: string,
  ): Promise<{ id: string; role: string; token: string }> {
    const { body, status } = await this.request<LoginData>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: "password123" }),
    });

    this.assert(status === 200 && body.success, `${email} login succeeds`);
    return {
      id: body.data.user.id,
      role: body.data.user.role,
      token: body.data.token,
    };
  }

  async run(): Promise<void> {
    console.log(`Phase 6 dashboard/report smoke test: ${BASE_URL}`);

    const manager = await this.login("manager1@access.test");
    const agent = await this.login("agent1@access.test");
    this.managerToken = manager.token;
    this.agentToken = agent.token;
    this.agentId = agent.id;

    this.assert(manager.role === "manager", "manager role is correct");
    this.assert(agent.role === "agent", "agent role is correct");

    const agentDashboard = await this.request("/dashboard/agent/summary", {
      headers: { Authorization: `Bearer ${this.agentToken}` },
    });
    this.assert(
      agentDashboard.status === 200 && agentDashboard.body.success,
      "agent dashboard summary works",
    );

    const managerDashboard = await this.request("/dashboard/manager/summary", {
      headers: { Authorization: `Bearer ${this.managerToken}` },
    });
    this.assert(
      managerDashboard.status === 200 && managerDashboard.body.success,
      "manager dashboard summary works",
    );

    const performance = await this.request<AgentsPerformanceData>(
      "/reports/agents/performance",
      {
        headers: { Authorization: `Bearer ${this.managerToken}` },
      },
    );
    this.assert(
      performance.status === 200 && performance.body.success,
      "manager can read agents performance report",
    );

    const targetAgentId = performance.body.data.agents[0]?.agentId ?? this.agentId;
    const managerAgentReport = await this.request(
      `/reports/agents/${targetAgentId}`,
      {
        headers: { Authorization: `Bearer ${this.managerToken}` },
      },
    );
    this.assert(
      managerAgentReport.status === 200 && managerAgentReport.body.success,
      "manager can read a single agent report",
    );

    const ownAgentReport = await this.request(`/reports/agents/${this.agentId}`, {
      headers: { Authorization: `Bearer ${this.agentToken}` },
    });
    this.assert(
      ownAgentReport.status === 200 && ownAgentReport.body.success,
      "agent can read own report",
    );

    const otherAgentId =
      performance.body.data.agents.find((item) => item.agentId !== this.agentId)
        ?.agentId ?? "00000000-0000-4000-8000-000000000005";
    const otherAgentReport = await this.request(`/reports/agents/${otherAgentId}`, {
      headers: { Authorization: `Bearer ${this.agentToken}` },
    });
    this.assert(
      otherAgentReport.status === 404,
      "agent reading another agent report returns 404",
    );

    const agentManagerDashboard = await this.request(
      "/dashboard/manager/summary",
      {
        headers: { Authorization: `Bearer ${this.agentToken}` },
      },
    );
    this.assert(
      agentManagerDashboard.status === 403,
      "agent reading manager dashboard returns 403",
    );

    console.log(`Done. Passed: ${this.passed}. Failed: ${this.failed}.`);
  }
}

new SmokeRunner().run().catch((error) => {
  console.error(error);
  process.exit(1);
});
