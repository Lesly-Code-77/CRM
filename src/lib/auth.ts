import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

/**
 * Authentification — MODE DÉMO.
 * On choisit un utilisateur sur /login et son id est gardé dans un cookie httpOnly.
 * Phase suivante : remplacer par la connexion Microsoft Entra ID (MSAL) ; le reste
 * de l'application n'appelle que getCurrentUser()/requireUser(), qui ne changeront pas.
 */
export const SESSION_COOKIE = "sf_uid";

export async function getCurrentUser() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return db.user.findFirst({ where: { id, active: true }, include: { org: true } });
}

export async function requireUser(kind?: "sales" | "direction") {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (kind === "direction" && user.role === "SALES") redirect("/app");
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
