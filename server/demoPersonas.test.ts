import { describe, expect, it } from "vitest";

import { DEMO_PERSONAS, getDemoPersona } from "./providers/auth/demo";

describe("shared field contributor demo personas", () => {
  it("keeps electrician, plumber, and tiler accounts available with member upload access", () => {
    const trades = ["electrician", "plumber", "tiler"] as const;
    expect(DEMO_PERSONAS.map(persona => persona.id)).toEqual(
      expect.arrayContaining(trades)
    );
    for (const trade of trades) {
      const persona = getDemoPersona(trade);
      expect(persona).toMatchObject({ id: trade, role: "member" });
      expect(persona?.description).toContain("Shared project photo uploads");
    }
  });
});
