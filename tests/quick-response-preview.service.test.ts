import { describe, expect, test } from "bun:test";

import type { AiConfig } from "../src/config/env";
import type { AiChatClient } from "../src/integrations/ai/ai.types";
import type { AuthUser } from "../src/modules/auth/auth.types";
import {
  createQuickResponsePreviewService,
  fallbackSuggestions,
  normalizeHeatSuggestions,
  parseHeatSuggestionsContent,
} from "../src/modules/quick-responses/quick-response-preview.service";

const agent: AuthUser = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "Agent One",
  email: "agent1@access.test",
  role: "agent",
};

const config: AiConfig = {
  apiKey: "test-key",
  chatCompletionsUrl: "http://localhost:20128/v1/chat/completions",
  enabled: true,
  guidelinesPath: "src/modules/quick-responses/prompts/heat-guidelines.txt",
  maxInputChars: 3000,
  maxOutputTokens: 700,
  model: "oc/deepseek-v4-flash-free",
  provider: "opencode",
  temperature: 0.3,
  timeoutMs: 10000,
};

describe("quick response preview service", () => {
  test("parses markdown-wrapped HEAT JSON", () => {
    const parsed = parseHeatSuggestionsContent(`\`\`\`json
{
  "hear": ["Kami memahami kendala Anda."],
  "empathize": ["Kami mengerti hal ini tidak nyaman."],
  "apologize": ["Mohon maaf atas ketidaknyamanan ini."],
  "takeAction": ["Kami akan bantu teruskan untuk pengecekan."]
}
\`\`\``);

    expect(parsed.hear?.[0]).toBe("Kami memahami kendala Anda.");
  });

  test("normalizes suggestions to exactly 3 non-empty values per HEAT part", () => {
    const normalized = normalizeHeatSuggestions({
      hear: [" A ", "", "B", "C", "D"],
      empathize: ["E"],
      apologize: [],
    });

    expect(normalized.hear).toEqual(["A", "B", "C"]);
    expect(normalized.empathize).toHaveLength(3);
    expect(normalized.empathize[0]).toBe("E");
    expect(normalized.apologize).toEqual(fallbackSuggestions.apologize);
    expect(normalized.takeAction).toEqual(fallbackSuggestions.takeAction);
  });

  test("returns AI suggestions when the model response is usable", async () => {
    let prompt = "";
    const service = createQuickResponsePreviewService(config, {
      async createChatCompletion(input) {
        prompt = input.messages.map((message) => message.content).join("\n");
        return JSON.stringify({
          hear: ["H1", "H2", "H3", "H4"],
          empathize: ["E1"],
          apologize: ["A1", "A2", "A3"],
          takeAction: ["T1", "T2", "T3"],
        });
      },
    } satisfies AiChatClient);

    const result = await service.generatePreview(
      {
        complaintText: "Saldo saya terpotong tapi tiket tidak muncul.",
        category: "payment",
      },
      agent,
    );

    expect(result.suggestionSource).toBe("ai");
    expect(result.suggestions.hear).toEqual(["H1", "H2", "H3"]);
    expect(result.suggestions.empathize).toHaveLength(3);
    expect(prompt).toContain("Complaint:");
    expect(prompt).toContain("Category:");
  });

  test("falls back when AI is disabled or returns invalid content", async () => {
    const disabledService = createQuickResponsePreviewService(
      { ...config, enabled: false },
      {
        async createChatCompletion() {
          throw new Error("AI should not be called");
        },
      },
    );
    const invalidService = createQuickResponsePreviewService(config, {
      async createChatCompletion() {
        return "not json";
      },
    });

    await expect(
      disabledService.generatePreview(
        { complaintText: "Aplikasi force close saat membuka e-ticket." },
        agent,
      ),
    ).resolves.toEqual({
      suggestionSource: "fallback",
      suggestions: fallbackSuggestions,
    });
    await expect(
      invalidService.generatePreview(
        { complaintText: "Aplikasi force close saat membuka e-ticket." },
        agent,
      ),
    ).resolves.toEqual({
      suggestionSource: "fallback",
      suggestions: fallbackSuggestions,
    });
  });

  test("rejects managers and over-limit complaint text", async () => {
    const service = createQuickResponsePreviewService(
      { ...config, maxInputChars: 10 },
      {
        async createChatCompletion() {
          return "{}";
        },
      },
    );

    await expect(
      service.generatePreview(
        { complaintText: "Aplikasi force close." },
        { ...agent, role: "manager" },
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "QUICK_RESPONSE_PREVIEW_FORBIDDEN",
    });
    await expect(
      service.generatePreview({ complaintText: "Aplikasi force close." }, agent),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: "COMPLAINT_TEXT_TOO_LONG",
    });
  });
});
