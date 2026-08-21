import { describe, expect, it } from "vitest";
import { canEditRecords, canManageRecords, canManageWorkspace, DEMO_DATA_EXPECTATIONS, DEMO_RESET_RELATIONSHIPS, getDocumentHealth, hasDeterministicDemoReseed } from "./db";
import { canAccessWorkspaceAdministration, canAccessWorkspaceRoute, canEditWorkspaceRecords, canManageOperationalControls, workspaceRoutePolicy } from "../client/src/lib/access";

describe("Elegex role capabilities", () => {
  it("makes viewers read-only", () => {
    expect(canEditRecords("viewer")).toBe(false);
    expect(canManageRecords("viewer")).toBe(false);
  });

  it("allows managers to manage operational records but not the workspace", () => {
    expect(canEditRecords("manager")).toBe(true);
    expect(canManageRecords("manager")).toBe(true);
    expect(canManageWorkspace("manager")).toBe(false);
  });

  it("reserves workspace administration for owners and administrators", () => {
    expect(canManageWorkspace("owner")).toBe(true);
    expect(canManageWorkspace("admin")).toBe(true);
    expect(canManageWorkspace("member")).toBe(false);
  });

  it("keeps the five workspace roles on the intended permission ladder", () => {
    expect(canEditRecords("owner")).toBe(true);
    expect(canEditRecords("admin")).toBe(true);
    expect(canEditRecords("manager")).toBe(true);
    expect(canEditRecords("member")).toBe(true);
    expect(canEditRecords("viewer")).toBe(false);
    expect(canManageRecords("owner")).toBe(true);
    expect(canManageRecords("admin")).toBe(true);
    expect(canManageRecords("manager")).toBe(true);
    expect(canManageRecords("member")).toBe(false);
  });

  it("classifies only managed storage references with a key as available documents", () => {
    expect(getDocumentHealth({ storageKey: "elegex/7/documents/brief.pdf", storageUrl: "/manus-storage/brief.pdf" })).toBe("available");
    expect(getDocumentHealth({ storageKey: "", storageUrl: "/manus-storage/brief.pdf" })).toBe("unavailable");
    expect(getDocumentHealth({ storageKey: "legacy/file.pdf", storageUrl: "https://example.invalid/file.pdf" })).toBe("unavailable");
  });

  it("keeps the published six-month synthetic dataset at its documented relationship coverage", () => {
    expect(DEMO_DATA_EXPECTATIONS).toEqual({ months: 6, jobs: 36, visits: 36, materials: 72, evidence: 72, quotes: 12, invoices: 23, snapshots: 6, releaseRecords: 3 });
  });

  it("accepts only a complete same-tenant reset/reseed snapshot with every expected relationship restored", () => {
    const snapshot = {
      organizationId: 7,
      contacts: DEMO_RESET_RELATIONSHIPS.contacts,
      projects: DEMO_RESET_RELATIONSHIPS.projects,
      cases: DEMO_RESET_RELATIONSHIPS.cases,
      tasks: DEMO_RESET_RELATIONSHIPS.tasks,
      documents: DEMO_RESET_RELATIONSHIPS.documents,
      notifications: DEMO_RESET_RELATIONSHIPS.notifications,
      savedViews: DEMO_RESET_RELATIONSHIPS.savedViews,
      jobs: DEMO_DATA_EXPECTATIONS.jobs,
      visits: DEMO_DATA_EXPECTATIONS.visits,
      materials: DEMO_DATA_EXPECTATIONS.materials,
      evidence: DEMO_DATA_EXPECTATIONS.evidence,
      quotes: DEMO_DATA_EXPECTATIONS.quotes,
      invoices: DEMO_DATA_EXPECTATIONS.invoices,
      snapshots: DEMO_DATA_EXPECTATIONS.snapshots,
      releaseRecords: DEMO_DATA_EXPECTATIONS.releaseRecords,
      quoteItems: DEMO_DATA_EXPECTATIONS.quotes * DEMO_RESET_RELATIONSHIPS.quoteItemsPerQuote,
      releaseChecks: DEMO_DATA_EXPECTATIONS.releaseRecords * DEMO_RESET_RELATIONSHIPS.releaseChecksPerRelease,
      tenantIds: [7, 7, 7, 7],
    };
    expect(hasDeterministicDemoReseed(snapshot)).toBe(true);
    expect(hasDeterministicDemoReseed({ ...snapshot, materials: snapshot.materials - 1 })).toBe(false);
    expect(hasDeterministicDemoReseed({ ...snapshot, tenantIds: [7, 99] })).toBe(false);
  });

  it("shows privileged frontend navigation only to owners and administrators", () => {
    expect(canAccessWorkspaceAdministration("owner")).toBe(true);
    expect(canAccessWorkspaceAdministration("admin")).toBe(true);
    expect(canAccessWorkspaceAdministration("manager")).toBe(false);
    expect(canAccessWorkspaceAdministration("member")).toBe(false);
    expect(canAccessWorkspaceAdministration("viewer")).toBe(false);
    expect(canAccessWorkspaceAdministration()).toBe(false);
  });

  it("keeps operational control and editing affordances aligned with the five-role policy", () => {
    expect(canManageOperationalControls("owner")).toBe(true);
    expect(canManageOperationalControls("admin")).toBe(true);
    expect(canManageOperationalControls("manager")).toBe(true);
    expect(canManageOperationalControls("member")).toBe(false);
    expect(canManageOperationalControls("viewer")).toBe(false);
    expect(canEditWorkspaceRecords("member")).toBe(true);
    expect(canEditWorkspaceRecords("viewer")).toBe(false);
  });

  it("maps every declared workspace destination to a tested minimum role", () => {
    expect(workspaceRoutePolicy.map(entry => entry.path)).toEqual(["/", "/jobs", "/jobs/:id", "/field", "/dispatch", "/contacts", "/contacts/:id", "/projects", "/projects/:id", "/cases", "/cases/:id", "/tasks", "/documents", "/reports", "/notifications", "/staging", "/admin", "/settings"]);
    for (const route of workspaceRoutePolicy) {
      expect(canAccessWorkspaceRoute(route.path, undefined)).toBe(false);
      expect(canAccessWorkspaceRoute(route.path, "owner")).toBe(true);
      expect(canAccessWorkspaceRoute(route.path, "admin")).toBe(true);
      expect(canAccessWorkspaceRoute(route.path, "manager")).toBe(route.minimumRole !== "admin");
      expect(canAccessWorkspaceRoute(route.path, "member")).toBe(route.minimumRole === "viewer" || route.minimumRole === "member");
      expect(canAccessWorkspaceRoute(route.path, "viewer")).toBe(route.minimumRole === "viewer");
    }
    expect(canAccessWorkspaceRoute("/unknown", "owner")).toBe(false);
  });
});
