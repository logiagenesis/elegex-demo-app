import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  transaction: vi.fn(),
  drizzle: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  sql: (parts: TemplateStringsArray) => parts.join(""),
}));

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: mocks.drizzle,
}));

import { checkDatabaseHealth, getDatabase, resetDatabaseClientForTests, withTransaction } from "./database";

describe("database connector", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://connector-test";
    mocks.execute.mockReset();
    mocks.transaction.mockReset();
    mocks.drizzle.mockReset();
    mocks.drizzle.mockReturnValue({ execute: mocks.execute, transaction: mocks.transaction });
    resetDatabaseClientForTests();
  });

  it("creates one lazy client per process and reports database readiness", async () => {
    await expect(checkDatabaseHealth()).resolves.toMatchObject({ healthy: true, dialect: "mysql" });
    await getDatabase();
    expect(mocks.drizzle).toHaveBeenCalledTimes(1);
    expect(mocks.execute).toHaveBeenCalledWith("SELECT 1 AS healthy");
  });

  it("runs a workflow inside the shared transaction boundary", async () => {
    const transaction = { transactionId: "test" };
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(transaction));
    await expect(withTransaction(async tx => {
      expect(tx).toBe(transaction);
      return "committed";
    })).resolves.toBe("committed");
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("propagates a workflow failure through the transaction callback so the database driver can roll back", async () => {
    const transaction = { transactionId: "rollback-test" };
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(transaction));
    const failure = new Error("simulated dependent write failure");
    await expect(withTransaction(async tx => {
      expect(tx).toBe(transaction);
      throw failure;
    })).rejects.toBe(failure);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
});
