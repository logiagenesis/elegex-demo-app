import { describe, expect, it } from "vitest";

import { getDocumentHealth, normalizePhotoTags } from "./db";

describe("photo library metadata", () => {
  it("normalizes tags for case-insensitive search without retaining duplicates or blanks", () => {
    expect(normalizePhotoTags(["Pump", " safety ", "pump", "", "Access"])).toBe(
      "pump,safety,access"
    );
  });

  it("keeps the library index bounded to twelve normalized tags", () => {
    const tags = Array.from({ length: 15 }, (_, index) => `Tag ${index + 1}`);
    expect(normalizePhotoTags(tags).split(",")).toHaveLength(12);
  });

  it("only marks photo references available when they use a tenant-managed storage route", () => {
    expect(
      getDocumentHealth({
        storageKey: "elegex/30001/photos/site.png",
        storageUrl: "/storage/elegex/30001/photos/site.png",
      })
    ).toBe("available");
    expect(
      getDocumentHealth({
        storageKey: "elegex/30001/photos/site.png",
        storageUrl: "https://example.invalid/site.png",
      })
    ).toBe("unavailable");
  });
});
