import { ENV } from "../../_core/env";

import { demoAuthProvider, resolveDemoPersona } from "./demo";
import type { AuthProvider, ProviderUser } from "./types";

export const devAuthProvider: AuthProvider = {
  id: "dev",
  label: "Local development",
  interactive: false,
  async createSessionToken(user: ProviderUser, options) {
    if (ENV.isProduction) {
      throw new Error(
        "The development auth provider is forbidden in production"
      );
    }
    return demoAuthProvider.createSessionToken(user, options);
  },
  async verifySessionToken(token) {
    return demoAuthProvider.verifySessionToken(token);
  },
};

export async function resolveDevelopmentUser(): Promise<ProviderUser> {
  if (ENV.isProduction) {
    throw new Error("The development auth provider is forbidden in production");
  }
  return resolveDemoPersona("manager");
}
