export type NodeEnvironment = "development" | "test" | "production";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type CookieSameSite = "strict" | "lax" | "none";
export type AiProvider = "mock" | "fastapi" | "llm";

export interface DatabaseConfig {
  connectTimeoutSeconds: number;
  idleTimeoutSeconds: number;
  maxConnections: number;
  url: string;
}

export interface AuthConfig {
  accessTokenSecret: string;
  accessTokenTtlSeconds: number;
  cookieSameSite: CookieSameSite;
  cookieSecure: boolean;
  passwordMinLength: number;
  refreshTokenSecret: string;
  refreshTokenTtlSeconds: number;
}

export interface RedisConfig {
  enabled: boolean;
  url: string;
}

export interface OpenApiConfig {
  enabled: boolean;
  path: string;
  specPath: string;
}

export interface AiConfig {
  apiKey?: string;
  baseUrl: string;
  enabled: boolean;
  provider: AiProvider;
  timeoutMs: number;
}

export interface SupabaseConfig {
  referenceBucket: string;
  referenceMaxFileSizeMb: number;
  serviceRoleKey?: string;
  signedUrlExpiresSeconds: number;
  url?: string;
}

export interface AppConfig {
  ai: AiConfig;
  appName: string;
  appVersion: string;
  auth: AuthConfig;
  corsCredentials: boolean;
  corsOrigins: string[];
  database: DatabaseConfig;
  host: string;
  logLevel: LogLevel;
  nodeEnv: NodeEnvironment;
  openApi: OpenApiConfig;
  port: number;
  redis: RedisConfig;
  supabase: SupabaseConfig;
}

type EnvironmentSource = Record<string, string | undefined>;

const allowedEnvironments = new Set<NodeEnvironment>([
  "development",
  "test",
  "production",
]);
const allowedLogLevels = new Set<LogLevel>([
  "debug",
  "info",
  "warn",
  "error",
]);
const allowedCookieSameSite = new Set<CookieSameSite>([
  "strict",
  "lax",
  "none",
]);
const allowedAiProviders = new Set<AiProvider>(["mock", "fastapi", "llm"]);

const readString = (
  value: string | undefined,
  fallback: string,
): string => {
  const resolved = value?.trim();
  return resolved ? resolved : fallback;
};

const readEnum = <T extends string>(
  value: string | undefined,
  fallback: T,
  allowed: Set<T>,
  name: string,
): T => {
  const resolved = (value ?? fallback) as T;

  if (!allowed.has(resolved)) {
    throw new Error(
      `${name} must be one of: ${Array.from(allowed).join(", ")}`,
    );
  }

  return resolved;
};

const readInteger = (
  value: string | undefined,
  fallback: number,
  name: string,
  minimum: number,
  maximum: number,
): number => {
  const resolved = Number(value ?? fallback);

  if (
    !Number.isInteger(resolved) ||
    resolved < minimum ||
    resolved > maximum
  ) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}`,
    );
  }

  return resolved;
};

const readBoolean = (
  value: string | undefined,
  fallback: boolean,
  name: string,
): boolean => {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${name} must be either true or false`);
};

const readCorsOrigins = (value: string | undefined): string[] => {
  const origins = readString(value, "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("CORS_ORIGINS must contain at least one origin");
  }

  return origins;
};

const readHttpPath = (
  value: string | undefined,
  fallback: string,
  name: string,
): string => {
  const path = readString(value, fallback);

  if (!path.startsWith("/") || path.length === 1 || path.endsWith("/")) {
    throw new Error(
      `${name} must start with /, contain a path segment, and not end with /`,
    );
  }

  return path;
};

const validateSecret = (
  secret: string,
  name: string,
  nodeEnv: NodeEnvironment,
): string => {
  if (nodeEnv === "production" && secret.length < 32) {
    throw new Error(`${name} must contain at least 32 characters in production`);
  }

  return secret;
};

