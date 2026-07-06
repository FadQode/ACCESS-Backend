import { describe, expect, test } from "bun:test";

import {
  createAiChatClient,
  parseOpenAiChatCompletionContent,
} from "../src/integrations/ai/ai.client";
import type { AiConfig } from "../src/config/env";

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

describe("AI chat client", () => {
  test("extracts message.content and ignores reasoning_content", () => {
    const content = parseOpenAiChatCompletionContent(
      JSON.stringify({
        choices: [
          {
            message: {
              role: "assistant",
              content: '{ "hear": ["Kami memahami kendala Anda."] }',
              reasoning_content: "internal reasoning should be ignored",
            },
          },
        ],
      }),
    );

    expect(content).toBe('{ "hear": ["Kami memahami kendala Anda."] }');
  });

  test("parses a JSON response with trailing streaming marker text", () => {
    const content = parseOpenAiChatCompletionContent(
      `${JSON.stringify({
        choices: [
          {
            message: {
              content: '{ "hear": ["Kami menerima laporan Anda."] }',
            },
          },
        ],
      })}data: [DONE]`,
    );

    expect(content).toBe('{ "hear": ["Kami menerima laporan Anda."] }');
  });

  test("sends OpenAI-compatible chat completions body", async () => {
    let requestUrl = "";
    let requestHeaders = new Headers();
    let requestBody: unknown;
    const client = createAiChatClient(config, async (input, init) => {
      requestUrl = String(input);
      requestHeaders = new Headers(init?.headers);
      requestBody = JSON.parse(String(init?.body));

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"hear":["A","B","C"],"empathize":["A","B","C"],"apologize":["A","B","C"],"takeAction":["A","B","C"]}',
              },
            },
          ],
        }),
      );
    });

    await client.createChatCompletion({
      messages: [{ role: "system", content: "guidelines" }],
    });

    expect(requestUrl).toBe(config.chatCompletionsUrl);
    expect(requestHeaders.get("authorization")).toBe("Bearer test-key");
    expect(requestHeaders.get("content-type")).toBe("application/json");
    expect(requestBody).toMatchObject({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxOutputTokens,
      stream: false,
    });
  });
});
