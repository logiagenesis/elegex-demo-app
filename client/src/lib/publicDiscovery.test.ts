import { describe, expect, it } from "vitest";

import {
  matchesDiscoveryDeclaration,
  toDiscoverySlug,
} from "./publicDiscovery";

describe("public discovery declarations", () => {
  it("creates stable URL segments from administrator-declared values", () => {
    expect(toDiscoverySlug(" Electrical inspection ")).toBe(
      "electrical-inspection"
    );
    expect(toDiscoverySlug("Demo Service District")).toBe(
      "demo-service-district"
    );
  });

  it("only matches exact declared services and areas after URL normalization", () => {
    expect(
      matchesDiscoveryDeclaration("Electrical Inspection", [
        "Electrical inspection",
        "Preventative maintenance",
      ])
    ).toBe(true);
    expect(
      matchesDiscoveryDeclaration("Emergency electrical cover", [
        "Electrical inspection",
      ])
    ).toBe(false);
  });
});
