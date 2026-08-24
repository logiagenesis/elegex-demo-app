import {
  aiUsage,
  bookingRequests,
  contractorInvoices,
  contractorMarketplaceEntries,
  contractorProfiles,
  growthGuideProgress,
  jobExpenses,
  jobTimeEntries,
  maintenancePlans,
  marketingDrafts,
  repairReports,
  reviewRequests,
} from "../drizzle/schema";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("Big Bang contractor platform contract", () => {
  const procedures = Object.keys(appRouter._def.procedures).sort();

  it("keeps public profile lookup and consent-based booking intake separate from protected operations", () => {
    expect(procedures).toContain("publicContractor.profile");
    expect(procedures).toContain("publicContractor.requestBooking");
    expect(procedures).toContain("elegex.contractor.bookings.list");
    expect(procedures).toContain("elegex.contractor.bookings.setStatus");
  });

  it("exposes the connected contractor operation domains through explicit procedures", () => {
    expect(procedures).toEqual(
      expect.arrayContaining([
        "elegex.ai.generateDraft",
        "elegex.contractor.approvals.create",
        "elegex.contractor.expenses.create",
        "elegex.contractor.growthGuide.complete",
        "elegex.contractor.invoices.create",
        "elegex.contractor.maintenance.create",
        "elegex.contractor.marketing.create",
        "elegex.contractor.marketplace.create",
        "elegex.contractor.repairs.create",
        "elegex.contractor.reviews.create",
        "elegex.contractor.time.start",
      ])
    );
  });

  it("uses tenant-scoped models for every added operational domain", () => {
    const tables = [
      contractorProfiles,
      bookingRequests,
      contractorInvoices,
      jobTimeEntries,
      jobExpenses,
      repairReports,
      maintenancePlans,
      reviewRequests,
      marketingDrafts,
      growthGuideProgress,
      contractorMarketplaceEntries,
    ];
    for (const table of tables) {
      expect(table.organizationId.name).toBe("organizationId");
    }
  });

  it("records the new AI draft modes and marketplace verification states explicitly", () => {
    expect(aiUsage.feature.enumValues).toEqual(
      expect.arrayContaining(["marketing_draft", "operations_assistant"])
    );
    expect(contractorMarketplaceEntries.verificationStatus.enumValues).toEqual(
      expect.arrayContaining([
        "not_verified",
        "self_attested",
        "verified_by_workspace",
      ])
    );
  });
});
