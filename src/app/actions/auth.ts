"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, demoModeEnabled, demoUnlocked, destroySession, unlockDemoWith } from "@/lib/auth";

/** Connexion par choix de profil — uniquement en mode démo. */
export async function loginAs(formData: FormData) {
  if (!demoModeEnabled() || !(await demoUnlocked())) redirect("/login");
  const user = await db.user.findFirst({ where: { id: String(formData.get("userId")), active: true } });
  if (!user) redirect("/login");
  await createSession(user.id, "DEMO");
  redirect(user.role === "SALES" ? "/app" : "/direction");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/** Saisie du code d'accès à la démo. */
export async function unlockDemo(formData: FormData) {
  const ok = await unlockDemoWith(String(formData.get("code") ?? ""));
  redirect(ok ? "/login" : "/login?erreur=code");
}
