import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { AiConfig } from "../../config/env";
import type { AiChatClient } from "../../integrations/ai/ai.types";
import { ForbiddenError, ValidationError } from "../../shared/errors";
import type { AuthUser } from "../auth/auth.types";
import {
  emptyContextSuggestions,
  type ContextSuggestionsService,
} from "../context-suggestions";
import type {
  HeatSuggestions,
  QuickResponsePreviewInput,
  QuickResponsePreviewResult,
} from "./quick-response-preview.types";

const suggestionKeys = [
  "hear",
  "empathize",
  "apologize",
  "takeAction",
] as const;

const minimalHeatGuidelines = `Anda membantu seorang agen Customer Support manusia.

Buatlah saran untuk customer support dalam bahasa Indonesia menggunakan metode HEAT:
H = Hear (Dengarkan)
E = Empathize (Berempati)
A = Apologize (Meminta maaf)
T = Take Action (Bertindak)

Aturan:
- Gunakan bahasa Indonesia menyesuaikan dengan tone komplainnya antara formal, santai, atau sopan.
- Buat setiap pilihan tetap singkat dan sesuai untuk layanan pelanggan.
- Jangan menjanjikan pengembalian dana atau kompensasi.
- Jangan menyatakan bahwa masalah telah teratasi.
- Jangan mengarang nomor tiket.
- Jangan meminta data sensitif secara berlebihan.
- Hanya hasilkan JSON yang valid.

JSON format:
{
  "hear": ["...", "...", "..."],
  "empathize": ["...", "...", "..."],
  "apologize": ["...", "...", "..."],
  "takeAction": ["...", "...", "..."]
}`;

export const fallbackSuggestions: HeatSuggestions = {
  hear: [
    "Kami memahami kendala yang Anda sampaikan.",
    "Kami menerima laporan Anda terkait kendala tersebut.",
    "Kami memahami bahwa kendala ini perlu segera ditindaklanjuti.",
  ],
  empathize: [
    "Kami mengerti hal ini dapat mengganggu kenyamanan Anda.",
    "Kami paham situasi ini bisa membuat tidak nyaman.",
    "Kami memahami kekhawatiran Anda terkait kendala ini.",
  ],
  apologize: [
    "Mohon maaf atas ketidaknyamanan yang terjadi.",
    "Kami mohon maaf atas kendala yang Anda alami.",
    "Maaf atas pengalaman yang kurang nyaman ini.",
  ],
  takeAction: [
    "Kami akan bantu teruskan kendala ini untuk pengecekan lebih lanjut.",
    "Tim kami akan meninjau laporan ini agar dapat ditindaklanjuti.",
    "Kami akan bantu arahkan laporan ini ke pihak terkait.",
  ],
};

export interface QuickResponsePreviewService {
  generatePreview(
    input: QuickResponsePreviewInput,
    currentUser: AuthUser,
  ): Promise<QuickResponsePreviewResult>;
}

const assertCanPreviewQuickResponse = (currentUser: AuthUser): void => {
  if (currentUser.role !== "agent" && currentUser.role !== "admin") {
    throw new ForbiddenError(
      "Managers cannot generate quick response previews",
      "QUICK_RESPONSE_PREVIEW_FORBIDDEN",
    );
  }
};

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

  throw new Error("Suggestion content did not contain JSON");
};

const stripMarkdownFence = (content: string): string => {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
};

export const parseHeatSuggestionsContent = (
  content: string,
): Partial<HeatSuggestions> => {
  const cleaned = stripMarkdownFence(content);

  try {
    return JSON.parse(cleaned) as Partial<HeatSuggestions>;
  } catch {
    return JSON.parse(extractFirstJsonObject(cleaned)) as Partial<HeatSuggestions>;
  }
};

const normalizeSuggestionArray = (
  value: unknown,
  fallback: string[],
): string[] =>
  [
    ...(Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : []),
    ...fallback,
  ].slice(0, 3);

