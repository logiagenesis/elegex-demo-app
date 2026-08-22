// Backward-compatible storage facade. New code uses the provider layer, while
// established call sites retain the same simple storagePut/storageGet contract.
import {
  storagePut as providerStoragePut,
  storageGetSignedUrl,
  storageRoute,
} from "./providers/storage";

export async function storagePut(
  relativeKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
) {
  return providerStoragePut(relativeKey, data, contentType);
}

export async function storageGet(relativeKey: string) {
  return {
    key: relativeKey.replace(/^\/+/, ""),
    url: storageRoute(relativeKey),
  };
}

export { storageGetSignedUrl };
