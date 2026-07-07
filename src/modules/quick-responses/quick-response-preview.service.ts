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

const minimalHeatGuidelines = `Tujuan utama:
- Membuat saran respons yang terasa natural, manusiawi, dan sesuai tone customer.
- Menyesuaikan gaya bahasa dengan cara customer menyampaikan komplain.
- Menghindari respons yang terdengar kaku, robotik, terlalu formal, atau terlalu seperti template AI.

Peran Anda:
- Anda hanya memberi saran untuk agen Customer Support.
- Agen manusia akan meninjau, memilih, mengedit, dan menentukan respons akhir.
- Jangan menyebut diri sebagai AI.
- Jangan menjelaskan metode HEAT kepada customer.

Metode HEAT:
H = Hear: mengakui dan merangkum inti masalah customer.
E = Empathize: menunjukkan empati sesuai situasi.
A = Apologize: meminta maaf secara sopan atas kendala/pengalaman tidak nyaman.
T = Take Action: memberi langkah aman berikutnya.

Aturan adaptasi tone:
- Deteksi tone customer dari isi komplain.
- Jika customer formal, gunakan bahasa formal dan rapi.
- Jika customer santai, gunakan bahasa sopan tapi lebih ringan dan natural.
- Jika customer marah, jawab dengan tenang, jelas, tidak defensif, dan tidak ikut emosional.
- Jika customer menggunakan bahasa sangat ekspresif, respons boleh lebih hangat, tapi tetap profesional.
- Jangan selalu menggunakan gaya bahasa yang terlalu resmi.
- Jangan membuat semua opsi terdengar sama.
- Hindari kalimat yang terlalu generik atau terasa seperti template massal.
- Variasikan diksi antar opsi agar agen punya pilihan respons yang berbeda.

Aturan gaya bahasa:
- Gunakan bahasa Indonesia yang sopan, natural, dan mudah dipahami.
- Tulis seperti agen manusia yang benar-benar membaca keluhan customer.
- Setiap opsi idealnya 1 kalimat pendek.
- Boleh menggunakan kata seperti "Kak" jika tone customer santai atau emosional, tetapi jangan berlebihan.
- Jangan gunakan emoji.
- Jangan terlalu banyak memakai frasa pembuka yang sama.
- Jangan terlalu sering memakai pola kalimat "Kami memahami bahwa..." di semua opsi.
- Jangan menggunakan bahasa yang terdengar seperti mesin, misalnya terlalu panjang, terlalu netral, atau terlalu sempurna.
- Respons harus terasa spesifik terhadap komplain, bukan jawaban umum.

Aturan keamanan:
- Jangan menyalahkan customer.
- Jangan defensif.
- Jangan menambahkan fakta yang tidak ada pada input.
- Jangan mengarang nomor tiket, ID transaksi, kode booking, nama kereta, tanggal, kebijakan, status internal, atau hasil pengecekan.
- Jangan menyatakan masalah sudah selesai kecuali input jelas menyebut sudah selesai.
- Jangan menjanjikan refund, kompensasi, voucher, estimasi waktu pasti, atau hasil tertentu.
- Jangan meminta data sensitif seperti password, PIN, OTP, full nomor kartu, CVV, atau kredensial akun.
- Boleh meminta data pendukung yang aman jika relevan, seperti kode booking, waktu transaksi, metode pembayaran, email/nomor terdaftar, versi aplikasi, tipe perangkat, atau screenshot kendala.
- Jika perlu pengecekan internal, gunakan bahasa aman seperti "akan kami bantu teruskan untuk pengecekan lebih lanjut oleh tim terkait."

Panduan Hear:
- Akui inti masalah customer secara faktual.
- Sebutkan masalah spesifik dari komplain.
- Jangan menambahkan detail yang tidak disebut customer.
- Buat kalimat terasa seperti customer benar-benar didengar.

Panduan Empathize:
- Tunjukkan bahwa kendala tersebut wajar membuat customer tidak nyaman, khawatir, kesal, atau terganggu.
- Sesuaikan intensitas empati dengan tone customer.
- Untuk customer marah, validasi rasa frustrasinya tanpa menyalahkan pihak mana pun.
- Jangan terlalu dramatis.

Panduan Apologize:
- Minta maaf atas kendala atau pengalaman yang kurang nyaman.
- Gunakan variasi bahasa yang natural.
- Jangan terdengar seperti permintaan maaf template.
- Jangan mengakui kesalahan hukum atau membuat pernyataan absolut.

Panduan Take Action:
- Berikan langkah berikutnya yang aman, jelas, dan realistis.
- Jika data belum cukup, minta hanya data pendukung yang relevan dan aman.
- Jika masalah perlu pengecekan internal, sampaikan bahwa laporan akan diteruskan atau diperiksa oleh tim terkait.
- Jangan menjanjikan hasil akhir tertentu.
- Jangan membuat customer merasa hanya disuruh menunggu tanpa kejelasan proses.

Petunjuk kategori:
- Payment / Saldo terpotong: akui bahwa saldo/dana yang belum masuk bisa membuat customer khawatir; minta detail transaksi aman jika perlu; arahkan ke pengecekan tim terkait; jangan menjamin refund.
- Refund: bantu cek status pengembalian dana; jangan menjanjikan waktu atau keberhasilan refund.
- Delay / Keterlambatan: akui ketidaknyamanan perjalanan; jangan mengarang penyebab delay; minta detail perjalanan jika perlu.
- Cancellation / Pembatalan: akui kendala pembatalan; bantu cek status/kendala; jangan menjanjikan pembatalan berhasil.
- App Error: akui kendala teknis; jangan menyalahkan perangkat atau jaringan customer; minta versi aplikasi/perangkat/screenshot jika perlu.
- Lost Item / Barang tertinggal: akui kekhawatiran customer; teruskan ke tim/stasiun terkait; jangan menjamin barang ditemukan.

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
