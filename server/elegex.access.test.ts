import { describe, expect, it } from "vitest";
import { canEditRecords, canManageRecords, canManageWorkspace } from "./db";

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
});
