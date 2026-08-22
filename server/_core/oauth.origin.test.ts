import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { getTrustedBrowserOrigin } from "./oauth";

function requestWithOrigin(origin: string): Request {
  return { query: { origin } } as unknown as Request;
}

describe("OAuth browser-origin validation", () => {
  it("accepts the configured canonical origin exactly", () => {
    expect(
      getTrustedBrowserOrigin(requestWithOrigin("http://localhost:3000"))
    ).toBe("http://localhost:3000");
  });

  it("rejects a different HTTPS origin instead of embedding it in the callback state", () => {
    expect(
      getTrustedBrowserOrigin(requestWithOrigin("https://attacker.example"))
    ).toBeUndefined();
  });

  it("rejects malformed origins", () => {
    expect(
      getTrustedBrowserOrigin(requestWithOrigin("not a URL"))
    ).toBeUndefined();
  });
});
