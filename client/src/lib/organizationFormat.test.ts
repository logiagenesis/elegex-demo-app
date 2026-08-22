import { describe, expect, it } from "vitest";
import {
  formatOrganizationDateTime,
  formatOrganizationMoney,
  normalizeOrganizationFormat,
} from "./organizationFormat";

describe("organization formatting", () => {
  it("defaults safely to the South African organisation presentation contract", () => {
    expect(normalizeOrganizationFormat()).toEqual({
      locale: "en-ZA",
      currency: "ZAR",
      timezone: "Africa/Johannesburg",
    });
    expect(formatOrganizationMoney(1234.5)).toContain("R");
  });

  it("formats timestamps in the configured Johannesburg timezone", () => {
    const result = formatOrganizationDateTime("2026-08-22T10:30:00.000Z");
    expect(result).toContain("12:30");
  });

  it("honours an alternative per-organisation currency without changing stored values", () => {
    expect(
      formatOrganizationMoney(99, {
        locale: "en-US",
        currency: "USD",
        timezone: "UTC",
      })
    ).toContain("$");
  });
});
