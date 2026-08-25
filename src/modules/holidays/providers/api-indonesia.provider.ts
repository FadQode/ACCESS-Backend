import type { ApiIndonesiaConfig } from "../../../config/env";
import {
  AppError,
  ServiceUnavailableError,
} from "../../../shared/errors";
import type { ExternalHoliday, HolidayProvider } from "../holidays.types";

// ponytail: structural fetch seam for tests — widen only if init grows beyond headers/signal
export type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<Response>;

export interface ApiIndonesiaHolidayProviderDependencies {
  config: ApiIndonesiaConfig;
  fetchImpl?: FetchLike;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const createApiIndonesiaHolidayProvider = ({
  config,
  fetchImpl = ((input, init) =>
    fetch(input, init as RequestInit)) as FetchLike,
}: ApiIndonesiaHolidayProviderDependencies): HolidayProvider => ({
  async fetchByYear(year: number): Promise<ExternalHoliday[]> {
    let response: Response;
    try {
      response = await fetchImpl(
        `${config.baseUrl}/api/v1/libur?tahun=${year}`,
        {
          headers: { "x-api-key": config.apiKey },
          signal: AbortSignal.timeout(config.timeoutMs),
        },
      );
    } catch {
      throw new ServiceUnavailableError(
        "Holiday provider is unreachable",
        "HOLIDAY_PROVIDER_UNREACHABLE",
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new ServiceUnavailableError(
        "Holiday provider rejected the configured API key",
        "HOLIDAY_PROVIDER_AUTH_FAILED",
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableError(
        `Holiday provider returned HTTP ${response.status}`,
        "HOLIDAY_PROVIDER_ERROR",
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AppError("Holiday provider returned malformed JSON", {
        code: "PROVIDER_INVALID_RESPONSE",
        statusCode: 502,
      });
    }

    const data = isRecord(payload) ? payload.data : undefined;
    if (!Array.isArray(data)) {
      throw new AppError(
        "Holiday provider response is missing the data array",
        { code: "PROVIDER_INVALID_RESPONSE", statusCode: 502 },
      );
    }

    return data
      .filter(isRecord)
      .map((item) => item as unknown as ExternalHoliday);
  },
});
