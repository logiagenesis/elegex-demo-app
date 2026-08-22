export type AuthProviderId = "manus" | "demo" | "oidc" | "dev";

export type ProviderToken = {
  accessToken: string;
};

export type ProviderUser = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
};

export type LoginUrlInput = {
  redirectUri: string;
  state: string;
  codeVerifier?: string;
};

export interface AuthProvider {
  readonly id: AuthProviderId;
  readonly label: string;
  readonly interactive: boolean;
  readonly requiresPkce?: boolean;
  createSessionToken(
    user: ProviderUser,
    options?: { expiresInMs?: number }
  ): Promise<string>;
  verifySessionToken(token?: string): Promise<{ openId: string } | null>;
  getLoginUrl?(input: LoginUrlInput): Promise<string>;
  exchangeCodeForToken?(
    code: string,
    state: string,
    codeVerifier?: string
  ): Promise<ProviderToken>;
  getUserInfo?(accessToken: string): Promise<ProviderUser>;
}
