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
  VITE_OAUTH_PORTAL_URL: z
    .string()
    .url(
      "VITE_OAUTH_PORTAL_URL is required by the client for login redirection"
    ),
  OWNER_OPEN_ID: z.string().optional(),
  SEED_OPEN_ID: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BUILT_IN_FORGE_API_URL: z.string().optional(),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),
  VITE_FRONTEND_FORGE_API_URL: z.string().optional(),
  VITE_FRONTEND_FORGE_API_KEY: z.string().optional(),
  API_MASTER_KEY: z.string().min(16).optional(),
});

let validEnv: z.infer<typeof envSchema>;

if (process.env.NODE_ENV === "test") {
  // Provide mock values for test environment
  validEnv = {
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
    API_MASTER_KEY: "test-master-key-must-be-16-chars",
  };
} else {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment configuration:");
    parsed.error.issues.forEach(issue => {
      console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
    });
    // Fail fast in production or explicit development
    process.exit(1);
  }
  validEnv = parsed.data;
}

export const ENV = {
  appId: validEnv.VITE_APP_ID,
  cookieSecret: validEnv.JWT_SECRET,
  databaseUrl: validEnv.DATABASE_URL,
  oAuthServerUrl: validEnv.OAUTH_SERVER_URL,
  ownerOpenId: validEnv.OWNER_OPEN_ID || "",
  isProduction: validEnv.NODE_ENV === "production",
  forgeApiUrl: validEnv.BUILT_IN_FORGE_API_URL || "",
  forgeApiKey: validEnv.BUILT_IN_FORGE_API_KEY || "",
  apiMasterKey: validEnv.API_MASTER_KEY || "",
};
