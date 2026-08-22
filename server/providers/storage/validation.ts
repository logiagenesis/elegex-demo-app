import path from "node:path";

import { fileTypeFromBuffer } from "file-type";

const ALLOWED_TYPES = new Map([
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/png", ["png"]],
  ["image/webp", ["webp"]],
  ["application/pdf", ["pdf"]],
  ["video/mp4", ["mp4"]],
  ["video/webm", ["webm"]],
  ["text/plain", ["txt"]],
  ["text/csv", ["csv"]],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ["docx"],
  ],
]);

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function sanitizeFileName(fileName: string) {
  const baseName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "-");
  return baseName.replace(/^\.+/, "") || "upload";
}

export function assertStorageKey(key: string) {
  if (!key || key.includes("..") || key.startsWith("/")) {
    throw new Error("Invalid storage key");
  }
  return key;
}

export function makeImmutableStorageKey(
  prefix: string,
  fileName: string,
  randomId = crypto.randomUUID()
) {
  return `${prefix.replace(/\/+$/, "")}/${randomId}-${sanitizeFileName(fileName)}`;
}

export async function validateUpload(
  bytes: Buffer,
  declaredContentType: string,
  fileName: string
) {
  if (bytes.byteLength === 0) throw new Error("Uploads cannot be empty");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Upload exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit`
    );
  }
  const detected = await fileTypeFromBuffer(bytes);
  const extension = path
    .extname(sanitizeFileName(fileName))
    .slice(1)
    .toLowerCase();
  const allowedExtensions = ALLOWED_TYPES.get(declaredContentType);
  if (!allowedExtensions?.includes(extension)) {
    throw new Error(
      "File extension is not permitted for the declared media type"
    );
  }
  const docxZip =
    declaredContentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
    detected?.mime === "application/zip";
  if (detected && detected.mime !== declaredContentType && !docxZip) {
    throw new Error("File signature does not match its declared media type");
  }
  if (!ALLOWED_TYPES.has(declaredContentType)) {
    throw new Error("Unsupported upload media type");
  }
  return { contentType: declaredContentType, extension };
}
