import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureTenantScope: vi.fn(),
  getAdminData: vi.fn(),
  archiveRecord: vi.fn(),
  updateTask: vi.fn(),
  createSavedView: vi.fn(),
}));

vi.mock("./db", () => ({
  ensureTenantScope: mocks.ensureTenantScope,
  getAdminData: mocks.getAdminData,
  archiveRecord: mocks.archiveRecord,
  updateTask: mocks.updateTask,
  createSavedView: mocks.createSavedView,
  canEditRecords: (role: string) => role !== "viewer",
  canManageRecords: (role: string) => ["owner", "admin", "manager"].includes(role),
  canManageWorkspace: (role: string) => ["owner", "admin"].includes(role),
}));

import { appRouter } from "./routers";

function context(user: any) {
  return { user, req: {}, res: {} } as any;
}

const user = { id: 42, openId: "test-user", name: "Test User", email: "test@elegex.demo", role: "user" };
const scope = (role: "owner" | "admin" | "manager" | "member" | "viewer") => ({ organizationId: 7, organizationName: "Test Workspace", primaryColor: "#195FE6", role });

describe("Elegex protected procedure authorization", () => {
  it("rejects unauthenticated protected workspace access", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(caller.elegex.workspace.current()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("allows owners to retrieve privileged administration data", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("owner"));
    mocks.getAdminData.mockResolvedValueOnce({ members: [], logs: [], settings: undefined });
    const caller = appRouter.createCaller(context(user));
    await expect(caller.elegex.admin.data()).resolves.toEqual({ members: [], logs: [], settings: undefined });
    expect(mocks.getAdminData).toHaveBeenCalledWith(7);
  });

  it("blocks members from administration and viewers from archival actions", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("member"));
    const memberCaller = appRouter.createCaller(context(user));
    await expect(memberCaller.elegex.admin.data()).rejects.toMatchObject({ code: "FORBIDDEN" });

    mocks.ensureTenantScope.mockResolvedValueOnce(scope("viewer"));
    const viewerCaller = appRouter.createCaller(context(user));
    await expect(viewerCaller.elegex.records.archive({ resource: "tasks", id: 9 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows managers to update tasks but not workspace administration", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("manager"));
    mocks.updateTask.mockResolvedValueOnce(undefined);
    const managerCaller = appRouter.createCaller(context(user));
    await expect(managerCaller.elegex.tasks.update({ id: 9, title: "Updated delivery task" })).resolves.toBeUndefined();
    expect(mocks.updateTask).toHaveBeenCalledWith(7, 42, 9, { title: "Updated delivery task" });

    mocks.ensureTenantScope.mockResolvedValueOnce(scope("manager"));
    await expect(managerCaller.elegex.admin.data()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows members to save views but blocks viewer document uploads before storage is touched", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("member"));
    mocks.createSavedView.mockResolvedValueOnce(22);
    const memberCaller = appRouter.createCaller(context(user));
    await expect(memberCaller.elegex.reports.saveView({ name: "Active delivery", filters: { status: "active" } })).resolves.toBe(22);

    mocks.ensureTenantScope.mockResolvedValueOnce(scope("viewer"));
    const viewerCaller = appRouter.createCaller(context(user));
    await expect(viewerCaller.elegex.documents.upload({ fileName: "brief.pdf", mimeType: "application/pdf", dataUrl: "data:application/pdf;base64,QQ==" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks viewers from database connector health and configuration procedures", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("viewer"));
    const viewerCaller = appRouter.createCaller(context(user));
    await expect(viewerCaller.elegex.integrations.databaseHealth()).rejects.toMatchObject({ code: "FORBIDDEN" });

    mocks.ensureTenantScope.mockResolvedValueOnce(scope("viewer"));
    await expect(viewerCaller.elegex.integrations.upsert({ provider: "webhook", name: "Outbound events", configuration: { url: "https://example.invalid" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks viewers from job-stage controls and staging-release evidence", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("viewer"));
    const viewerCaller = appRouter.createCaller(context(user));
    await expect(viewerCaller.elegex.fieldService.jobs.transition({ id: 9, stage: "in_progress" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    mocks.ensureTenantScope.mockResolvedValueOnce(scope("viewer"));
    await expect(viewerCaller.elegex.staging.readiness()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
