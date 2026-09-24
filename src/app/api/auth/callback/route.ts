import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { LOGIN_SCOPES, microsoftConfigured, msalClient, redirectUri } from "@/lib/msal";

const OAUTH_COOKIE = "sf_oauth";

function fail(request: NextRequest, code: string, extra: Record<string, string> = {}) {
  const url = new URL("/login", request.url);
  url.searchParams.set("erreur", code);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
  return res;
}

/**
 * Étape 2 : retour de Microsoft.
 * On échange le code contre des jetons, puis on rattache le compte à une organisation
 * (par tenantId) et à un utilisateur SalesFlow existant (par identifiant Entra, sinon par email).
 * Personne ne peut entrer s'il n'a pas été ajouté au préalable dans SalesFlow.
 */
export async function GET(request: NextRequest) {
  if (!microsoftConfigured()) return fail(request, "config");
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return fail(request, params.get("error") === "access_denied" ? "refus" : "microsoft");

  let saved: { state: string; verifier: string } | null = null;
  try {
    saved = JSON.parse(request.cookies.get(OAUTH_COOKIE)?.value ?? "null");
  } catch {}
  const code = params.get("code");
  if (!saved || !code || params.get("state") !== saved.state) return fail(request, "session");

  let result;
  try {
    result = await msalClient().acquireTokenByCode({
      code,
      scopes: LOGIN_SCOPES,
      redirectUri: redirectUri(),
      codeVerifier: saved.verifier,
    });
  } catch (e) {
    console.error("[auth] échange du code impossible", e);
    return fail(request, "microsoft");
  }

  const account = result.account;
  const claims = (result.idTokenClaims ?? {}) as { oid?: string; tid?: string; preferred_username?: string; email?: string };
  const tenantId = claims.tid ?? account?.tenantId;
  const oid = claims.oid ?? account?.localAccountId;
  const email = (claims.email ?? claims.preferred_username ?? account?.username ?? "").toLowerCase();
  if (!account || !tenantId || !oid) return fail(request, "microsoft");

  const org = await db.organization.findUnique({ where: { entraTenantId: tenantId } });
  if (!org) return fail(request, "organisation", { tenant: tenantId });

  let user = await db.user.findFirst({ where: { entraObjectId: oid, orgId: org.id } });
  if (!user && email) {
    user = await db.user.findFirst({ where: { orgId: org.id, email: { equals: email, mode: "insensitive" }, entraObjectId: null } });
    if (user) user = await db.user.update({ where: { id: user.id }, data: { entraObjectId: oid } });
  }
  if (!user || !user.active) return fail(request, "utilisateur", { email });

  await createSession(user.id, "MICROSOFT", account.homeAccountId);
  await db.auditLog.create({ data: { orgId: org.id, userId: user.id, action: "auth.login", entity: "User", entityId: user.id } });

  const res = NextResponse.redirect(new URL(user.role === "SALES" ? "/app" : "/direction", request.url));
  res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
  return res;
}
