import type { Express, Request, Response } from "express";

import { canUserReadStorageKey } from "../db";
import { getStorageProvider } from "../providers/storage";
import { assertStorageKey } from "../providers/storage/validation";

import { sdk } from "./sdk";

const PUBLIC_STORAGE_KEYS = new Set(["elegex-brand-mark_bd91b904.png"]);

function extractKey(req: Request) {
  const wildcard = (req.params as { key?: string | string[] }).key;
  return Array.isArray(wildcard) ? wildcard.join("/") : wildcard;
}

async function canReadStorageKey(req: Request, key: string) {
  if (PUBLIC_STORAGE_KEYS.has(key)) return true;
  try {
    const user = await sdk.authenticateRequest(req);
    return await canUserReadStorageKey(user.id, key);
  } catch {
    return false;
  }
}

async function serveStorage(req: Request, res: Response) {
  const rawKey = extractKey(req);
  if (!rawKey) {
    res.status(400).send("Missing storage key");
    return;
  }
  try {
    const key = assertStorageKey(rawKey);
    if (!(await canReadStorageKey(req, key))) {
      res.status(404).send("Storage object is unavailable");
      return;
    }
    const provider = getStorageProvider();
    const signedUrl = await provider.getSignedUrl(key);
    if (signedUrl.startsWith("local://")) {
      const body = await provider.read?.(key);
      if (!body) {
        res.status(404).send("Storage object not found");
        return;
      }
      res.set("Cache-Control", "private, no-store");
      res.type("application/octet-stream").status(200).send(body);
      return;
    }
    res.set("Cache-Control", "private, no-store");
    res.redirect(307, signedUrl);
  } catch {
    res.status(404).send("Storage object is unavailable");
  }
}

export function registerStorageProxy(app: Express) {
  app.get("/storage/*key", serveStorage);
  app.get("/manus-storage/*key", serveStorage);
}
