import { describe, expect, it } from "vitest";
import { parseSeedEnvironment } from "./seed-config.mjs";

describe("demo seed configuration", () => {
  it("rejects a missing database target before seed writes begin", () => {
    expect(() => parseSeedEnvironment({})).toThrow(/DATABASE_URL/);
  });

  it("rejects malformed database and owner-email values", () => {
    expect(() =>
      parseSeedEnvironment({
        DATABASE_URL: "not-a-url",
        SEED_OWNER_EMAIL: "not-an-email",
      })
    ).toThrow(/Invalid demo seed configuration/);
  });

  it("uses an explicit seed owner in preference to the generic owner and preserves safe demo defaults", () => {
    expect(
      parseSeedEnvironment({
        DATABASE_URL: "mysql://seed:seed@localhost:3306/elegex_seed",
        OWNER_OPEN_ID: "generic-owner",
        SEED_OPEN_ID: "seed-owner",
      })
    ).toEqual({
      databaseUrl: "mysql://seed:seed@localhost:3306/elegex_seed",
      ownerOpenId: "seed-owner",
      ownerName: "Demo Workspace Owner",
      ownerEmail: "owner@elegex.demo",
    });
  });
});
