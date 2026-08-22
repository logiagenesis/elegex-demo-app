import { describe, expect, it, vi } from "vitest";
import {
  metricsMiddleware,
  metricsText,
  requestIdMiddleware,
} from "./observability";

describe("runtime observability", () => {
  it("assigns a bounded request ID and exposes it in the response", () => {
    const req = { get: vi.fn().mockReturnValue(undefined) } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();
    requestIdMiddleware(req, res, next);
    expect(req.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", req.id);
    expect(next).toHaveBeenCalledOnce();
  });

  it("records completed request status families in the metrics output", () => {
    let onFinish: (() => void) | undefined;
    const req = { method: "POST" } as any;
    const res = {
      statusCode: 503,
      on: vi.fn((_event, listener) => {
        onFinish = listener;
      }),
    } as any;
    metricsMiddleware(req, res, vi.fn());
    onFinish?.();
    expect(metricsText()).toContain(
      'elegex_http_requests_total{method="POST",status="5xx"} 1'
    );
  });
});
