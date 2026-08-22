import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureTenantScope: vi.fn(),
  getAdminData: vi.fn(),
  archiveRecord: vi.fn(),
  updateTask: vi.fn(),
  createSavedView: vi.fn(),
  validateDocumentTargets: vi.fn(),
  storagePut: vi.fn(),
  linkExternalInvoice: vi.fn(),
  getForemanToday: vi.fn(),
  captureForemanEvidence: vi.fn(),
}));

vi.mock("./db", () => ({
  ensureTenantScope: mocks.ensureTenantScope,
  getAdminData: mocks.getAdminData,
  archiveRecord: mocks.archiveRecord,
  updateTask: mocks.updateTask,
  createSavedView: mocks.createSavedView,
  validateDocumentTargets: mocks.validateDocumentTargets,
  linkExternalInvoice: mocks.linkExternalInvoice,
  getForemanToday: mocks.getForemanToday,
  captureForemanEvidence: mocks.captureForemanEvidence,
  canEditRecords: (role: string) => role !== "viewer",
  canManageRecords: (role: string) =>
    ["owner", "admin", "manager"].includes(role),
  canManageWorkspace: (role: string) => ["owner", "admin"].includes(role),
}));

vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));

import { appRouter } from "./routers";

function context(user: any) {
  return { user, req: {}, res: {} } as any;
}

const user = {
  id: 42,
  openId: "test-user",
  name: "Test User",
  email: "test@elegex.demo",
  role: "user",
};
const scope = (role: "owner" | "admin" | "manager" | "member" | "viewer") => ({
  organizationId: 7,
  organizationName: "Test Workspace",
  primaryColor: "#195FE6",
  role,
});

