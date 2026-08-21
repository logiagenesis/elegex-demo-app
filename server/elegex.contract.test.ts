import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("Elegex protected workflow contract", () => {
  const procedures = Object.keys(appRouter._def.procedures);

  it("exposes the complete organization workspace workflow surface", () => {
    expect(procedures).toEqual(expect.arrayContaining([
      "elegex.workspace.current",
      "elegex.dashboard",
      "elegex.contacts.list",
      "elegex.contacts.create",
      "elegex.projects.list",
      "elegex.projects.create",
      "elegex.cases.list",
      "elegex.tasks.create",
      "elegex.tasks.update",
      "elegex.documents.upload",
      "elegex.reports.rows",
      "elegex.reports.saveView",
      "elegex.integrations.databaseHealth",
      "elegex.integrations.upsert",
      "elegex.integrations.enqueue",
      "elegex.fieldService.dashboard",
      "elegex.fieldService.jobs.list",
      "elegex.fieldService.jobs.detail",
      "elegex.fieldService.jobs.create",
      "elegex.fieldService.jobs.transition",
      "elegex.fieldService.jobs.linkInvoice",
      "elegex.fieldService.dispatch",
      "elegex.fieldService.reports",
      "elegex.staging.readiness",
      "elegex.admin.data",
      "elegex.admin.resetDemo",
    ]));
  });

  it("keeps record detail and archival endpoints alongside list procedures", () => {
    expect(procedures).toEqual(expect.arrayContaining([
      "elegex.records.detail",
      "elegex.records.archive",
      "elegex.notifications.list",
      "elegex.documents.list",
    ]));
  });
});
