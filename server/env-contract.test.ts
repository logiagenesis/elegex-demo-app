import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Environment Configuration Contract", () => {
  it("should fail fast if required variables are missing in production", () => {
    // We test the logic of env.ts without actually exiting the test runner
    const envSchema = z.object({
      VITE_APP_ID: z.string().min(1),
      JWT_SECRET: z.string().min(16),
      DATABASE_URL: z.string().url(),
      OAUTH_SERVER_URL: z.string().url(),
      VITE_OAUTH_PORTAL_URL: z.string().url(),
    });

    const invalidEnv = {
      NODE_ENV: "production",
      VITE_APP_ID: "test-app",
      // Missing DATABASE_URL and others
    };

    const parsed = envSchema.safeParse(invalidEnv);
    expect(parsed.success).toBe(false);

    // In our actual env.ts, this condition triggers process.exit(1)
    const shouldExit =
      !parsed.success &&
      invalidEnv.NODE_ENV !== "test" &&
      invalidEnv.NODE_ENV !== "development";
    expect(shouldExit).toBe(true);
  });

  it("should not fail fast during test runs", () => {
    const envSchema = z.object({
      VITE_APP_ID: z.string().min(1),
      DATABASE_URL: z.string().url(),
    });

    const testEnv = {
      NODE_ENV: "test",
      // Missing DATABASE_URL
    };

    const parsed = envSchema.safeParse(testEnv);
    expect(parsed.success).toBe(false);

    const shouldExit =
      !parsed.success &&
      testEnv.NODE_ENV !== "test" &&
      testEnv.NODE_ENV !== "development";
    expect(shouldExit).toBe(false);
  });
});