describe("Elegex protected procedure authorization", () => {
  it("rejects unauthenticated protected workspace access", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(caller.elegex.workspace.current()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("allows owners to retrieve privileged administration data", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("owner"));
    mocks.getAdminData.mockResolvedValueOnce({
      members: [],
      logs: [],
      settings: undefined,
    });
    const caller = appRouter.createCaller(context(user));
    await expect(caller.elegex.admin.data()).resolves.toEqual({
      members: [],
      logs: [],
      settings: undefined,
    });
    expect(mocks.getAdminData).toHaveBeenCalledWith(7);
  });

  it("blocks members from administration and viewers from archival actions", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("member"));
    const memberCaller = appRouter.createCaller(context(user));
    await expect(memberCaller.elegex.admin.data()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    mocks.ensureTenantScope.mockResolvedValueOnce(scope("viewer"));
    const viewerCaller = appRouter.createCaller(context(user));
    await expect(
      viewerCaller.elegex.records.archive({ resource: "tasks", id: 9 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows managers to update tasks but not workspace administration", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("manager"));
    mocks.updateTask.mockResolvedValueOnce(undefined);
    const managerCaller = appRouter.createCaller(context(user));
    await expect(
      managerCaller.elegex.tasks.update({
        id: 9,
        title: "Updated delivery task",
      })
    ).resolves.toBeUndefined();
    expect(mocks.updateTask).toHaveBeenCalledWith(7, 42, 9, {
      title: "Updated delivery task",
    });

    mocks.ensureTenantScope.mockResolvedValueOnce(scope("manager"));
    await expect(managerCaller.elegex.admin.data()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows members to save views but blocks viewer document uploads before storage is touched", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("member"));
    mocks.createSavedView.mockResolvedValueOnce(22);
    const memberCaller = appRouter.createCaller(context(user));
    await expect(
      memberCaller.elegex.reports.saveView({
        name: "Active delivery",
        filters: { status: "active" },
      })
    ).resolves.toBe(22);

    mocks.ensureTenantScope.mockResolvedValueOnce(scope("viewer"));
    const viewerCaller = appRouter.createCaller(context(user));
    await expect(
      viewerCaller.elegex.documents.upload({
        fileName: "brief.pdf",
        mimeType: "application/pdf",
        dataUrl: "data:application/pdf;base64,QQ==",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects malformed document metadata and invalid tenant attachment targets before object storage is touched", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("member"));
    const memberCaller = appRouter.createCaller(context(user));
    await expect(
      memberCaller.elegex.documents.upload({
        fileName: "brief.pdf",
        mimeType: "application/pdf",
        dataUrl: "data:text/plain;base64,QQ==",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.validateDocumentTargets).not.toHaveBeenCalled();
    expect(mocks.storagePut).not.toHaveBeenCalled();

    mocks.ensureTenantScope.mockResolvedValueOnce(scope("member"));
    mocks.validateDocumentTargets.mockRejectedValueOnce(
      new Error("Contact is not available in this workspace")
    );
    await expect(
      memberCaller.elegex.documents.upload({
        fileName: "brief.pdf",
        mimeType: "application/pdf",
        dataUrl: "data:application/pdf;base64,QQ==",
        contactId: 999,
      })
    ).rejects.toThrow("Contact is not available in this workspace");
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("rejects unsupported document MIME types and payloads beyond the decoded 5 MB policy", async () => {
    mocks.validateDocumentTargets.mockClear();
    mocks.storagePut.mockClear();
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("member"));
    const memberCaller = appRouter.createCaller(context(user));
    await expect(
      memberCaller.elegex.documents.upload({
        fileName: "payload.json",
        mimeType: "application/json",
        dataUrl: "data:application/json;base64,e30=",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    mocks.ensureTenantScope.mockResolvedValueOnce(scope("member"));
    const oversizeBase64 = "A".repeat(6_666_668);
    await expect(
      memberCaller.elegex.documents.upload({
        fileName: "oversize.pdf",
        mimeType: "application/pdf",
        dataUrl: `data:application/pdf;base64,${oversizeBase64}`,
      })
    ).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
    expect(mocks.validateDocumentTargets).not.toHaveBeenCalled();
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("blocks viewers from database connector health and configuration procedures", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("viewer"));
    const viewerCaller = appRouter.createCaller(context(user));
    await expect(
      viewerCaller.elegex.integrations.databaseHealth()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    mocks.ensureTenantScope.mockResolvedValueOnce(scope("viewer"));
    await expect(
      viewerCaller.elegex.integrations.upsert({
        provider: "webhook",
        name: "Outbound events",
        configuration: { url: "https://example.invalid" },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks viewers from job-stage controls and staging-release evidence", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("viewer"));
    const viewerCaller = appRouter.createCaller(context(user));
    await expect(
      viewerCaller.elegex.fieldService.jobs.transition({
        id: 9,
        stage: "in_progress",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    mocks.ensureTenantScope.mockResolvedValueOnce(scope("viewer"));
    await expect(viewerCaller.elegex.staging.readiness()).rejects.toMatchObject(
      { code: "FORBIDDEN" }
    );
  });

  it("protects foreman execution endpoints and forwards a member’s derived tenant scope", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("viewer"));
    const viewerCaller = appRouter.createCaller(context(user));
    await expect(
      viewerCaller.elegex.fieldService.foreman.today()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    mocks.ensureTenantScope.mockResolvedValueOnce(scope("member"));
    mocks.captureForemanEvidence.mockResolvedValueOnce(88);
    const memberCaller = appRouter.createCaller(context(user));
    await expect(
      memberCaller.elegex.fieldService.foreman.evidence({
        jobId: 9,
        evidenceType: "note",
        title: "Access panel secured",
        note: "Control panel tested.",
      })
    ).resolves.toBe(88);
    expect(mocks.captureForemanEvidence).toHaveBeenCalledWith(7, 42, {
      jobId: 9,
      evidenceType: "note",
      title: "Access panel secured",
      note: "Control panel tested.",
    });
  });

  it("passes the tenant-derived manager scope into the controlled invoice-link workflow", async () => {
    mocks.ensureTenantScope.mockResolvedValueOnce(scope("manager"));
    mocks.linkExternalInvoice.mockResolvedValueOnce(undefined);
    const managerCaller = appRouter.createCaller(context(user));
    await expect(
      managerCaller.elegex.fieldService.jobs.linkInvoice({
        id: 12,
        invoiceNumber: "INV-9012",
      })
    ).resolves.toBeUndefined();
    expect(mocks.linkExternalInvoice).toHaveBeenCalledWith(
      7,
      42,
      12,
      "INV-9012"
    );
  });

  it("rejects malformed contract inputs at the procedure boundary", async () => {
    mocks.ensureTenantScope.mockResolvedValue(scope("owner"));
    const ownerCaller = appRouter.createCaller(context(user));
    await expect(
      ownerCaller.elegex.contacts.create({ name: "x" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      ownerCaller.elegex.projects.create({ name: "Valid project" } as any)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      ownerCaller.elegex.cases.create({ reference: "C", title: "x" } as any)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      ownerCaller.elegex.fieldService.jobs.create({
        jobNumber: "not-a-number",
        title: "Job",
        description: "Too short",
        contactId: 3,
        serviceAddress: "1 Main Road",
      } as any)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      ownerCaller.elegex.integrations.enqueue({
        connectionId: 2,
        eventType: "sync",
        payload: {},
        idempotencyKey: "short",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      ownerCaller.elegex.admin.updateMemberRole({
        membershipId: 3,
        role: "owner" as any,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      ownerCaller.elegex.fieldService.foreman.quote({
        jobId: 3,
        quoteNumber: "Q",
        total: -1,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      ownerCaller.elegex.documents.list({ resource: "contact" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      ownerCaller.elegex.documents.list({ recordId: 3 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
