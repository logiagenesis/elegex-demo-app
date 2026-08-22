import { z } from "zod";

const logLevelSchema = z.enum([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
]);

const envSchema = z
  .object({
    VITE_APP_ID: z.string().min(1, "VITE_APP_ID is required"),
    JWT_SECRET: z
      .string()
      .min(16, "JWT_SECRET must be at least 16 characters for secure signing"),
    DATABASE_URL: z
      .string()
      .url("DATABASE_URL must be a valid connection string"),
    OAUTH_SERVER_URL: z.string().url("OAUTH_SERVER_URL must be a valid URL"),
    VITE_OAUTH_PORTAL_URL: z
      .string()
      .url("VITE_OAUTH_PORTAL_URL is required for login redirection"),
    PUBLIC_APP_ORIGIN: z.string().url().optional(),
    OWNER_OPEN_ID: z.string().optional(),
    SEED_OPEN_ID: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: logLevelSchema.default("info"),
    SLOW_QUERY_MS: z.coerce.number().int().min(10).max(60_000).default(750),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(1),
    METRICS_BEARER_TOKEN: z.string().min(24).optional(),
    OUTBOX_WORKER_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform(value => value === "true"),
    BUILT_IN_FORGE_API_URL: z.string().url().optional(),
    BUILT_IN_FORGE_API_KEY: z.string().min(1).optional(),
    VITE_FRONTEND_FORGE_API_URL: z.string().url().optional(),
    VITE_FRONTEND_FORGE_API_KEY: z.string().min(1).optional(),
    AUTH_PROVIDER: z.enum(["manus", "demo", "oidc", "dev"]).default("manus"),
    OIDC_ISSUER_URL: z.string().url().optional(),
    OIDC_CLIENT_ID: z.string().min(1).optional(),
    OIDC_CLIENT_SECRET: z.string().min(1).optional(),
    OIDC_REDIRECT_URI: z.string().url().optional(),
    STORAGE_PROVIDER: z.enum(["manus", "s3", "local"]).default("manus"),
    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().min(1).optional(),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    NOTIFICATION_PROVIDER: z
      .enum(["manus", "webhook", "email", "noop"])
      .default("manus"),
    NOTIFICATION_WEBHOOK_URL: z.string().url().optional(),
    SMTP_URL: z.string().url().optional(),
    NOTIFICATION_FROM: z.string().email().optional(),
    AI_PROVIDER: z.enum(["anthropic", "noop"]).default("noop"),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_MODEL: z.string().min(1).optional(),
    AI_DAILY_TOKEN_BUDGET: z.coerce.number().int().min(1).default(100_000),
    AI_INPUT_COST_MICROS_PER_MILLION: z.coerce.number().int().min(0).default(0),
    AI_OUTPUT_COST_MICROS_PER_MILLION: z.coerce
      .number()
      .int()
      .min(0)
      .default(0),
  })
  .superRefine((value, context) => {
    const require = (key: keyof typeof value) => {
      if (!value[key])
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${String(key)} is required for the selected provider`,
        });
    };
    if (
      value.NODE_ENV === "production" &&
      ["manus", "oidc"].includes(value.AUTH_PROVIDER)
    ) {
      require("PUBLIC_APP_ORIGIN");
      require("METRICS_BEARER_TOKEN");
    }
    if (value.AUTH_PROVIDER === "dev" && value.NODE_ENV === "production") {
      context.addIssue({
        code: "custom",
        path: ["AUTH_PROVIDER"],
        message: "AUTH_PROVIDER=dev is forbidden in production",
      });
    }
    if (value.AUTH_PROVIDER === "oidc") {
      require("OIDC_ISSUER_URL");
      require("OIDC_CLIENT_ID");
      require("OIDC_CLIENT_SECRET");
      require("OIDC_REDIRECT_URI");
    }
    if (value.STORAGE_PROVIDER === "local" && value.NODE_ENV === "production") {
      context.addIssue({
        code: "custom",
        path: ["STORAGE_PROVIDER"],
        message: "STORAGE_PROVIDER=local is forbidden in production",
      });
    }
    if (value.STORAGE_PROVIDER === "s3") {
      require("S3_ENDPOINT");
      require("S3_REGION");
      require("S3_BUCKET");
      require("S3_ACCESS_KEY_ID");
      require("S3_SECRET_ACCESS_KEY");
    }
    if (value.AI_PROVIDER === "anthropic") require("ANTHROPIC_API_KEY");
    if (value.NOTIFICATION_PROVIDER === "webhook")
      require("NOTIFICATION_WEBHOOK_URL");
    if (value.NOTIFICATION_PROVIDER === "email") {
      require("SMTP_URL");
      require("NOTIFICATION_FROM");
    }
  });

type RawEnvironment = Record<string, string | undefined>;
export type RuntimeEnvironment = z.infer<typeof envSchema>;

const testDefaults: RawEnvironment = {
  VITE_APP_ID: "test-app-id",
  JWT_SECRET: "test-secret-must-be-16-chars",
  DATABASE_URL: "mysql://test:test@localhost:3306/test",
  OAUTH_SERVER_URL: "http://test-oauth.com",
  VITE_OAUTH_PORTAL_URL: "http://test-portal.com",
  PUBLIC_APP_ORIGIN: "http://localhost:3000",
  NODE_ENV: "test",
  OWNER_OPEN_ID: "test-owner",
  SEED_OPEN_ID: "test-seed",
  BUILT_IN_FORGE_API_URL: "http://test-forge.com",
  BUILT_IN_FORGE_API_KEY: "test-forge-key",
  VITE_FRONTEND_FORGE_API_URL: "http://test-forge-frontend.com",
  VITE_FRONTEND_FORGE_API_KEY: "test-forge-frontend-key",
  AUTH_PROVIDER: "manus",
  STORAGE_PROVIDER: "manus",
  NOTIFICATION_PROVIDER: "noop",
  AI_PROVIDER: "noop",
};

export function parseEnvironment(raw: RawEnvironment): RuntimeEnvironment {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(issue => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}

export function createTestEnvironment(
  overrides: RawEnvironment = {}
): RuntimeEnvironment {
  return parseEnvironment({ ...testDefaults, ...overrides, NODE_ENV: "test" });
}

function getTestRuntimeOverrides(raw: RawEnvironment): RawEnvironment {
  return {
    PORT: raw.PORT,
    LOG_LEVEL: raw.LOG_LEVEL,
    SLOW_QUERY_MS: raw.SLOW_QUERY_MS,
    TRUST_PROXY_HOPS: raw.TRUST_PROXY_HOPS,
    METRICS_BEARER_TOKEN: raw.METRICS_BEARER_TOKEN,
    OUTBOX_WORKER_ENABLED: raw.OUTBOX_WORKER_ENABLED,
  };
}

const runtimeEnvironment =
  process.env.NODE_ENV === "test"
    ? createTestEnvironment(getTestRuntimeOverrides(process.env))
    : parseEnvironment(process.env);

export const ENV = {
  appId: runtimeEnvironment.VITE_APP_ID,
  cookieSecret: runtimeEnvironment.JWT_SECRET,
  databaseUrl: runtimeEnvironment.DATABASE_URL,
  oAuthServerUrl: runtimeEnvironment.OAUTH_SERVER_URL,
  publicAppOrigin: runtimeEnvironment.PUBLIC_APP_ORIGIN
    ? new URL(runtimeEnvironment.PUBLIC_APP_ORIGIN).origin
    : "",
  ownerOpenId: runtimeEnvironment.OWNER_OPEN_ID ?? "",
  nodeEnv: runtimeEnvironment.NODE_ENV,
  port: runtimeEnvironment.PORT,
  logLevel: runtimeEnvironment.LOG_LEVEL,
  slowQueryMs: runtimeEnvironment.SLOW_QUERY_MS,
  trustProxyHops: runtimeEnvironment.TRUST_PROXY_HOPS,
  metricsBearerToken: runtimeEnvironment.METRICS_BEARER_TOKEN ?? "",
  outboxWorkerEnabled: runtimeEnvironment.OUTBOX_WORKER_ENABLED,
  isDevelopment: runtimeEnvironment.NODE_ENV === "development",
  isProduction: runtimeEnvironment.NODE_ENV === "production",
  forgeApiUrl: runtimeEnvironment.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: runtimeEnvironment.BUILT_IN_FORGE_API_KEY ?? "",
  authProvider: runtimeEnvironment.AUTH_PROVIDER,
  oidcIssuerUrl: runtimeEnvironment.OIDC_ISSUER_URL ?? "",
  oidcClientId: runtimeEnvironment.OIDC_CLIENT_ID ?? "",
  oidcClientSecret: runtimeEnvironment.OIDC_CLIENT_SECRET ?? "",
  oidcRedirectUri: runtimeEnvironment.OIDC_REDIRECT_URI ?? "",
  storageProvider: runtimeEnvironment.STORAGE_PROVIDER,
  s3Endpoint: runtimeEnvironment.S3_ENDPOINT ?? "",
  s3Region: runtimeEnvironment.S3_REGION ?? "",
  s3Bucket: runtimeEnvironment.S3_BUCKET ?? "",
  s3AccessKeyId: runtimeEnvironment.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: runtimeEnvironment.S3_SECRET_ACCESS_KEY ?? "",
  notificationProvider: runtimeEnvironment.NOTIFICATION_PROVIDER,
  notificationWebhookUrl: runtimeEnvironment.NOTIFICATION_WEBHOOK_URL ?? "",
  smtpUrl: runtimeEnvironment.SMTP_URL ?? "",
  notificationFrom: runtimeEnvironment.NOTIFICATION_FROM ?? "",
  aiProvider: runtimeEnvironment.AI_PROVIDER,
  anthropicApiKey: runtimeEnvironment.ANTHROPIC_API_KEY ?? "",
  anthropicModel:
    runtimeEnvironment.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
  aiDailyTokenBudget: runtimeEnvironment.AI_DAILY_TOKEN_BUDGET,
  aiInputCostMicrosPerMillion:
    runtimeEnvironment.AI_INPUT_COST_MICROS_PER_MILLION,
  aiOutputCostMicrosPerMillion:
    runtimeEnvironment.AI_OUTPUT_COST_MICROS_PER_MILLION,
};