export const normalizeHeatSuggestions = (
  value: Partial<HeatSuggestions>,
): HeatSuggestions => ({
  hear: normalizeSuggestionArray(value.hear, fallbackSuggestions.hear),
  empathize: normalizeSuggestionArray(
    value.empathize,
    fallbackSuggestions.empathize,
  ),
  apologize: normalizeSuggestionArray(
    value.apologize,
    fallbackSuggestions.apologize,
  ),
  takeAction: normalizeSuggestionArray(
    value.takeAction,
    fallbackSuggestions.takeAction,
  ),
});

const hasUsableSuggestion = (value: Partial<HeatSuggestions>): boolean =>
  suggestionKeys.some((key) =>
    Array.isArray(value[key])
      ? value[key].some(
          (item) => typeof item === "string" && item.trim().length > 0,
        )
      : false,
  );

const loadGuidelines = async (config: AiConfig): Promise<string> => {
  try {
    return await readFile(resolve(process.cwd(), config.guidelinesPath), "utf8");
  } catch {
    return minimalHeatGuidelines;
  }
};

const buildUserPrompt = (input: QuickResponsePreviewInput): string => {
  const category = input.category ?? "unknown";
  const responseTone = input.responseTone?.trim() || "default";
  const responseTarget = input.responseTarget ?? "default";

  return [
    `Complaint:\n${input.complaintText.trim()}`,
    `Category:\n${category}`,
    `Response tone:\n${responseTone}`,
    `Response target:\n${responseTarget}`,
  ].join("\n\n");
};

const fallbackResult = (): QuickResponsePreviewResult => ({
  ...emptyContextSuggestions(),
  suggestionSource: "fallback",
  suggestions: {
    hear: [...fallbackSuggestions.hear],
    empathize: [...fallbackSuggestions.empathize],
    apologize: [...fallbackSuggestions.apologize],
    takeAction: [...fallbackSuggestions.takeAction],
  },
});

const withContext = async (
  result: QuickResponsePreviewResult,
  contextService: ContextSuggestionsService | undefined,
  input: QuickResponsePreviewInput,
): Promise<QuickResponsePreviewResult> => {
  if (!contextService) {
    return result;
  }

  try {
    const context = await contextService.getContextSuggestions({
      category: input.category,
      complaintText: input.complaintText,
    });

    return {
      ...result,
      relevantReferences: context.relevantReferences,
      similarResolvedCases: context.similarResolvedCases,
    };
  } catch {
    return result;
  }
};

export const createQuickResponsePreviewService = (
  config: AiConfig,
  aiClient: AiChatClient,
  contextService?: ContextSuggestionsService,
): QuickResponsePreviewService => ({
  async generatePreview(input, currentUser) {
    assertCanPreviewQuickResponse(currentUser);

    const complaintText = input.complaintText.trim();
    if (complaintText.length > config.maxInputChars) {
      throw new ValidationError(
        `Complaint text must be at most ${config.maxInputChars} characters`,
        { field: "complaintText" },
        "COMPLAINT_TEXT_TOO_LONG",
      );
    }

    if (!config.enabled || config.provider === "mock") {
      return withContext(fallbackResult(), contextService, {
        ...input,
        complaintText,
      });
    }

    try {
      const content = await aiClient.createChatCompletion({
        messages: [
          {
            role: "system",
            content: await loadGuidelines(config),
          },
          {
            role: "user",
            content: buildUserPrompt({ ...input, complaintText }),
          },
        ],
      });
      const parsedSuggestions = parseHeatSuggestionsContent(content);

      if (!hasUsableSuggestion(parsedSuggestions)) {
        return withContext(fallbackResult(), contextService, {
          ...input,
          complaintText,
        });
      }

      return withContext({
        ...emptyContextSuggestions(),
        suggestionSource: "ai",
        suggestions: normalizeHeatSuggestions(parsedSuggestions),
      }, contextService, { ...input, complaintText });
    } catch {
      return withContext(fallbackResult(), contextService, {
        ...input,
        complaintText,
      });
    }
  },
});