export const loadEnv = (source: EnvironmentSource): AppConfig => {
  const nodeEnv = readEnum(
    source.NODE_ENV,
    "development",
    allowedEnvironments,
    "NODE_ENV",
  );
  const redisEnabled = readBoolean(
    source.REDIS_ENABLED,
    false,
    "REDIS_ENABLED",
  );
  const aiEnabled = readBoolean(source.AI_ENABLED, false, "AI_ENABLED");
  const redisUrl = readString(source.REDIS_URL, "redis://localhost:6379");
  const aiBaseUrl = readString(
    source.AI_BASE_URL,
    "http://localhost:8000",
  );
  const openApiPath = readHttpPath(
    source.OPENAPI_PATH,
    "/docs",
    "OPENAPI_PATH",
  );

  if (redisEnabled && !redisUrl) {
    throw new Error("REDIS_URL is required when REDIS_ENABLED is true");
  }

  if (aiEnabled && !aiBaseUrl) {
    throw new Error("AI_BASE_URL is required when AI_ENABLED is true");
  }

  return {
    ai: {
      ...(source.AI_API_KEY?.trim()
        ? { apiKey: source.AI_API_KEY.trim() }
        : {}),
      baseUrl: aiBaseUrl,
      enabled: aiEnabled,
      provider: readEnum(
        source.AI_PROVIDER,
        "mock",
        allowedAiProviders,
        "AI_PROVIDER",
      ),
      timeoutMs: readInteger(
        source.AI_TIMEOUT_MS,
        10_000,
        "AI_TIMEOUT_MS",
        100,
        120_000,
      ),
    },
    appName: readString(source.APP_NAME, "ACCESS Backend"),
    appVersion: readString(source.APP_VERSION, "0.1.0"),
    auth: {
      accessTokenSecret: validateSecret(
        readString(
          source.AUTH_ACCESS_TOKEN_SECRET,
          "development-access-token-secret",
        ),
        "AUTH_ACCESS_TOKEN_SECRET",
        nodeEnv,
      ),
      accessTokenTtlSeconds: readInteger(
        source.AUTH_ACCESS_TOKEN_TTL_SECONDS,
        604_800,
        "AUTH_ACCESS_TOKEN_TTL_SECONDS",
        60,
        31_536_000,
      ),
      cookieSameSite: readEnum(
        source.AUTH_COOKIE_SAME_SITE,
        "lax",
        allowedCookieSameSite,
        "AUTH_COOKIE_SAME_SITE",
      ),
      cookieSecure: readBoolean(
        source.AUTH_COOKIE_SECURE,
        nodeEnv === "production",
        "AUTH_COOKIE_SECURE",
      ),
      passwordMinLength: readInteger(
        source.AUTH_PASSWORD_MIN_LENGTH,
        8,
        "AUTH_PASSWORD_MIN_LENGTH",
        8,
        128,
      ),
      refreshTokenSecret: validateSecret(
        readString(
          source.AUTH_REFRESH_TOKEN_SECRET,
          "development-refresh-token-secret",
        ),
        "AUTH_REFRESH_TOKEN_SECRET",
        nodeEnv,
      ),
      refreshTokenTtlSeconds: readInteger(
        source.AUTH_REFRESH_TOKEN_TTL_SECONDS,
        604_800,
        "AUTH_REFRESH_TOKEN_TTL_SECONDS",
        300,
        31_536_000,
      ),
    },
    corsCredentials: readBoolean(
      source.CORS_CREDENTIALS,
      true,
      "CORS_CREDENTIALS",
    ),
    corsOrigins: readCorsOrigins(source.CORS_ORIGINS),
    database: {
      connectTimeoutSeconds: readInteger(
        source.DATABASE_CONNECT_TIMEOUT_SECONDS,
        10,
        "DATABASE_CONNECT_TIMEOUT_SECONDS",
        1,
        120,
      ),
      idleTimeoutSeconds: readInteger(
        source.DATABASE_IDLE_TIMEOUT_SECONDS,
        20,
        "DATABASE_IDLE_TIMEOUT_SECONDS",
        1,
        600,
      ),
      maxConnections: readInteger(
        source.DATABASE_MAX_CONNECTIONS,
        10,
        "DATABASE_MAX_CONNECTIONS",
        1,
        100,
      ),
      url: readString(
        source.DATABASE_URL,
        "postgres://postgres:postgres@localhost:5432/access",
      ),
    },
    host: readString(source.HOST, "0.0.0.0"),
    logLevel: readEnum(
      source.LOG_LEVEL,
      "info",
      allowedLogLevels,
      "LOG_LEVEL",
    ),
    nodeEnv,
    openApi: {
      enabled: readBoolean(
        source.OPENAPI_ENABLED,
        nodeEnv !== "production",
        "OPENAPI_ENABLED",
      ),
      path: openApiPath,
      specPath: `${openApiPath}/openapi.json`,
    },
    port: readInteger(source.PORT, 3000, "PORT", 1, 65_535),
    redis: {
      enabled: redisEnabled,
      url: redisUrl,
    },
    supabase: {
      ...(source.SUPABASE_URL?.trim()
        ? { url: source.SUPABASE_URL.trim() }
        : {}),
      ...(source.SUPABASE_SERVICE_ROLE_KEY?.trim()
        ? { serviceRoleKey: source.SUPABASE_SERVICE_ROLE_KEY.trim() }
        : {}),
      referenceBucket: readString(
        source.SUPABASE_REFERENCE_BUCKET,
        "references_storage",
      ),
      signedUrlExpiresSeconds: readInteger(
        source.SUPABASE_SIGNED_URL_EXPIRES,
        3600,
        "SUPABASE_SIGNED_URL_EXPIRES",
        60,
        86_400,
      ),
      referenceMaxFileSizeMb: readInteger(
        source.REFERENCE_MAX_FILE_SIZE_MB,
        5,
        "REFERENCE_MAX_FILE_SIZE_MB",
        1,
        100,
      ),
    },
  };
};

export const env = loadEnv(Bun.env);
