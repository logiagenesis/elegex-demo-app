import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  withTransaction: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  selectWhere: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("./connectors/database", () => ({
  getDatabase: mocks.getDatabase,
  withTransaction: mocks.withTransaction,
}));

import { archiveJob, archiveRecord, assertForemanTimeWindow, captureForemanQuote, createDocumentRecord, createJob, createTask, foremanCheckIn, foremanCompleteJob, linkExternalInvoice, normalizeInvoiceReference, publicForemanQuoteResponse, transitionJobStage, updateContact, updateMemberRole } from "./db";
import { enqueueIntegrationEvent, listDispatchableEvents } from "./connectors/outbox";

const organizationId = 7;
const userId = 42;

function createTransaction() {
  return {
    insert: mocks.insert,
    update: mocks.update,
    select: mocks.select,
  } as any;
}

function configureTransaction(selectResult: unknown[] = []) {
  const tx = createTransaction();
  mocks.withTransaction.mockImplementation(async (work: (transaction: unknown) => Promise<unknown>) => work(tx));
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.update.mockReturnValue({ set: mocks.set });
  mocks.set.mockReturnValue({ where: mocks.where });
  mocks.where.mockResolvedValue(undefined);
  mocks.select.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue({ where: mocks.selectWhere });
  mocks.selectWhere.mockReturnValue({ limit: mocks.limit });
  mocks.limit.mockResolvedValue(selectResult);
  return tx;
}

