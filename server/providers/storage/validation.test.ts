import { describe, expect, it } from "vitest";
import {
  assertStorageKey,
  makeImmutableStorageKey,
  MAX_UPLOAD_BYTES,
  validateUpload,
} from "./validation";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL7WQAAAABJRU5ErkJggg==",
  "base64"
);

describe("storage upload validation", () => {
  it("accepts a permitted PNG whose file signature matches its metadata", async () => {
    await expect(
      validateUpload(onePixelPng, "image/png", "site-photo.png")
    ).resolves.toEqual({ contentType: "image/png", extension: "png" });
  });

  it("rejects a client-declared image type that disagrees with magic bytes", async () => {
    await expect(
      validateUpload(onePixelPng, "image/jpeg", "site-photo.jpg")
    ).rejects.toThrow("File signature does not match");
  });

  it("accepts a six-megabyte payload but rejects a thirty-megabyte payload at the shared byte ceiling", async () => {
    await expect(
      validateUpload(
        Buffer.alloc(6 * 1024 * 1024),
        "application/pdf",
        "accepted.pdf"
      )
    ).resolves.toMatchObject({ contentType: "application/pdf" });

    await expect(
      validateUpload(
        Buffer.alloc(30 * 1024 * 1024),
        "application/pdf",
        "oversize.pdf"
      )
    ).rejects.toThrow(
      `Upload exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit`
    );
  });

  it("rejects traversal and creates unique immutable object references", () => {
    expect(() => assertStorageKey("../tenant-secret.pdf")).toThrow(
      "Invalid storage key"
    );
    expect(
      makeImmutableStorageKey("elegex/7/documents", "Site plan?.pdf", "a1")
    ).toBe("elegex/7/documents/a1-Site-plan-.pdf");
  });
});
