"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";

export async function loginAs(formData: FormData) {
  if (process.env.DEMO_MODE === "false") throw new Error("Connexion démo désactivée");
  const user = await db.user.findUnique({ where: { id: String(formData.get("userId")) } });
  if (!user) redirect("/login");
  (await cookies()).set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(user.role === "SALES" ? "/app" : "/direction");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
