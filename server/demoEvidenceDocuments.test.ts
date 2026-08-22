import { describe, expect, it } from "vitest";

import { buildDemoEvidenceDocument, selectDemoEvidenceCorpus } from "./db";

describe("demo evidence documents", () => {
  it("creates a detailed synthetic client sign-off document", () => {
    const document = buildDemoEvidenceDocument({
      evidenceType: "signature",
      evidenceTitle: "Client sign-off · #30035",
      capturedAt: new Date("2026-08-19T14:00:00.000Z"),
      jobNumber: "#30035",
      jobTitle: "Geyser thermostat replacement",
      serviceAddress: "3 Shoreline Road, Umhlanga",
      contactName: "T. Mokoena",
    });

    expect(document.fileName).toBe("Client-sign-off-30035.html");
    expect(document.html).toContain("Client completion sign-off");
    expect(document.html).toContain("Representative");
    expect(document.html).toContain("Demonstration record.");
  });

  it("creates a detailed synthetic before-condition document", () => {
    const document = buildDemoEvidenceDocument({
      evidenceType: "before_photo",
      evidenceTitle: "Before condition · #30035",
      capturedAt: new Date("2026-08-19T12:00:00.000Z"),
      jobNumber: "#30035",
      jobTitle: "Geyser thermostat replacement",
      serviceAddress: "3 Shoreline Road, Umhlanga",
      contactName: "T. Mokoena",
    });

    expect(document.fileName).toBe("Before-condition-30035.html");
    expect(document.html).toContain("Before-condition record");
    expect(document.html).toContain("Work-area controls");
  });

  it("selects exactly sixty linked, before-condition, and sign-off demo records", () => {
    const evidence = [
      {
        id: 1,
        evidenceType: "signature",
        storageUrl: "/storage/linked",
        metadata: { demo: true },
      },
      ...Array.from({ length: 36 }, (_, index) => ({
        id: index + 2,
        evidenceType: "before_photo",
        storageUrl: null,
        metadata: { demo: true },
      })),
      ...Array.from({ length: 25 }, (_, index) => ({
        id: index + 38,
        evidenceType: "signature",
        storageUrl: null,
        metadata: { demo: true },
      })),
      {
        id: 64,
        evidenceType: "note",
        storageUrl: null,
        metadata: { demo: true },
      },
    ];

    const selected = selectDemoEvidenceCorpus(evidence);
    expect(selected).toHaveLength(60);
    expect(selected[0]?.id).toBe(1);
    expect(
      selected.filter(item => item.evidenceType === "before_photo")
    ).toHaveLength(36);
    expect(
      selected.filter(item => item.evidenceType === "signature")
    ).toHaveLength(24);
  });
});
