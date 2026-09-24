"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, demoModeEnabled, destroySession } from "@/lib/auth";

/** Connexion par choix de profil — uniquement en mode démo. */
export async function loginAs(formData: FormData) {
  if (!demoModeEnabled()) redirect("/login");
  const user = await db.user.findFirst({ where: { id: String(formData.get("userId")), active: true } });
  if (!user) redirect("/login");
  await createSession(user.id, "DEMO");
  redirect(user.role === "SALES" ? "/app" : "/direction");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
