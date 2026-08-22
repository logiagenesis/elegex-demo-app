import { describe, expect, it, vi } from "vitest";
import { assertFieldServiceSchema } from "./database";

const requiredRows = [
  { TABLE_NAME: "jobs", COLUMN_NAME: "clientId" },
  { TABLE_NAME: "jobs", COLUMN_NAME: "siteId" },
  { TABLE_NAME: "jobs", COLUMN_NAME: "callOutTypeId" },
  { TABLE_NAME: "appSettings", COLUMN_NAME: "locale" },
  { TABLE_NAME: "appSettings", COLUMN_NAME: "currency" },
  { TABLE_NAME: "appSettings", COLUMN_NAME: "timezone" },
  { TABLE_NAME: "documents", COLUMN_NAME: "documentType" },
  { TABLE_NAME: "documents", COLUMN_NAME: "retentionYears" },
  { TABLE_NAME: "documents", COLUMN_NAME: "classificationLevel" },
];

describe("field-service schema guard", () => {
  it("accepts a database with every dashboard-required migration column", async () => {
    const execute = vi.fn().mockResolvedValue([requiredRows]);
    await expect(assertFieldServiceSchema({ execute } as any)).resolves.toEqual(
      { verifiedColumns: requiredRows.length }
    );
  });

  it("fails before serving requests when application code expects a missing migration column", async () => {
    const execute = vi.fn().mockResolvedValue([[...requiredRows.slice(0, -1)]]);
    await expect(assertFieldServiceSchema({ execute } as any)).rejects.toThrow(
      "documents.classificationLevel"
    );
  });
});
