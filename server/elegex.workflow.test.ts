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

import { createDocumentRecord, createJob, createTask, foremanCheckIn, linkExternalInvoice, transitionJobStage } from "./db";
import { enqueueIntegrationEvent } from "./connectors/outbox";

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

  it("does not repeat check-in writes when the tenant has already claimed the mobile idempotency key", async () => {
    configureTransaction([{ id: 88, stage: "scheduled", foremanId: userId }]);
    const onDuplicateKeyUpdate = vi.fn().mockResolvedValue([{ affectedRows: 0 }]);
    mocks.values.mockReturnValueOnce({ onDuplicateKeyUpdate });

    await expect(foremanCheckIn(organizationId, userId, 88, "7f5c25f0-6f3b-42c9-8bc1-4392da6e0bc8")).resolves.toBeUndefined();

    expect(onDuplicateKeyUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
