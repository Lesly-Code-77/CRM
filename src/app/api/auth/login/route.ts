import { NextResponse } from "next/server";
import { CryptoProvider } from "@azure/msal-node";
import { LOGIN_SCOPES, microsoftConfigured, msalClient, redirectUri } from "@/lib/msal";

const OAUTH_COOKIE = "sf_oauth";

/** Étape 1 : redirection vers la page de connexion Microsoft (flux « authorization code » + PKCE). */
export async function GET(request: Request) {
  if (!microsoftConfigured()) {
    return NextResponse.redirect(new URL("/login?erreur=config", request.url));
  }
  const crypto = new CryptoProvider();
  const state = crypto.createNewGuid();
  const { verifier, challenge } = await crypto.generatePkceCodes();

  const url = await msalClient().getAuthCodeUrl({
    scopes: LOGIN_SCOPES,
    redirectUri: redirectUri(),
    state,
    codeChallenge: challenge,
    codeChallengeMethod: "S256",
    prompt: "select_account",
  });

  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, verifier }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 600,
  });
  return res;
}
