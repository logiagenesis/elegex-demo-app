import { sdk } from "../../_core/sdk";

import type { AuthProvider, ProviderUser } from "./types";

export const manusAuthProvider: AuthProvider = {
  id: "manus",
  label: "Manus",
  interactive: true,
  async createSessionToken(user, options) {
    return sdk.createSessionToken(user.openId, {
      name: user.name ?? "",
      expiresInMs: options?.expiresInMs,
    });
  },
  async verifySessionToken(token) {
    return sdk.verifySession(token);
  },
  async exchangeCodeForToken(code, state) {
    return sdk.exchangeCodeForToken(code, state);
  },
  async getUserInfo(accessToken): Promise<ProviderUser> {
    const user = await sdk.getUserInfo(accessToken);
    return {
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? user.platform ?? "manus",
    };
  },
  async getLoginUrl({ redirectUri, state }) {
    const url = new URL(`${process.env.VITE_OAUTH_PORTAL_URL}/app-auth`);
    url.searchParams.set("appId", process.env.VITE_APP_ID ?? "");
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  },
};
