import { describe, expect, it, vi } from "vitest";
import { apiNotFoundHandler } from "./_core/apiFallback";

describe("API fallback", () => {
  it("returns a JSON 404 contract rather than allowing an unmatched API request to receive the SPA HTML document", () => {
    const send = vi.fn();
    const type = vi.fn(() => ({ send }));
    const status = vi.fn(() => ({ type }));
    apiNotFoundHandler({} as any, { status } as any);
    expect(status).toHaveBeenCalledWith(404);
    expect(type).toHaveBeenCalledWith("application/json");
    expect(send).toHaveBeenCalledWith({ error: "API_ROUTE_NOT_FOUND", message: "The requested API route is not registered." });
  });
});
