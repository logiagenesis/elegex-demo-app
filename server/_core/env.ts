import { z } from "zod";

const logLevelSchema = z.enum([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
]);

const envSchema = z.object({
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
  OWNER_OPEN_ID: z.string().optional(),
  SEED_OPEN_ID: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: logLevelSchema.default("info"),
  OUTBOX_WORKER_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform(value => value === "true"),
  BUILT_IN_FORGE_API_URL: z.string().url().optional(),
  BUILT_IN_FORGE_API_KEY: z.string().min(1).optional(),
  VITE_FRONTEND_FORGE_API_URL: z.string().url().optional(),
  VITE_FRONTEND_FORGE_API_KEY: z.string().min(1).optional(),
});

type RawEnvironment = Record<string, string | undefined>;
export type RuntimeEnvironment = z.infer<typeof envSchema>;

const testDefaults: RawEnvironment = {
  VITE_APP_ID: "test-app-id",
  JWT_SECRET: "test-secret-must-be-16-chars",
  DATABASE_URL: "mysql://test:test@localhost:3306/test",
  OAUTH_SERVER_URL: "http://test-oauth.com",
  VITE_OAUTH_PORTAL_URL: "http://test-portal.com",
  NODE_ENV: "test",
  OWNER_OPEN_ID: "test-owner",
  SEED_OPEN_ID: "test-seed",
  BUILT_IN_FORGE_API_URL: "http://test-forge.com",
  BUILT_IN_FORGE_API_KEY: "test-forge-key",
  VITE_FRONTEND_FORGE_API_URL: "http://test-forge-frontend.com",
  VITE_FRONTEND_FORGE_API_KEY: "test-forge-frontend-key",
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

const runtimeEnvironment =
  process.env.NODE_ENV === "test"
    ? createTestEnvironment()
    : parseEnvironment(process.env);

export const ENV = {
  appId: runtimeEnvironment.VITE_APP_ID,
  cookieSecret: runtimeEnvironment.JWT_SECRET,
  databaseUrl: runtimeEnvironment.DATABASE_URL,
  oAuthServerUrl: runtimeEnvironment.OAUTH_SERVER_URL,
  ownerOpenId: runtimeEnvironment.OWNER_OPEN_ID ?? "",
  nodeEnv: runtimeEnvironment.NODE_ENV,
  port: runtimeEnvironment.PORT,
  logLevel: runtimeEnvironment.LOG_LEVEL,
  outboxWorkerEnabled: runtimeEnvironment.OUTBOX_WORKER_ENABLED,
  isDevelopment: runtimeEnvironment.NODE_ENV === "development",
  isProduction: runtimeEnvironment.NODE_ENV === "production",
  forgeApiUrl: runtimeEnvironment.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: runtimeEnvironment.BUILT_IN_FORGE_API_KEY ?? "",
};
