import type { AiConfig } from "../../config/env";
import type {
  AiChatClient,
  AiFetch,
  CreateChatCompletionInput,
} from "./ai.types";

const extractFirstJsonObject = (raw: string): string => {
  let start = -1;
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (start === -1) {
      if (char === "{") {
        start = index;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return raw.slice(start, index + 1);
      }
    }
  }

  throw new Error("AI response did not contain JSON");
};

export const parseOpenAiChatCompletionContent = (raw: string): string => {
  const json = extractFirstJsonObject(raw.trim());
  const parsed = JSON.parse(json) as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };
  const content = parsed.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("AI response content is empty");
  }

  return content;
};

export const createAiChatClient = (
  config: AiConfig,
  fetcher: AiFetch = fetch,
): AiChatClient => ({
  async createChatCompletion(input: CreateChatCompletionInput) {
    if (!config.enabled || config.provider === "mock") {
      throw new Error("AI chat completions are disabled");
    }

    if (!config.apiKey) {
      throw new Error("AI_API_KEY is required");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetcher(config.chatCompletionsUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages: input.messages,
          temperature: config.temperature,
          max_tokens: config.maxOutputTokens,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI chat completions failed with ${response.status}`);
      }

      return parseOpenAiChatCompletionContent(await response.text());
    } finally {
      clearTimeout(timeout);
    }
  },
});
