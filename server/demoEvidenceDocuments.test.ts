import { describe, expect, it } from "vitest";

import { buildDemoEvidenceDocument } from "./db";

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
});