describe("critical workflow rollback propagation", () => {
  beforeEach(() => {
    Object.values(mocks).forEach(mock => mock.mockReset());
  });

  it("propagates audit-write failure after task creation through the transaction boundary", async () => {
    configureTransaction();
    const failure = new Error("task audit insertion failed");
    mocks.values.mockResolvedValueOnce([{ insertId: 101 }]).mockRejectedValueOnce(failure);
    await expect(createTask(organizationId, userId, { title: "Prepare handover" })).rejects.toBe(failure);
    expect(mocks.withTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.values).toHaveBeenCalledTimes(2);
  });

  it("propagates audit-write failure after job creation through the transaction boundary", async () => {
    configureTransaction([{ id: 4 }]);
    const failure = new Error("job audit insertion failed");
    mocks.values.mockResolvedValueOnce([{ insertId: 202 }]).mockRejectedValueOnce(failure);
    await expect(createJob(organizationId, userId, { jobNumber: "#9001", title: "Safety inspection", description: "Inspect the equipment and record a safe handover.", contactId: 4, serviceAddress: "18 Market Street" })).rejects.toBe(failure);
    expect(mocks.withTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.values).toHaveBeenCalledTimes(2);
  });

  it("propagates audit-write failure after a document record is created through the transaction boundary", async () => {
    configureTransaction();
    const failure = new Error("document audit insertion failed");
    mocks.values.mockResolvedValueOnce([{ insertId: 303 }]).mockRejectedValueOnce(failure);
    await expect(createDocumentRecord(organizationId, userId, { fileName: "handover.pdf", mimeType: "application/pdf", sizeBytes: 128, storageKey: "elegex/7/documents/handover.pdf", storageUrl: "/manus-storage/handover.pdf" })).rejects.toBe(failure);
    expect(mocks.withTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.values).toHaveBeenCalledTimes(2);
  });

  it("propagates stage-change and invoice-link audit failures after dependent writes", async () => {
    configureTransaction([{ stage: "scheduled" }]);
    const transitionFailure = new Error("stage audit insertion failed");
    mocks.values.mockRejectedValueOnce(transitionFailure);
    await expect(transitionJobStage(organizationId, userId, 88, "in_progress")).rejects.toBe(transitionFailure);
    expect(mocks.withTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledTimes(1);

    Object.values(mocks).forEach(mock => mock.mockReset());
    configureTransaction([{ stage: "ready_for_invoicing" }]);
    mocks.limit.mockResolvedValueOnce([{ stage: "ready_for_invoicing" }]).mockResolvedValueOnce([]);
    const invoiceFailure = new Error("invoice audit insertion failed");
    mocks.values.mockResolvedValueOnce([{ insertId: 404 }]).mockRejectedValueOnce(invoiceFailure);
    await expect(linkExternalInvoice(organizationId, userId, 89, "INV-9001")).rejects.toBe(invoiceFailure);
    expect(mocks.withTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.values).toHaveBeenCalledTimes(2);
  });

  it("refuses outbox insertion when a tenant-scoped connection is unavailable and propagates a storage failure", async () => {
    const database = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })),
      insert: vi.fn(),
    } as any;
    mocks.getDatabase.mockResolvedValue(database);
    await expect(enqueueIntegrationEvent({ organizationId, connectionId: 9, eventType: "job.ready", payload: {}, idempotencyKey: "event-9001" })).rejects.toThrow("not available in this workspace");
    expect(database.insert).not.toHaveBeenCalled();

    const outboxFailure = new Error("outbox storage failure");
    database.select.mockReturnValue({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 9, status: "active" }]) })) })) });
    database.insert.mockReturnValue({ values: vi.fn(() => ({ onDuplicateKeyUpdate: vi.fn().mockRejectedValue(outboxFailure) })) });
    await expect(enqueueIntegrationEvent({ organizationId, connectionId: 9, eventType: "job.ready", payload: {}, idempotencyKey: "event-9002" })).rejects.toBe(outboxFailure);
  });

  it("returns the canonical existing event ID on an idempotent outbox replay and refuses paused dispatch", async () => {
    const limit = vi.fn().mockResolvedValueOnce([{ id: 9, status: "active" }]).mockResolvedValueOnce([{ id: 77 }]);
    const database = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit })) })) })),
      insert: vi.fn(() => ({ values: vi.fn(() => ({ onDuplicateKeyUpdate: vi.fn().mockResolvedValue([{ insertId: 0 }]) })) })),
    } as any;
    mocks.getDatabase.mockResolvedValue(database);
    await expect(enqueueIntegrationEvent({ organizationId, connectionId: 9, eventType: "job.ready", payload: {}, idempotencyKey: "event-9003" })).resolves.toBe(77);

    const paused = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 9, status: "paused" }]) })) })) })),
    } as any;
    mocks.getDatabase.mockResolvedValue(paused);
    await expect(listDispatchableEvents(organizationId, 9)).rejects.toThrow("must be active before events can be dispatched");
  });

  it("does not repeat check-in writes when the tenant has already claimed the mobile idempotency key", async () => {
    configureTransaction([{ id: 88, stage: "scheduled", foremanId: userId }]);
    const onDuplicateKeyUpdate = vi.fn().mockResolvedValue([{ affectedRows: 0 }]);
    mocks.values.mockReturnValueOnce({ onDuplicateKeyUpdate });

    await expect(foremanCheckIn(organizationId, userId, 88, "7f5c25f0-6f3b-42c9-8bc1-4392da6e0bc8")).resolves.toBeUndefined();

    expect(onDuplicateKeyUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects check-in when the assigned foreman has not captured consent", async () => {
    configureTransaction([{ id: 88, stage: "scheduled", foremanId: userId }]);
    mocks.limit.mockResolvedValueOnce([{ id: 88, stage: "scheduled", foremanId: userId }]).mockResolvedValueOnce([]);

    await expect(foremanCheckIn(organizationId, userId, 88)).rejects.toThrow("Customer consent must be recorded before check-in");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("requires evidence or an explicit exception before completing a field job", async () => {
    configureTransaction([{ id: 88, stage: "in_progress", foremanId: userId }]);
    mocks.limit.mockResolvedValueOnce([{ id: 88, stage: "in_progress", foremanId: userId }]).mockResolvedValueOnce([]);

    await expect(foremanCompleteJob(organizationId, userId, 88)).rejects.toThrow("Capture field evidence or record a completion exception reason");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not archive invoice-ready or invoiced jobs", async () => {
    configureTransaction([{ stage: "ready_for_invoicing" }]);

    await expect(archiveJob(organizationId, userId, 88)).rejects.toThrow("Completed or invoiced jobs are retained and cannot be deleted");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not permit a workspace owner membership to be reassigned through the member-role mutation", async () => {
    configureTransaction([{ role: "owner" }]);
    await expect(updateMemberRole(organizationId, userId, 88, "admin")).rejects.toThrow("owner role cannot be reassigned");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects updates and archive attempts for unavailable active records before false audit writes", async () => {
    configureTransaction([]);
    await expect(updateContact(organizationId, userId, 88, { name: "Missing contact" })).rejects.toThrow("Contact is not available");
    await expect(archiveRecord(organizationId, userId, "tasks", 89)).rejects.toThrow("task is not available");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.values).not.toHaveBeenCalled();
  });

  it("returns a foreman quote acknowledgement without the persisted numeric total", () => {
    expect(publicForemanQuoteResponse(19, "QT-9020", "draft")).toEqual({ quoteId: 19, quoteNumber: "QT-9020", status: "draft" });
    expect(Object.keys(publicForemanQuoteResponse(19, "QT-9020", "draft"))).not.toContain("total");
  });

  it("enforces bounded time corrections and normalized invoice reference identifiers", () => {
    const now = new Date("2026-08-22T12:00:00.000Z");
    expect(() => assertForemanTimeWindow(new Date("2026-08-21T11:59:59.000Z"), now)).toThrow("backdated by more than 24 hours");
    expect(() => assertForemanTimeWindow(new Date("2026-08-22T12:06:00.000Z"), now)).toThrow("more than five minutes in the future");
    expect(normalizeInvoiceReference(" inv-9001 ")).toBe("INV-9001");
    expect(() => normalizeInvoiceReference("??")).toThrow("Invoice reference must contain");
  });

  it("does not leak a quote total through the captured quote return contract", async () => {
    configureTransaction([{ id: 88, stage: "in_progress", foremanId: userId }]);
    mocks.values.mockResolvedValueOnce([{ insertId: 501 }]).mockResolvedValueOnce([{ insertId: 502 }]).mockResolvedValueOnce(undefined);

    const result = await captureForemanQuote(organizationId, userId, { jobId: 88, quoteNumber: "QT-9021", total: 9876 });
    expect(result).toEqual({ quoteId: 501, quoteNumber: "QT-9021", status: "draft" });
    expect(result).not.toHaveProperty("total");
  });
});
