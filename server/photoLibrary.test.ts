import { describe, expect, it } from "vitest";

import {
  buildDemoPhotoCorpusPlan,
  DEMO_PHOTO_CORPUS_SIZE,
  getDocumentHealth,
  normalizePhotoTags,
} from "./db";

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

  it("builds exactly 540 clearly synthetic placeholders across every supplied project, folder, and trade contributor", () => {
    const corpus = buildDemoPhotoCorpusPlan(
      [
        { id: 11, name: "Harbourview" },
        { id: 12, name: "Cedar" },
      ],
      [
        {
          id: 101,
          projectId: 11,
          name: "Electrical works",
          trade: "Electrical",
          category: "during",
        },
        {
          id: 102,
          projectId: 12,
          name: "Plumbing works",
          trade: "Plumbing",
          category: "during",
        },
      ],
      [
        { userId: 71, name: "Samira", trade: "Electrical" },
        { userId: 72, name: "Theo", trade: "Plumbing" },
        { userId: 73, name: "Lina", trade: "Tiling" },
      ]
    );

    expect(corpus).toHaveLength(DEMO_PHOTO_CORPUS_SIZE);
    expect(new Set(corpus.map(photo => photo.projectId))).toEqual(
      new Set([11, 12])
    );
    expect(new Set(corpus.map(photo => photo.folderId))).toEqual(
      new Set([101, 102])
    );
    expect(new Set(corpus.map(photo => photo.contributorTrade))).toEqual(
      new Set(["Electrical", "Plumbing", "Tiling"])
    );
    expect(
      corpus.every(photo => photo.storageKey.startsWith("demo-placeholder/"))
    ).toBe(true);
    expect(corpus[0]?.description).toContain(
      "Synthetic demonstration placeholder"
    );
  });
});
