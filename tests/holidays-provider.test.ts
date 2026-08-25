import { describe, expect, test } from "bun:test";

import {
  createApiIndonesiaHolidayProvider,
} from "../src/modules/holidays/providers/api-indonesia.provider";
import {
  AppError,
  ServiceUnavailableError,
} from "../src/shared/errors";
import type { ApiIndonesiaConfig } from "../src/config/env";

const config: ApiIndonesiaConfig = {
  apiKey: "test-key",
  baseUrl: "https://provider.test",
  timeoutMs: 5_000,
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

const sampleRecord = {
  id: "hol_2027_001",
  date: "2027-03-14",
  name: "Hari Raya Idul Fitri",
  type: "nasional",
  is_joint_leave: 0,
  description: null,
  source: "SKB 3 Menteri",
  year: 2027,
  is_active: true,
};

describe("api indonesia holiday provider", () => {
  test("parses a valid envelope into external holidays", async () => {
    const provider = createApiIndonesiaHolidayProvider({
      config,
      fetchImpl: async () => jsonResponse({ data: [sampleRecord] }),
    });

    const result = await provider.fetchByYear(2027);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("hol_2027_001");
    expect(result[0]?.date).toBe("2027-03-14");
  });

  test("sends the api key header and year query", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    const provider = createApiIndonesiaHolidayProvider({
      config,
      fetchImpl: async (input, init) => {
        capturedUrl = String(input);
        capturedHeaders = Object.fromEntries(
          new Headers(init?.headers).entries(),
        );
        return jsonResponse({ data: [] });
      },
    });

    await provider.fetchByYear(2026);
    expect(capturedUrl).toBe("https://provider.test/api/v1/libur?tahun=2026");
    expect(capturedHeaders["x-api-key"]).toBe("test-key");
  });

  test("auth failure maps to ServiceUnavailableError", async () => {
    const provider = createApiIndonesiaHolidayProvider({
      config,
      fetchImpl: async () => jsonResponse({ message: "unauthorized" }, 401),
    });

    await expect(provider.fetchByYear(2027)).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });

  test("server error maps to ServiceUnavailableError", async () => {
    const provider = createApiIndonesiaHolidayProvider({
      config,
      fetchImpl: async () => jsonResponse({}, 500),
    });

    await expect(provider.fetchByYear(2027)).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });

  test("network failure maps to ServiceUnavailableError", async () => {
    const provider = createApiIndonesiaHolidayProvider({
      config,
      fetchImpl: async () => {
        throw new Error("ECONNREFUSED");
      },
    });

    await expect(provider.fetchByYear(2027)).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });

  test("malformed JSON maps to PROVIDER_INVALID_RESPONSE", async () => {
    const provider = createApiIndonesiaHolidayProvider({
      config,
      fetchImpl: async () =>
        new Response("<html>not json</html>", { status: 200 }),
    });

    try {
      await provider.fetchByYear(2027);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("PROVIDER_INVALID_RESPONSE");
    }
  });

  test("missing data array maps to PROVIDER_INVALID_RESPONSE", async () => {
    const provider = createApiIndonesiaHolidayProvider({
      config,
      fetchImpl: async () => jsonResponse({ foo: "bar" }),
    });

    try {
      await provider.fetchByYear(2027);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("PROVIDER_INVALID_RESPONSE");
    }
  });
});
