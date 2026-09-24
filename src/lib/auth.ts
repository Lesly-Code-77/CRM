import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";

/**
 * Sessions SalesFlow.
 * Le cookie contient un jeton aléatoire ; la base n'en garde que l'empreinte SHA-256.
 * Deux méthodes de connexion : Microsoft Entra ID (production) ou choix de profil (mode démo).
 */
export const SESSION_COOKIE = "sf_session";
const SESSION_DAYS = 14;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export const demoModeEnabled = () => process.env.DEMO_MODE !== "false";

export async function createSession(userId: string, method: "DEMO" | "MICROSOFT", msalHomeAccountId?: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { tokenHash: hash(token), userId, method, msalHomeAccountId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hash(token) } });
  store.delete(SESSION_COOKIE);
}

/** Session courante (mise en cache le temps d'un rendu). */
export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: { include: { org: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  if (session.method === "DEMO" && !demoModeEnabled()) return null;
  return session;
});

export async function getCurrentUser() {
  return (await getSession())?.user ?? null;
}

export async function requireUser(kind?: "sales" | "direction") {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (kind === "direction" && user.role === "SALES") redirect("/app");
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
