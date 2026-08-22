import { describe, expect, it } from "vitest";
import {
  buildProjectReportCsv,
  filterProjectReportRows,
  getPageBounds,
  normalizeProjectReportFilters,
  sortWorkspaceRecords,
  validateRecordDraft,
} from "./workspace-ui";

describe("workspace frontend interaction helpers", () => {
  const rows = [
    {
      code: "CD-118",
      project: "Cedar, Intake",
      status: "active",
      priority: "urgent",
      progress: 48,
      dueDate: "2026-08-24T00:00:00.000Z",
      budget: 365000,
      contact: 'Lucas "Luke" Mthembu',
      updatedAt: "2026-08-20T00:00:00.000Z",
    },
    {
      code: "HV-024",
      project: "Harbourview Transition",
      status: "active",
      priority: "high",
      progress: 72,
      dueDate: null,
      budget: 480000,
      contact: "Aisha Naidoo",
      updatedAt: "2026-08-21T00:00:00.000Z",
    },
    {
      code: "HS-071",
      project: "Helio Standards",
      status: "planning",
      priority: "medium",
      progress: 12,
      dueDate: null,
      budget: 275000,
      contact: "Elena Meyer",
      updatedAt: "2026-08-19T00:00:00.000Z",
    },
  ];

  it("applies saved-report filters defensively and preserves only valid values", () => {
    expect(
      normalizeProjectReportFilters({ status: "active", priority: "urgent" })
    ).toEqual({ status: "active", priority: "urgent" });
    expect(
      normalizeProjectReportFilters({
        status: "unexpected",
        priority: "critical",
      })
    ).toEqual({ status: "all", priority: "all" });
    expect(
      filterProjectReportRows(rows, {
        status: "active",
        priority: "urgent",
      }).map(row => row.code)
    ).toEqual(["CD-118"]);
  });

  it("exports filtered report rows as escaped, stable CSV data", () => {
    const csv = buildProjectReportCsv(
      filterProjectReportRows(rows, { status: "active", priority: "urgent" })
    );
    expect(csv).toContain(
      "Project code,Project,Status,Priority,Progress,Due date,Budget,Contact"
    );
    expect(csv).toContain('"Cedar, Intake"');
    expect(csv).toContain('"Lucas ""Luke"" Mthembu"');
    expect(csv).toContain('"2026-08-24"');
    expect(csv.split("\n")).toHaveLength(2);
  });

  it("sorts record registries without mutating the queried data and calculates pagination limits", () => {
    const originalCodes = rows.map(row => row.code);
    expect(sortWorkspaceRecords(rows, "name").map(row => row.code)).toEqual([
      "CD-118",
      "HV-024",
      "HS-071",
    ]);
    expect(sortWorkspaceRecords(rows, "updated").map(row => row.code)).toEqual([
      "HV-024",
      "CD-118",
      "HS-071",
    ]);
    expect(rows.map(row => row.code)).toEqual(originalCodes);
    expect(getPageBounds(17, 8, 8)).toEqual({
      page: 3,
      pageCount: 3,
      canGoPrevious: true,
      canGoNext: false,
    });
    expect(getPageBounds(0, 2, 8)).toEqual({
      page: 1,
      pageCount: 1,
      canGoPrevious: false,
      canGoNext: false,
    });
  });

  it("gates incomplete create forms before a mutation can be initiated", () => {
    expect(validateRecordDraft("contacts", {})).toBe(
      "A contact name is required"
    );
    expect(validateRecordDraft("projects", { name: "Delivery" })).toBe(
      "Project name and code are required"
    );
    expect(validateRecordDraft("cases", { title: "Escalation" })).toBe(
      "Case title and reference are required"
    );
    expect(
      validateRecordDraft("projects", { name: "Delivery", code: "DL-101" })
    ).toBeNull();
  });
});
