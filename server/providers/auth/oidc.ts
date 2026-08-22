import { createHash, randomBytes } from "node:crypto";

import { ENV } from "../../_core/env";
import { sdk } from "../../_core/sdk";

import type { AuthProvider, ProviderToken, ProviderUser } from "./types";

type OidcDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
};

let discoveryPromise: Promise<OidcDiscovery> | undefined;

async function discover(): Promise<OidcDiscovery> {
  discoveryPromise ??= fetch(
    new URL(
      ".well-known/openid-configuration",
      `${ENV.oidcIssuerUrl}/`
    ).toString(),
    { signal: AbortSignal.timeout(8_000) }
  ).then(async response => {
    if (!response.ok) throw new Error("OIDC discovery failed");
    return (await response.json()) as OidcDiscovery;
  });
  return discoveryPromise;
}

export function createPkceVerifier() {
  return randomBytes(48).toString("base64url");
}

export function createPkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export const oidcAuthProvider: AuthProvider = {
  id: "oidc",
  label: "Single sign-on",
  interactive: true,
  requiresPkce: true,
  async createSessionToken(user, options) {
    return sdk.createSessionToken(user.openId, {
      name: user.name ?? "",
      expiresInMs: options?.expiresInMs,
    });
  },
  async verifySessionToken(token) {
    return sdk.verifySession(token);
  },
  async getLoginUrl({ redirectUri, state, codeVerifier }) {
    if (!codeVerifier) throw new Error("OIDC PKCE verifier is required");
    const config = await discover();
    const url = new URL(config.authorization_endpoint);
    url.searchParams.set("client_id", ENV.oidcClientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid profile email");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", createPkceChallenge(codeVerifier));
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  },
  async exchangeCodeForToken(
    code,
    _state,
    codeVerifier
  ): Promise<ProviderToken> {
    if (!codeVerifier) throw new Error("OIDC PKCE verifier is required");
    const config = await discover();
    const response = await fetch(config.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: ENV.oidcClientId,
        client_secret: ENV.oidcClientSecret,
        redirect_uri: ENV.oidcRedirectUri,
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("OIDC token exchange failed");
    const token = (await response.json()) as { access_token?: string };
    if (!token.access_token) throw new Error("OIDC access token missing");
    return { accessToken: token.access_token };
  },
  async getUserInfo(accessToken): Promise<ProviderUser> {
    const config = await discover();
    const response = await fetch(config.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("OIDC user-info request failed");
    const profile = (await response.json()) as {
      sub?: string;
      name?: string;
      email?: string;
    };
    if (!profile.sub) throw new Error("OIDC subject missing");
    return {
      openId: `oidc:${profile.sub}`,
      name: profile.name ?? profile.email ?? "OIDC user",
      email: profile.email ?? null,
      loginMethod: "oidc",
    };
  },
};
