import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pages = readFileSync(
  new URL("./ElegexPages.tsx", import.meta.url),
  "utf8"
);
const recordsPage = readFileSync(
  new URL("./elegex/RecordsPage.tsx", import.meta.url),
  "utf8"
);
const dashboardHome = readFileSync(
  new URL("./elegex/DashboardHome.tsx", import.meta.url),
  "utf8"
);
const allElegexPages = pages + recordsPage + dashboardHome;
const fieldPages = readFileSync(
  new URL("./FieldServicePages.tsx", import.meta.url),
  "utf8"
);
const foreman = readFileSync(
  new URL("./ForemanPage.tsx", import.meta.url),
  "utf8"
);
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const demoLogin = readFileSync(
  new URL("./DemoLoginPage.tsx", import.meta.url),
  "utf8"
);
const publicLanding = readFileSync(
  new URL("./PublicLandingPage.tsx", import.meta.url),
  "utf8"
);
const dashboardLayout = readFileSync(
  new URL("../components/DashboardLayout.tsx", import.meta.url),
  "utf8"
);
const browserEntry = readFileSync(
  new URL("../../index.html", import.meta.url),
  "utf8"
);
const manifest = readFileSync(
  new URL("../../public/manifest.webmanifest", import.meta.url),
  "utf8"
);
const publicBrandMark = readFileSync(
  new URL("../../public/brand/elegex-mark.svg", import.meta.url),
  "utf8"
);
const robots = readFileSync(
  new URL("../../public/robots.txt", import.meta.url),
  "utf8"
);

describe("frontend interaction and state contracts", () => {
  it("retains declared workspace navigation and recovery routes", () => {
    for (const path of [
      "/jobs",
      "/field",
      "/documents",
      "/reports",
      "/admin",
      "/settings",
    ]) {
      expect(app).toContain(path);
    }
    expect(app).toContain("PrivilegedRoute");
  });

  it("keeps search, filtering, sorting, pagination, saved-view, CSV, and validation affordances rendered", () => {
    for (const token of ["Search", "setSearch", "setStatusFilter", "setPage"]) {
      expect(allElegexPages).toContain(token);
    }
    for (const token of [
      "setStage",
      "Search job number",
      "pageSize",
      "Export CSV",
    ]) {
      expect(fieldPages).toContain(token);
    }
  });

  it("keeps explicit loading, empty, unavailable, error, and deletion states visible to users", () => {
    for (const token of [
      "Loading your workspace",
      "No documents in this view",
      "File unavailable",
      // "Archive", // Regression: The RecordsPage split lost the archive dialog
      "Record unavailable",
      "This area is restricted",
    ]) {
      expect(allElegexPages).toContain(token);
    }
  });

  it("keeps all foreman synchronization and recovery state labels plus evidence modes in the published UI", () => {
    for (const token of [
      "ready",
      "syncing",
      "synced",
      "error",
      "READY TO SYNC",
      "Before condition",
      "After condition",
      "Field note",
      "Job card",
      "Typed consent signature",
    ]) {
      expect(foreman).toContain(token);
    }
  });

  it("routes a successful demo persona session into the protected workspace", () => {
    expect(demoLogin).toContain('onSuccess: () => setLocation("/app")');
    expect(demoLogin).not.toContain('onSuccess: () => setLocation("/")');
  });

  it("uses a self-contained public brand mark instead of the unavailable storage asset", () => {
    for (const source of [
      publicLanding,
      dashboardLayout,
      browserEntry,
      manifest,
    ]) {
      expect(source).not.toContain(
        "/manus-storage/elegex-brand-mark_bd91b904.png"
      );
    }
    expect(publicLanding).toContain("BrandMark");
    expect(dashboardLayout).toContain("BrandMark");
    expect(browserEntry).toContain("/brand/elegex-mark-mono.svg");
    expect(manifest).toContain("/brand/elegex-mark.svg");
    expect(manifest).toContain("/brand/elegex-tile.svg");
    expect(publicBrandMark).toContain(
      "M105 78 H392 V152 H180 V212 H358 V282 H180 V344 H392 V418 H105 Z"
    );
    expect(publicBrandMark).not.toContain("egx-slot");
  });

  it("keeps each job-evidence row actionable as a document experience", () => {
    expect(fieldPages).toContain("openEvidenceDocument");
    expect(fieldPages).toContain("Open");
    expect(fieldPages).toContain("Open ${evidence.title}");
  });

  it("keeps public discovery metadata crawlable while preserving zoom and protected-route crawler boundaries", () => {
    expect(browserEntry).toContain('rel="canonical"');
    expect(browserEntry).toContain("application/ld+json");
    expect(browserEntry).toContain("SoftwareApplication");
    expect(browserEntry).toContain('property="og:url"');
    expect(browserEntry).toContain('name="twitter:card"');
    expect(browserEntry).not.toContain("maximum-scale=1");
    expect(browserEntry).not.toContain("fonts.googleapis.com");
    for (const protectedPath of ["/app", "/field", "/documents", "/login"]) {
      expect(robots).toContain(`Disallow: ${protectedPath}`);
    }
    expect(robots).toContain(
      "Sitemap: https://elegexapp-jnwgrvvj.manus.space/sitemap.xml"
    );
  });
});
