"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, requireUser } from "@/lib/auth";
import { createAnalyzedNote, rejectNote, validateNote } from "@/lib/notes";
import { pushDraftToOutlook } from "@/lib/outlook";

const noteInput = z.object({
  accountId: z.string().min(1, "Choisissez un client"),
  visitId: z.string().optional(),
  transcript: z.string().trim().min(20, "La note est trop courte"),
  durationSec: z.coerce.number().int().min(0).optional(),
});

export type NoteFormState = { error?: string };

/** Étape 1 : la note (transcrite) est analysée → propositions à valider. */
export async function submitNote(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const user = await requireUser("sales");
  const parsed = noteInput.safeParse({
    accountId: formData.get("accountId"),
    visitId: formData.get("visitId") || undefined,
    transcript: formData.get("transcript"),
    durationSec: formData.get("durationSec") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const account = await db.account.findFirst({ where: { id: parsed.data.accountId, orgId: user.orgId } });
  if (!account) return { error: "Client introuvable" };

  let visitId = parsed.data.visitId ?? null;
  if (visitId) {
    const visit = await db.visit.findFirst({ where: { id: visitId, userId: user.id, accountId: account.id } });
    if (!visit) visitId = null;
  }

  const note = await createAnalyzedNote(db, {
    userId: user.id,
    accountId: account.id,
    visitId,
    transcript: parsed.data.transcript,
    durationSec: parsed.data.durationSec,
  });
  redirect(`/app/note/${note.id}`);
}

/** Étape 2 : validation humaine. Seuls les éléments cochés sont appliqués. */
export async function confirmNote(noteId: string, formData: FormData) {
  const user = await requireUser("sales");
  await validateNote(db, noteId, user.id, {
    email: {
      keep: formData.get("emailKeep") === "on",
      subject: String(formData.get("emailSubject") ?? ""),
      body: String(formData.get("emailBody") ?? ""),
    },
    taskIds: formData.getAll("task").map(String),
    updateIds: formData.getAll("update").map(String),
    mentionIds: formData.getAll("mention").map(String),
  });

  // Connecté avec Microsoft : le brouillon est déposé dans Outlook dans la foulée.
  let outlook = "";
  const session = await getSession();
  if (session?.method === "MICROSOFT" && session.msalHomeAccountId && formData.get("emailKeep") === "on") {
    outlook = await pushDraftToOutlook(db, noteId, user.id, session.msalHomeAccountId);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/note/${noteId}?ok=1${outlook && outlook !== "ok" ? `&outlook=${outlook}` : ""}`);
}

/** Nouvel essai de création du brouillon Outlook (après une erreur ou une reconnexion). */
export async function retryOutlookDraft(noteId: string) {
  const user = await requireUser("sales");
  const session = await getSession();
  let outlook = "demo";
  if (session?.method === "MICROSOFT" && session.msalHomeAccountId) {
    outlook = await pushDraftToOutlook(db, noteId, user.id, session.msalHomeAccountId);
  }
  revalidatePath(`/app/note/${noteId}`);
  redirect(`/app/note/${noteId}${outlook === "ok" ? "" : `?outlook=${outlook}`}`);
}

export async function discardNote(noteId: string) {
  const user = await requireUser("sales");
  await rejectNote(db, noteId, user.id);
  revalidatePath("/app", "layout");
  redirect("/app");
}

export async function toggleTask(taskId: string) {
  const user = await requireUser();
  const task = await db.task.findFirst({ where: { id: taskId, assigneeId: user.id } });
  if (!task || (task.status !== "A_FAIRE" && task.status !== "FAITE")) return;
  const done = task.status === "A_FAIRE";
  await db.task.update({
    where: { id: task.id },
    data: { status: done ? "FAITE" : "A_FAIRE", completedAt: done ? new Date() : null },
  });
  revalidatePath("/app", "layout");
}

export async function addTask(formData: FormData) {
  const user = await requireUser("sales");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const accountId = String(formData.get("accountId") ?? "") || null;
  const due = String(formData.get("dueDate") ?? "");
  await db.task.create({
    data: {
      orgId: user.orgId,
      title,
      assigneeId: user.id,
      createdById: user.id,
      accountId: accountId && (await db.account.findFirst({ where: { id: accountId, orgId: user.orgId } })) ? accountId : null,
      dueDate: due ? new Date(`${due}T12:00:00`) : null,
      source: "MANUELLE",
    },
  });
  revalidatePath("/app", "layout");
}
