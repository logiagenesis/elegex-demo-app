import type { Request, Response } from "express";

/** Ensures API misses remain machine-readable and never fall through to the SPA HTML document. */
export function apiNotFoundHandler(_request: Request, response: Response) {
  return response.status(404).type("application/json").send({
    error: "API_ROUTE_NOT_FOUND",
    message: "The requested API route is not registered.",
  });
}
