#!/usr/bin/env bun

const BASE_URL = process.env.API_URL || "http://localhost:3000";

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

interface HeatSuggestions {
  hear: string[];
  empathize: string[];
  apologize: string[];
  takeAction: string[];
}

interface PreviewResponse {
  suggestionSource: "ai" | "fallback";
  suggestions: HeatSuggestions;
  finalResponse?: unknown;
  confidence?: unknown;
  requiresManagerAction?: unknown;
}

class Phase7SmokeTest {
  private agentToken = "";
  private passed = 0;
  private failed = 0;

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  private assert(condition: boolean, message: string): void {
    if (!condition) {
      this.failed += 1;
      throw new Error(`Assertion failed: ${message}`);
    }

    this.passed += 1;
    console.log(`PASS ${message}`);
  }

  async loginAgent(): Promise<void> {
    const response = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "agent1@access.test",
        password: "password123",
      }),
    });

    this.assert(response.success, "agent login succeeds");
    this.assert(response.data.user.role === "agent", "logged-in user is agent");
    this.agentToken = response.data.token;
  }

  async previewSuggestions(): Promise<void> {
    const response = await this.request<PreviewResponse>(
      "/quick-responses/preview",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.agentToken}`,
        },
        body: JSON.stringify({
          complaintText: "Saldo saya terpotong tapi tiket tidak muncul.",
          category: "payment",
        }),
      },
    );

    this.assert(response.success, "preview response succeeds");
    this.assert(
      response.data.suggestionSource === "ai" ||
        response.data.suggestionSource === "fallback",
      "suggestion source is valid",
    );

    for (const key of [
      "hear",
      "empathize",
      "apologize",
      "takeAction",
    ] as const) {
      const values = response.data.suggestions[key];
      this.assert(values.length === 3, `${key} has exactly 3 options`);
      this.assert(
        values.every((item) => typeof item === "string" && item.trim()),
        `${key} options are non-empty strings`,
      );
    }

    this.assert(
      response.data.finalResponse === undefined,
      "response does not include finalResponse",
    );
    this.assert(
      response.data.confidence === undefined,
      "response does not include confidence",
    );
    this.assert(
      response.data.requiresManagerAction === undefined,
      "response does not include requiresManagerAction",
    );

    const selectedHear = response.data.suggestions.hear[0] ?? "";
    const selectedEmpathize = response.data.suggestions.empathize[0] ?? "";
    const selectedApologize = response.data.suggestions.apologize[0] ?? "";
    const selectedTakeAction = response.data.suggestions.takeAction[0] ?? "";
    const finalResponse = [
      selectedHear,
      selectedEmpathize,
      selectedApologize,
      selectedTakeAction,
    ].join(" ");

    this.assert(finalResponse.includes(selectedHear), "final response has Hear");
    this.assert(
      finalResponse.includes(selectedEmpathize),
      "final response has Empathize",
    );
    this.assert(
      finalResponse.includes(selectedApologize),
      "final response has Apologize",
    );
    this.assert(
      finalResponse.includes(selectedTakeAction),
      "final response has Take Action",
    );
  }

  async run(): Promise<void> {
    console.log("Phase 7 AI preview smoke test");
    console.log(`Testing against ${BASE_URL}`);

    try {
      await this.loginAgent();
      await this.previewSuggestions();
      console.log(`Passed: ${this.passed}`);
      console.log(`Failed: ${this.failed}`);
    } catch (error) {
      console.error(error);
      console.log(`Passed: ${this.passed}`);
      console.log(`Failed: ${this.failed}`);
      process.exit(1);
    }
  }
}

const runner = new Phase7SmokeTest();
runner.run();
