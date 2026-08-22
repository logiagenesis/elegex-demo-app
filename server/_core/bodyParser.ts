import express from "express";

export function registerBodyParsers(app: express.Express) {
  // Only these tRPC procedures carry base64 document payloads. Keeping the
  // larger parser at their boundary prevents unauthenticated observability and
  // ordinary API routes from accepting upload-sized request bodies.
  app.use(
    [
      "/api/trpc/elegex.documents.upload",
      "/api/trpc/elegex.fieldService.foreman.evidence",
    ],
    express.json({ limit: "36mb" })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
}
