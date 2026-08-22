import { ENV } from "../../_core/env";

import type { StorageProvider } from "./types";
import { assertStorageKey } from "./validation";

function forgeConfig() {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    throw new Error("Manus storage configuration is unavailable");
  }
  return {
    baseUrl: ENV.forgeApiUrl.replace(/\/+$/, ""),
    token: ENV.forgeApiKey,
  };
}

export const manusStorageProvider: StorageProvider = {
  id: "manus",
  async put({ key, body, contentType }) {
    const safeKey = assertStorageKey(key);
    const { baseUrl, token } = forgeConfig();
    const presign = new URL("v1/storage/presign/put", `${baseUrl}/`);
    presign.searchParams.set("path", safeKey);
    const response = await fetch(presign, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Manus storage upload signing failed");
    const { url } = (await response.json()) as { url?: string };
    if (!url) throw new Error("Manus storage returned no upload URL");
    const upload = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: typeof body === "string" ? body : new Uint8Array(body),
    });
    if (!upload.ok) throw new Error("Manus storage upload failed");
  },
  async getSignedUrl(key) {
    const safeKey = assertStorageKey(key);
    const { baseUrl, token } = forgeConfig();
    const presign = new URL("v1/storage/presign/get", `${baseUrl}/`);
    presign.searchParams.set("path", safeKey);
    const response = await fetch(presign, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Manus storage download signing failed");
    const { url } = (await response.json()) as { url?: string };
    if (!url) throw new Error("Manus storage returned no download URL");
    return url;
  },
  async delete() {
    // The platform intentionally does not expose an object-delete endpoint.
    // Metadata unlinking remains the safe retention mechanism for Manus storage.
  },
};
