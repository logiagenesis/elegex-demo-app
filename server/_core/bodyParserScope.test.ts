import { createServer } from "node:http";

import express from "express";
import { afterEach, describe, expect, it } from "vitest";

import { registerBodyParsers } from "./bodyParser";

const servers: ReturnType<typeof createServer>[] = [];

async function postJson(path: string, payload: unknown) {
  const app = express();
  registerBodyParsers(app);
  app.post(/.*/, (req, res) =>
    res.status(200).json({ received: Boolean(req.body) })
  );
  app.use(
    (
      error: { status?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => res.status(error.status ?? 500).json({ received: false })
  );
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Test server did not bind");

  return fetch(`http://127.0.0.1:${address.port}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        server => new Promise<void>(resolve => server.close(() => resolve()))
      )
  );
});

describe("request body parser scope", () => {
  it("permits upload-sized bodies for single and batched upload procedures only", async () => {
    const payload = { data: "x".repeat(3_000_000) };

    const uploadResponse = await postJson(
      "/api/trpc/elegex.documents.upload",
      payload
    );
    const firstBatchResponse = await postJson(
      "/api/trpc/elegex.photos.upload,elegex.workspace.current",
      payload
    );
    const secondBatchResponse = await postJson(
      "/api/trpc/elegex.workspace.current,elegex.photos.upload",
      payload
    );
    const readResponse = await postJson(
      "/api/trpc/elegex.workspace.current",
      payload
    );
    const clientErrorResponse = await postJson("/api/client-errors", payload);

    expect(uploadResponse.status).toBe(200);
    expect(firstBatchResponse.status).toBe(200);
    expect(secondBatchResponse.status).toBe(200);
    expect(readResponse.status).toBe(413);
    expect(clientErrorResponse.status).toBe(413);
  });
});
