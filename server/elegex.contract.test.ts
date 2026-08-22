import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("Elegex protected workflow contract", () => {
  const procedures = Object.keys(appRouter._def.procedures)
    .filter(name => name.startsWith("elegex."))
    .sort();

  it("exposes the complete organization workspace workflow surface without undocumented procedures", () => {
    expect(procedures).toEqual([
      "elegex.admin.data",
      "elegex.admin.resetDemo",
      "elegex.admin.updateMemberRole",
      "elegex.admin.updateSettings",
      "elegex.ai.generateDraft",
      "elegex.cases.create",
      "elegex.cases.list",
      "elegex.cases.update",
      "elegex.contacts.create",
      "elegex.contacts.list",
      "elegex.contacts.update",
      "elegex.dashboard",
      "elegex.documents.list",
      "elegex.documents.materializeDemoCorpus",
      "elegex.documents.openEvidenceDocument",
      "elegex.documents.upload",
      "elegex.fieldService.dashboard",
      "elegex.fieldService.dispatch",
      "elegex.fieldService.foreman.checkIn",
      "elegex.fieldService.foreman.complete",
      "elegex.fieldService.foreman.consent",
      "elegex.fieldService.foreman.evidence",
      "elegex.fieldService.foreman.material",
      "elegex.fieldService.foreman.quote",
      "elegex.fieldService.foreman.today",
      "elegex.fieldService.jobs.archive",
      "elegex.fieldService.jobs.create",
      "elegex.fieldService.jobs.detail",
      "elegex.fieldService.jobs.linkInvoice",
      "elegex.fieldService.jobs.list",
      "elegex.fieldService.jobs.transition",
      "elegex.fieldService.reports",
      "elegex.integrations.databaseHealth",
      "elegex.integrations.dispatchable",
      "elegex.integrations.enqueue",
      "elegex.integrations.list",
      "elegex.integrations.upsert",
      "elegex.notifications.list",
      "elegex.notifications.markRead",
      "elegex.photos.archive",
      "elegex.photos.createFolder",
      "elegex.photos.folders",
      "elegex.photos.list",
      "elegex.photos.materializeDemoCorpus",
      "elegex.photos.upload",
      "elegex.projects.create",
      "elegex.projects.list",
      "elegex.projects.update",
      "elegex.records.archive",
      "elegex.records.detail",
      "elegex.reports.rows",
      "elegex.reports.saveView",
      "elegex.reports.savedViews",
      "elegex.staging.readiness",
      "elegex.tasks.create",
      "elegex.tasks.list",
      "elegex.tasks.update",
      "elegex.workspace.current",
      "elegex.workspace.members",
      "elegex.workspace.operationalSettings",
    ]);
  });

  it("keeps every declared Elegex procedure behind a composed tRPC contract boundary", () => {
    expect(procedures).toHaveLength(60);
    for (const name of procedures) {
      const definition = (appRouter._def.procedures[name] as any)?._def;
      expect(
        definition,
        `${name} must expose a tRPC procedure definition`
      ).toBeTruthy();
      expect(
        Array.isArray(definition.inputs),
        `${name} must retain a declared input-contract collection`
      ).toBe(true);
      expect(
        Array.isArray(definition.middlewares),
        `${name} must retain its authentication and scope middleware chain`
      ).toBe(true);
      expect(
        definition.middlewares.length,
        `${name} must not bypass its protected tenant contract`
      ).toBeGreaterThan(0);
    }
  });
});
