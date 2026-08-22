import { ENV } from "../../_core/env";

import { localStorageProvider } from "./local";
import { manusStorageProvider } from "./manus";
import { s3StorageProvider } from "./s3";
import type { StorageProvider } from "./types";
import { assertStorageKey, makeImmutableStorageKey } from "./validation";

export * from "./types";
export {
  assertStorageKey,
  makeImmutableStorageKey,
  validateUpload,
} from "./validation";

export function getStorageProvider(): StorageProvider {
  if (ENV.storageProvider === "s3") return s3StorageProvider;
  if (ENV.storageProvider === "local") return localStorageProvider;
  return manusStorageProvider;
}

export function storageRoute(key: string) {
  return `/storage/${assertStorageKey(key)}`;
}

export async function storagePut(
  relativeKey: string,
  body: Uint8Array | Buffer | string,
  contentType = "application/octet-stream"
) {
  const fileName = relativeKey.split("/").pop() ?? "upload";
  const prefix = relativeKey.includes("/")
    ? relativeKey.slice(0, relativeKey.lastIndexOf("/"))
    : "uploads";
  const key = makeImmutableStorageKey(prefix, fileName);
  await getStorageProvider().put({ key, body, contentType });
  return { key, url: storageRoute(key) };
}

export async function storageGetSignedUrl(key: string) {
  return getStorageProvider().getSignedUrl(assertStorageKey(key));
}
