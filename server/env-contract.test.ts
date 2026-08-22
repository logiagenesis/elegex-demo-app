import { describe, expect, it } from "vitest";
import { createTestEnvironment, parseEnvironment } from "./_core/env";

describe("environment configuration contract", () => {
  it("rejects incomplete production configuration with named validation failures", () => {
    expect(() =>
      parseEnvironment({ NODE_ENV: "production", VITE_APP_ID: "test-app" })
    ).toThrow(/DATABASE_URL/);
  });

  it("provides an explicit test-only configuration seam", () => {
    const environment = createTestEnvironment({ PORT: "4310" });
    expect(environment.NODE_ENV).toBe("test");
    expect(environment.PORT).toBe(4310);
    expect(environment.OUTBOX_WORKER_ENABLED).toBe(false);
  });

  it("parses constrained runtime feature flags and logging configuration", () => {
    const environment = createTestEnvironment({
      LOG_LEVEL: "debug",
      OUTBOX_WORKER_ENABLED: "true",
    });
    expect(environment.LOG_LEVEL).toBe("debug");
    expect(environment.OUTBOX_WORKER_ENABLED).toBe(true);
  });
});
