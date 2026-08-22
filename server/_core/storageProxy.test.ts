import { once } from "node:events";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  canUserReadStorageKey: vi.fn(),
}));
vi.mock("../providers/storage", () => ({
  getStorageProvider: vi.fn(),
}));
vi.mock("./sdk", () => ({
  sdk: { authenticateRequest: vi.fn() },
}));

import { canUserReadStorageKey } from "../db";
import { getStorageProvider } from "../providers/storage";
import { sdk } from "./sdk";
import { registerStorageProxy } from "./storageProxy";

const mockedCanUserReadStorageKey = vi.mocked(canUserReadStorageKey);
const mockedGetStorageProvider = vi.mocked(getStorageProvider);
const mockedAuthenticateRequest = vi.mocked(sdk.authenticateRequest);

async function requestStorage(path: string, init?: RequestInit) {
  const app = express();
  registerStorageProxy(app);
  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  try {
    return await fetch(`http://127.0.0.1:${port}${path}`, {
      redirect: "manual",
      ...init,
    });
  } finally {
    server.close();
  }
}

describe("storage proxy authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedGetStorageProvider.mockReturnValue({
      getSignedUrl: vi
        .fn()
        .mockResolvedValue("https://objects.example.com/object"),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the explicit public brand asset available without a session", async () => {
    const response = await requestStorage(
      "/manus-storage/elegex-brand-mark_bd91b904.png"
    );

    expect(response.status).toBe(307);
    expect(mockedAuthenticateRequest).not.toHaveBeenCalled();
    expect(mockedCanUserReadStorageKey).not.toHaveBeenCalled();
  });

  it("returns a non-disclosing not-found response for a private key without a valid session", async () => {
    mockedAuthenticateRequest.mockRejectedValue(new Error("unauthenticated"));

    const response = await requestStorage(
      "/storage/elegex/9/documents/secret.pdf"
    );

    expect(response.status).toBe(404);
    expect(mockedGetStorageProvider).not.toHaveBeenCalled();
  });

  it("redirects only after the authenticated tenant has access to the requested key", async () => {
    mockedAuthenticateRequest.mockResolvedValue({ id: 42 } as never);
    mockedCanUserReadStorageKey.mockResolvedValue(true);

    const response = await requestStorage(
      "/storage/elegex/42/documents/allowed.pdf"
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://objects.example.com/object"
    );
    expect(mockedCanUserReadStorageKey).toHaveBeenCalledWith(
      42,
      "elegex/42/documents/allowed.pdf"
    );
  });
});
