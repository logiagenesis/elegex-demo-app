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
  it("permits an upload-sized body only on the explicit upload procedure path", async () => {
    const payload = { data: "x".repeat(1_100_000) };

    const uploadResponse = await postJson(
      "/api/trpc/elegex.documents.upload",
      payload
    );
    const clientErrorResponse = await postJson("/api/client-errors", payload);

    expect(uploadResponse.status).toBe(200);
    expect(clientErrorResponse.status).toBe(413);
  });
});
