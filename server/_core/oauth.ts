import { randomUUID } from "node:crypto";

import {
  COOKIE_NAME,
  ONE_YEAR_MS,
  OAUTH_STATE_COOKIE,
  decodeOAuthState,
  encodeOAuthState,
} from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";

import * as db from "../db";
import { createDevelopmentSession, getAuthProvider } from "../providers/auth";

import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";

const OIDC_PKCE_COOKIE = "__Host-oidc_pkce";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function getTrustedBrowserOrigin(req: Request): string | undefined {
  const rawOrigin = getQueryParam(req, "origin");
  if (!rawOrigin) return undefined;
  try {
    const origin = new URL(rawOrigin).origin;
    if (origin === "null") return undefined;
    if (ENV.publicAppOrigin) {
      return origin === ENV.publicAppOrigin ? origin : undefined;
    }
    if (!ENV.isDevelopment) return undefined;
    const url = new URL(origin);
    return url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ? origin
      : undefined;
  } catch {
    return undefined;
  }
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/login", async (req: Request, res: Response) => {
    const provider = getAuthProvider();
    if (provider.id === "demo") {
      res.redirect(302, "/login");
      return;
    }
    if (provider.id === "dev") {
      const session = await createDevelopmentSession();
      res.cookie(COOKIE_NAME, session.token, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      res.redirect(302, "/");
      return;
    }
    if (!provider.getLoginUrl) {
      res.status(503).json({ error: "login is unavailable" });
      return;
    }
    const browserOrigin = getTrustedBrowserOrigin(req);
    if (!browserOrigin) {
      res.status(400).json({ error: "a trusted browser origin is required" });
      return;
    }
    const redirectUri = `${browserOrigin}/api/oauth/callback`;
    const nonce = randomUUID();
    const state = encodeOAuthState({ redirectUri, nonce });
    const codeVerifier = provider.requiresPkce
      ? `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`
      : undefined;
    res.cookie(OAUTH_STATE_COOKIE, nonce, {
      ...getSessionCookieOptions(req),
      maxAge: 10 * 60 * 1000,
    });
    if (codeVerifier) {
      res.cookie(OIDC_PKCE_COOKIE, codeVerifier, {
        ...getSessionCookieOptions(req),
        maxAge: 10 * 60 * 1000,
      });
    }
    try {
      res.redirect(
        302,
        await provider.getLoginUrl({ redirectUri, state, codeVerifier })
      );
    } catch {
      res.status(503).json({ error: "identity provider is unavailable" });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // CSRF guard: the nonce in `state` must match the one-time cookie that
    // startLogin set in the browser that began this login. An attacker can
    // forge `state`, but cannot plant this cookie in the victim's browser.
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[
      OAUTH_STATE_COOKIE
    ];
    const codeVerifier = parseCookieHeader(req.headers.cookie ?? "")[
      OIDC_PKCE_COOKIE
    ];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, {
      path: "/",
      secure: true,
      sameSite: "none",
    });
    res.clearCookie(OIDC_PKCE_COOKIE, {
      path: "/",
      secure: true,
      sameSite: "none",
    });

    try {
      const provider = getAuthProvider();
      if (!provider.exchangeCodeForToken || !provider.getUserInfo) {
        res.status(400).json({
          error: "the selected provider does not use OAuth callbacks",
        });
        return;
      }
      if (provider.requiresPkce && !codeVerifier) {
        res.status(403).json({ error: "missing OIDC PKCE verifier" });
        return;
      }
      const tokenResponse = await provider.exchangeCodeForToken(
        code,
        state,
        codeVerifier
      );
      const userInfo = await provider.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await provider.createSessionToken(userInfo, {
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, "/");
    } catch {
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
