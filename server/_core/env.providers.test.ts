import { describe, expect, it } from "vitest";
import { createTestEnvironment, parseEnvironment } from "./env";

const productionEnvironment = {
  VITE_APP_ID: "production-app",
  JWT_SECRET: "a-production-session-secret-with-sufficient-length",
  DATABASE_URL: "mysql://user:password@db.example.com:3306/elegex",
  OAUTH_SERVER_URL: "https://oauth.example.com",
  VITE_OAUTH_PORTAL_URL: "https://login.example.com",
  NODE_ENV: "production",
  AUTH_PROVIDER: "manus",
  STORAGE_PROVIDER: "manus",
  NOTIFICATION_PROVIDER: "noop",
  AI_PROVIDER: "noop",
  PUBLIC_APP_ORIGIN: "https://app.example.com",
  METRICS_BEARER_TOKEN: "a-production-metrics-token-at-least-24-characters",
} as const;

describe("provider environment guards", () => {
  it("rejects Anthropic mode when no server-side key is configured", () => {
    expect(() =>
      createTestEnvironment({
        AI_PROVIDER: "anthropic",
        ANTHROPIC_API_KEY: undefined,
      })
    ).toThrow("ANTHROPIC_API_KEY is required");
  });

  it("keeps the no-op AI provider available without external credentials", () => {
    expect(createTestEnvironment({ AI_PROVIDER: "noop" }).AI_PROVIDER).toBe(
      "noop"
    );
  });

  it("accepts the shareable demo authentication mode in a non-production runtime", () => {
    expect(
      createTestEnvironment({ AUTH_PROVIDER: "demo", NODE_ENV: "development" })
        .AUTH_PROVIDER
    ).toBe("demo");
  });

  it("allows the safe no-op notification provider without delivery credentials", () => {
    expect(
      createTestEnvironment({ NOTIFICATION_PROVIDER: "noop" })
        .NOTIFICATION_PROVIDER
    ).toBe("noop");
  });

  it("requires a canonical public origin for production OAuth callback flows", () => {
    expect(() =>
      parseEnvironment({
        ...productionEnvironment,
        PUBLIC_APP_ORIGIN: undefined,
      })
    ).toThrow("PUBLIC_APP_ORIGIN is required");
  });

  it("requires a strong metrics credential in production", () => {
    expect(() =>
      parseEnvironment({
        ...productionEnvironment,
        METRICS_BEARER_TOKEN: undefined,
      })
    ).toThrow("METRICS_BEARER_TOKEN is required");
  });
});
