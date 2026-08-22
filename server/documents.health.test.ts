import { describe, expect, it } from "vitest";

import { getDocumentHealth, isManagedStorageUrl } from "./db";

describe("document storage health", () => {
  it("recognizes the current vendor-neutral storage route", () => {
    expect(isManagedStorageUrl("/storage/organization/report.pdf")).toBe(true);
    expect(
      getDocumentHealth({
        storageKey: "organization/report.pdf",
        storageUrl: "/storage/organization/report.pdf",
      })
    ).toBe("available");
  });

  it("keeps legacy managed-storage document rows available", () => {
    expect(isManagedStorageUrl("/manus-storage/legacy-report.pdf")).toBe(true);
    expect(
      getDocumentHealth({
        storageKey: "legacy-report.pdf",
        storageUrl: "/manus-storage/legacy-report.pdf",
      })
    ).toBe("available");
  });

  it("rejects missing storage keys and off-platform URLs", () => {
    expect(
      getDocumentHealth({
        storageKey: null,
        storageUrl: "/storage/report.pdf",
      })
    ).toBe("unavailable");
    expect(isManagedStorageUrl("https://example.invalid/report.pdf")).toBe(
      false
    );
    expect(
      getDocumentHealth({
        storageKey: "report.pdf",
        storageUrl: "https://example.invalid/report.pdf",
      })
    ).toBe("unavailable");
  });
});
