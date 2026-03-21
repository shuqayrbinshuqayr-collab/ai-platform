import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Application, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

function getBaseUrl(req: Request): string {
  // Prefer explicit APP_URL to avoid deployment-specific hostname issues
  if (ENV.appUrl) return ENV.appUrl;
  const rawProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(rawProto)
    ? rawProto[0].split(",")[0].trim()
    : typeof rawProto === "string"
    ? rawProto.split(",")[0].trim()
    : req.protocol;
  return `${proto}://${req.get("host")}`;
}

export function registerAuthRoutes(app: Application) {
  // ── Initiate Google OAuth ──────────────────────────────────────────────────
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!ENV.googleClientId) {
      res.status(503).json({ error: "Google OAuth is not configured" });
      return;
    }

    const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });

    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  // ── Google OAuth callback ──────────────────────────────────────────────────
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = req.query["code"] as string | undefined;

    if (!code) {
      res.redirect("/?error=google_auth_failed");
      return;
    }

    try {
      const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;

      // Exchange code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = (await tokenRes.json()) as {
        access_token?: string;
        error?: string;
      };

      if (!tokens.access_token) {
        console.error("[Google OAuth] Token exchange failed:", tokens.error);
        res.redirect("/?error=google_token_failed");
        return;
      }

      // Get user info from Google
      const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const googleUser = (await userInfoRes.json()) as {
        id?: string;
        name?: string;
        email?: string;
      };

      if (!googleUser.id) {
        res.redirect("/?error=google_userinfo_failed");
        return;
      }

      const openId = `google:${googleUser.id}`;

      await db.upsertUser({
        openId,
        name: googleUser.name ?? null,
        email: googleUser.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: googleUser.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });
      res.redirect("/");
    } catch (error) {
      console.error("[Google OAuth] Callback failed", error);
      res.redirect("/?error=google_auth_failed");
    }
  });
}
