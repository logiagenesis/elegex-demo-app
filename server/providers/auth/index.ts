import { ONE_YEAR_MS } from "../../../shared/const";
import { ENV } from "../../_core/env";

import {
  demoAuthProvider,
  DEMO_PERSONAS,
  getDemoPersona,
  resolveDemoPersona,
} from "./demo";
import { devAuthProvider, resolveDevelopmentUser } from "./dev";
import { manusAuthProvider } from "./manus";
import { oidcAuthProvider } from "./oidc";
import type { AuthProvider, ProviderUser } from "./types";

export * from "./types";

export function getAuthProvider(): AuthProvider {
  switch (ENV.authProvider) {
    case "demo":
      return demoAuthProvider;
    case "oidc":
      return oidcAuthProvider;
    case "dev":
      return devAuthProvider;
    default:
      return manusAuthProvider;
  }
}

export function getAuthProviderInfo() {
  const provider = getAuthProvider();
  return {
    id: provider.id,
    label: provider.label,
    isDemo: provider.id === "demo",
    loginPath: provider.id === "demo" ? "/login" : "/api/auth/login",
  } as const;
}

export function listDemoPersonas() {
  if (ENV.authProvider !== "demo") return [];
  return DEMO_PERSONAS.map(({ id, name, title, role, description }) => ({
    id,
    name,
    title,
    role,
    description,
  }));
}

export async function createDemoPersonaSession(personaId: string) {
  if (ENV.authProvider !== "demo") {
    throw new Error("Demo sessions are not enabled for this deployment");
  }
  const persona = getDemoPersona(personaId);
  if (!persona) throw new Error("Unknown demo persona");
  const user = await resolveDemoPersona(persona.id);
  const token = await demoAuthProvider.createSessionToken(user, {
    expiresInMs: ONE_YEAR_MS,
  });
  return { user, token };
}

export async function createDevelopmentSession(): Promise<{
  user: ProviderUser;
  token: string;
}> {
  const user = await resolveDevelopmentUser();
  const token = await devAuthProvider.createSessionToken(user, {
    expiresInMs: ONE_YEAR_MS,
  });
  return { user, token };
}
