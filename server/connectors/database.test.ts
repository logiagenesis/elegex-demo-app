import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  transaction: vi.fn(),
  drizzle: vi.fn(),
  createPool: vi.fn(),
  end: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  sql: (parts: TemplateStringsArray) => parts.join(""),
}));

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: mocks.drizzle,
}));

vi.mock("mysql2/promise", () => ({
  default: {
    createPool: mocks.createPool,
  },
}));

import {
  DATABASE_POOL_POLICY,
  checkDatabaseHealth,
  closeDatabase,
  getDatabase,
  resetDatabaseClientForTests,
  withTransaction,
} from "./database";

describe("database connector", () => {
  beforeEach(async () => {
    await resetDatabaseClientForTests();
    mocks.execute.mockReset();
    mocks.transaction.mockReset();
    mocks.drizzle.mockReset();
    mocks.createPool.mockReset();
    mocks.end.mockReset();
    mocks.end.mockResolvedValue(undefined);
    mocks.createPool.mockReturnValue({ end: mocks.end });
    mocks.drizzle.mockReturnValue({
      execute: mocks.execute,
      transaction: mocks.transaction,
    });
  });

  it("creates one bounded lazy pool per process and reports database readiness", async () => {
    await expect(checkDatabaseHealth()).resolves.toMatchObject({
      healthy: true,
      dialect: "mysql",
      connectionLimit: DATABASE_POOL_POLICY.connectionLimit,
      queueLimit: DATABASE_POOL_POLICY.queueLimit,
    });
    await getDatabase();
    expect(mocks.drizzle).toHaveBeenCalledTimes(1);
    expect(mocks.createPool).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: expect.any(String),
        waitForConnections: true,
        ...DATABASE_POOL_POLICY,
      })
    );
    expect(mocks.execute).toHaveBeenCalledWith(
      "SELECT 1 AS healthy, DATABASE() AS databaseName"
    );
  });

  it("closes a live pool only once when shutdown requests overlap", async () => {
    await getDatabase();
    await Promise.all([closeDatabase(), closeDatabase()]);
    expect(mocks.end).toHaveBeenCalledTimes(1);
    await getDatabase();
    expect(mocks.createPool).toHaveBeenCalledTimes(2);
  });

  it("runs a workflow inside the shared transaction boundary", async () => {
    const transaction = { transactionId: "test" };
    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transaction)
    );
    await expect(
      withTransaction(async tx => {
        expect(tx).toBe(transaction);
        return "committed";
      })
    ).resolves.toBe("committed");
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("propagates a workflow failure through the transaction callback so the database driver can roll back", async () => {
    const transaction = { transactionId: "rollback-test" };
    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transaction)
    );
    const failure = new Error("simulated dependent write failure");
    await expect(
      withTransaction(async tx => {
        expect(tx).toBe(transaction);
        throw failure;
      })
    ).rejects.toBe(failure);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
});
