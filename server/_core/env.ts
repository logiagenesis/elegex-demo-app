import { z } from "zod";

const envSchema = z.object({
  VITE_APP_ID: z.string().min(1, "VITE_APP_ID is required"),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters for secure signing"),
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid connection string"),
  OAUTH_SERVER_URL: z.string().url("OAUTH_SERVER_URL must be a valid URL"),
  OWNER_OPEN_ID: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BUILT_IN_FORGE_API_URL: z.string().optional(),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  parsed.error.issues.forEach(issue => {
    console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
  });

  // Fail fast in production or explicit development, but allow tooling to run
  if (
    process.env.NODE_ENV !== "test" &&
    process.env.NODE_ENV !== "development"
  ) {
    process.exit(1);
  }
}

const validEnv = parsed.success ? parsed.data : (process.env as any);

export const ENV = {
  appId: validEnv.VITE_APP_ID || "",
  cookieSecret: validEnv.JWT_SECRET || "",
  databaseUrl: validEnv.DATABASE_URL || "",
  oAuthServerUrl: validEnv.OAUTH_SERVER_URL || "",
  ownerOpenId: validEnv.OWNER_OPEN_ID || "",
  isProduction: validEnv.NODE_ENV === "production",
  forgeApiUrl: validEnv.BUILT_IN_FORGE_API_URL || "",
  forgeApiKey: validEnv.BUILT_IN_FORGE_API_KEY || "",
};
