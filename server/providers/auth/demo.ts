import type { OrganizationRole } from "../../../drizzle/schema";
import { sdk } from "../../_core/sdk";
import { ensureDemoPersona } from "../../db";

import type { AuthProvider, ProviderUser } from "./types";

export type DemoPersonaId = "owner" | "manager" | "foreman" | "viewer";

export type DemoPersona = {
  id: DemoPersonaId;
  name: string;
  email: string;
  title: string;
  role: OrganizationRole;
  description: string;
};

export const DEMO_PERSONAS: readonly DemoPersona[] = [
  {
    id: "owner",
    name: "Alex Morgan",
    email: "owner@demo.elegex.app",
    title: "Operations Owner",
    role: "owner",
    description: "Full operational and administration access.",
  },
  {
    id: "manager",
    name: "Jordan Lee",
    email: "manager@demo.elegex.app",
    title: "Field Operations Manager",
    role: "manager",
    description: "Dispatch, job coordination, and operational oversight.",
  },
  {
    id: "foreman",
    name: "Riley Chen",
    email: "foreman@demo.elegex.app",
    title: "Field Foreman",
    role: "member",
    description:
      "Mobile field visits, evidence, materials, and completion work.",
  },
  {
    id: "viewer",
    name: "Taylor Brooks",
    email: "viewer@demo.elegex.app",
    title: "Operations Viewer",
    role: "viewer",
    description: "Read-only visibility into the shared operating picture.",
  },
] as const;

export function getDemoPersona(id: string): DemoPersona | undefined {
  return DEMO_PERSONAS.find(persona => persona.id === id);
}

export async function resolveDemoPersona(id: string): Promise<ProviderUser> {
  const persona = getDemoPersona(id);
  if (!persona) throw new Error("Unknown demo persona");
  const user = await ensureDemoPersona({
    openId: `demo:${persona.id}`,
    name: persona.name,
    email: persona.email,
    role: persona.role,
    title: persona.title,
  });
  return {
    openId: user.openId,
    name: user.name,
    email: user.email,
    loginMethod: "demo",
  };
}

export const demoAuthProvider: AuthProvider = {
  id: "demo",
  label: "Elegex demo",
  interactive: false,
  async createSessionToken(user, options) {
    return sdk.createSessionToken(user.openId, {
      name: user.name ?? "Demo user",
      expiresInMs: options?.expiresInMs,
    });
  },
  async verifySessionToken(token) {
    return sdk.verifySession(token);
  },
};
