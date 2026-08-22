import express from "express";

const UPLOAD_PROCEDURES = new Set([
  "elegex.documents.upload",
  "elegex.fieldService.foreman.evidence",
  "elegex.photos.upload",
]);
const TRPC_PREFIX = "/api/trpc/";

export function registerBodyParsers(app: express.Express) {
  // tRPC batches concurrent procedures into one comma-joined path. Parse the
  // list instead of mounting at literal paths so an upload keeps its limit even
  // when batched with an ordinary read, without widening other API routes.
  const uploadJson = express.json({ limit: "36mb" });
  app.use((req, res, next) => {
    if (!req.path.startsWith(TRPC_PREFIX)) return next();
    const procedures = req.path.slice(TRPC_PREFIX.length).split(",");
    return procedures.some(procedure => UPLOAD_PROCEDURES.has(procedure))
      ? uploadJson(req, res, next)
      : next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
}
