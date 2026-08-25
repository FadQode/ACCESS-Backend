export type NodeEnvironment = "development" | "test" | "production";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type CookieSameSite = "strict" | "lax" | "none";
export type AiProvider = "mock" | "fastapi" | "llm" | "opencode";

export interface ApiIndonesiaConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}

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
  chatCompletionsUrl: string;
  enabled: boolean;
  guidelinesPath: string;
  maxInputChars: number;
  maxOutputTokens: number;
  model: string;
  provider: AiProvider;
  temperature: number;
  timeoutMs: number;
}

export interface EmbeddingConfig {
  apiKey?: string;
  batchSize: number;
  batchServiceUrl: string;
  dimension: number;
  enabled: boolean;
  healthUrl: string;
  model: string;
  serviceUrl: string;
  timeoutMs: number;
  version: number;
}

export interface SemanticContextConfig {
  candidateLimit: number;
  caseLimit: number;
  categoryBoost: number;
  enabled: boolean;
  minRawSimilarity: number;
  minScore: number;
  referenceLimit: number;
  referenceSourceTypeBoost: number;
  resolvedCaseRecencyBoost: number;
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
  apiIndonesia: ApiIndonesiaConfig;
  appName: string;
  appVersion: string;
  auth: AuthConfig;
  corsCredentials: boolean;
  corsOrigins: string[];
  database: DatabaseConfig;
  embedding: EmbeddingConfig;
  host: string;
  logLevel: LogLevel;
  nodeEnv: NodeEnvironment;
  openApi: OpenApiConfig;
  port: number;
  redis: RedisConfig;
  semanticContext: SemanticContextConfig;
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
const allowedAiProviders = new Set<AiProvider>([
  "mock",
  "fastapi",
  "llm",
  "opencode",
]);

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

const readNumber = (
  value: string | undefined,
  fallback: number,
  name: string,
  minimum: number,
  maximum: number,
): number => {
  const resolved = Number(value ?? fallback);

  if (!Number.isFinite(resolved) || resolved < minimum || resolved > maximum) {
    throw new Error(`${name} must be a number between ${minimum} and ${maximum}`);
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
  const embeddingEnabled = readBoolean(
    source.EMBEDDING_ENABLED,
    false,
    "EMBEDDING_ENABLED",
  );
  const redisUrl = readString(source.REDIS_URL, "redis://localhost:6379");
  const aiChatCompletionsUrl = readString(
    source.AI_CHAT_COMPLETIONS_URL ?? source.AI_BASE_URL,
    "http://localhost:20128/v1/chat/completions",
  );
  const embeddingServiceUrl = readString(
    source.EMBEDDING_SERVICE_URL,
    "https://fadq-access-embedding.hf.space/embed",
  );
  const embeddingBatchServiceUrl = readString(
    source.EMBEDDING_BATCH_SERVICE_URL,
    "https://fadq-access-embedding.hf.space/embed/batch",
  );
  const embeddingHealthUrl = readString(
    source.EMBEDDING_HEALTH_URL,
    "https://fadq-access-embedding.hf.space/health",
  );
  const openApiPath = readHttpPath(
    source.OPENAPI_PATH,
    "/docs",
    "OPENAPI_PATH",
  );

  if (redisEnabled && !redisUrl) {
    throw new Error("REDIS_URL is required when REDIS_ENABLED is true");
  }

  if (aiEnabled && !aiChatCompletionsUrl) {
    throw new Error(
      "AI_CHAT_COMPLETIONS_URL is required when AI_ENABLED is true",
    );
  }

  if (embeddingEnabled && !source.EMBEDDING_API_KEY?.trim()) {
    throw new Error(
      "EMBEDDING_API_KEY is required when EMBEDDING_ENABLED is true",
    );
  }

  return {
    ai: {
      ...(source.AI_API_KEY?.trim()
        ? { apiKey: source.AI_API_KEY.trim() }
        : {}),
      chatCompletionsUrl: aiChatCompletionsUrl,
      enabled: aiEnabled,
      guidelinesPath: readString(
        source.AI_GUIDELINES_PATH,
        "src/modules/quick-responses/prompts/heat-guidelines.txt",
      ),
      maxInputChars: readInteger(
        source.AI_MAX_INPUT_CHARS,
        15_000,
        "AI_MAX_INPUT_CHARS",
        100,
        100_000,
      ),
      maxOutputTokens: readInteger(
        source.AI_MAX_OUTPUT_TOKENS,
        10_000,
        "AI_MAX_OUTPUT_TOKENS",
        1,
        32_768,
      ),
      model: readString(source.AI_MODEL ?? source.MODEL, "oc/deepseek-v4-flash-free"),
      provider: readEnum(
        source.AI_PROVIDER,
        "mock",
        allowedAiProviders,
        "AI_PROVIDER",
      ),
      temperature: readNumber(
        source.AI_TEMPERATURE,
        0.3,
        "AI_TEMPERATURE",
        0,
        2,
      ),
      timeoutMs: readInteger(
        source.AI_TIMEOUT_MS,
        20_000,
        "AI_TIMEOUT_MS",
        100,
        120_000,
      ),
    },
    apiIndonesia: {
      apiKey: readString(source.API_INDONESIA_API_KEY, ""),
      baseUrl: readString(
        source.API_INDONESIA_BASE_URL,
        "https://use.apiindonesia.id",
      ),
      timeoutMs: readInteger(
        source.API_INDONESIA_TIMEOUT_MS,
        15_000,
        "API_INDONESIA_TIMEOUT_MS",
        1_000,
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
    embedding: {
      ...(source.EMBEDDING_API_KEY?.trim()
        ? { apiKey: source.EMBEDDING_API_KEY.trim() }
        : {}),
      batchServiceUrl: embeddingBatchServiceUrl,
      batchSize: readInteger(
        source.EMBEDDING_BATCH_SIZE,
        16,
        "EMBEDDING_BATCH_SIZE",
        1,
        128,
      ),
      dimension: readInteger(
        source.EMBEDDING_DIMENSION,
        384,
        "EMBEDDING_DIMENSION",
        1,
        4096,
      ),
      enabled: embeddingEnabled,
      healthUrl: embeddingHealthUrl,
      model: readString(
        source.EMBEDDING_MODEL,
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
      ),
      serviceUrl: embeddingServiceUrl,
      timeoutMs: readInteger(
        source.EMBEDDING_TIMEOUT_MS,
        10_000,
        "EMBEDDING_TIMEOUT_MS",
        100,
        120_000,
      ),
      version: readInteger(
        source.EMBEDDING_VERSION,
        2,
        "EMBEDDING_VERSION",
        1,
        1_000,
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
    semanticContext: {
      candidateLimit: readInteger(
        source.SEMANTIC_CANDIDATE_LIMIT,
        10,
        "SEMANTIC_CANDIDATE_LIMIT",
        1,
        100,
      ),
      caseLimit: readInteger(
        source.SEMANTIC_CASE_LIMIT,
        3,
        "SEMANTIC_CASE_LIMIT",
        0,
        20,
      ),
      categoryBoost: readNumber(
        source.SEMANTIC_CATEGORY_BOOST,
        2,
        "SEMANTIC_CATEGORY_BOOST",
        0,
        10,
      ),
      enabled: readBoolean(
        source.SEMANTIC_CONTEXT_ENABLED,
        true,
        "SEMANTIC_CONTEXT_ENABLED",
      ),
      minRawSimilarity: readNumber(
        source.SEMANTIC_MIN_RAW_SIMILARITY,
        0.5,
        "SEMANTIC_MIN_RAW_SIMILARITY",
        -1,
        1,
      ),
      minScore: readNumber(
        source.SEMANTIC_MIN_SCORE,
        8.5,
        "SEMANTIC_MIN_SCORE",
        0,
        50,
      ),
      referenceLimit: readInteger(
        source.SEMANTIC_REFERENCE_LIMIT,
        3,
        "SEMANTIC_REFERENCE_LIMIT",
        0,
        20,
      ),
      referenceSourceTypeBoost: readNumber(
        source.SEMANTIC_REFERENCE_SOURCE_TYPE_BOOST,
        0.5,
        "SEMANTIC_REFERENCE_SOURCE_TYPE_BOOST",
        0,
        10,
      ),
      resolvedCaseRecencyBoost: readNumber(
        source.SEMANTIC_RESOLVED_CASE_RECENCY_BOOST,
        0.3,
        "SEMANTIC_RESOLVED_CASE_RECENCY_BOOST",
        0,
        10,
      ),
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
