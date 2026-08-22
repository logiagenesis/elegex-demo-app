import { randomUUID } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

const startedAt = Date.now();
const requestCounts = new Map<string, number>();

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requested = req.get("x-request-id");
  const requestId =
    requested && /^[A-Za-z0-9._-]{8,120}$/.test(requested)
      ? requested
      : randomUUID();
  req.id = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.on("finish", () => {
    const family = `${req.method}_${Math.floor(res.statusCode / 100)}xx`;
    requestCounts.set(family, (requestCounts.get(family) ?? 0) + 1);
  });
  next();
}

export function metricsText() {
  const lines = [
    "# HELP elegex_process_uptime_seconds Process uptime in seconds.",
    "# TYPE elegex_process_uptime_seconds gauge",
    `elegex_process_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`,
    "# HELP elegex_http_requests_total Completed HTTP requests by method and status family.",
    "# TYPE elegex_http_requests_total counter",
  ];
  Array.from(requestCounts.entries()).forEach(([key, value]) => {
    const [method, status] = key.split("_");
    lines.push(
      `elegex_http_requests_total{method="${method}",status="${status}"} ${value}`
    );
  });
  return `${lines.join("\n")}\n`;
}
