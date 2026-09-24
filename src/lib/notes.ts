import type { PrismaClient } from "@/generated/prisma/client";
import { analyzeNote } from "@/lib/ai/analyze";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Crée une note vocale à partir d'une transcription et enregistre les propositions de l'IA
 * (brouillon d'email, tâches, mises à jour de fiche, produits). Tout reste « proposé »
 * tant que le commercial n'a pas validé.
 */
export async function createAnalyzedNote(
  db: PrismaClient,
  params: { userId: string; accountId: string; transcript: string; durationSec?: number; visitId?: string | null; now?: Date },
) {
  const now = params.now ?? new Date();
  const [user, account, products] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: params.userId } }),
    db.account.findUniqueOrThrow({ where: { id: params.accountId }, include: { contacts: true } }),
    db.product.findMany({ where: { org: { accounts: { some: { id: params.accountId } } } } }),
  ]);
  if (account.orgId !== user.orgId) throw new Error("Client hors de l'organisation");

  const analysis = await analyzeNote({
    transcript: params.transcript,
    userName: user.name,
    date: now,
    account: { name: account.name, status: account.status, notes: account.notes },
    contacts: account.contacts,
    products,
  });

  const contact = account.contacts.find((c) => c.id === analysis.email.toContactId) ?? null;

  return db.voiceNote.create({
    data: {
      userId: user.id,
      accountId: account.id,
      visitId: params.visitId ?? null,
      status: "A_VALIDER",
      durationSec: params.durationSec,
      transcript: params.transcript,
      summary: analysis.summary,
      aiRaw: analysis,
      createdAt: now,
      emailDraft: {
        create: {
          toEmail: contact?.email ?? null,
          toName: contact ? `${contact.firstName} ${contact.lastName}` : null,
          subject: analysis.email.subject,
          body: analysis.email.body,
        },
      },
      tasks: {
        create: analysis.tasks.map((t) => ({
          orgId: user.orgId,
          title: t.title,
          details: t.details,
          dueDate: new Date(now.getTime() + t.dueInDays * DAY),
          priority: t.priority,
          status: "PROPOSEE" as const,
          source: "NOTE_VOCALE" as const,
          assigneeId: user.id,
          createdById: user.id,
          accountId: account.id,
        })),
      },
      accountUpdates: {
        create: analysis.accountUpdates.map((u) => ({
          accountId: account.id,
          field: u.field,
          label: u.label,
          oldValue: (account as Record<string, unknown>)[u.field]?.toString() ?? null,
          newValue: u.newValue,
        })),
      },
      productMentions: {
        create: analysis.products.map((p) => ({
          accountId: account.id,
          productId: p.productId,
          rawLabel: p.rawLabel,
          quantity: p.quantity,
          intent: p.intent,
        })),
      },
    },
  });
}

export type ValidationDecision = {
  email: { keep: boolean; subject: string; body: string };
  taskIds: string[]; // tâches proposées retenues
  updateIds: string[]; // mises à jour de fiche retenues
  mentionIds: string[]; // produits retenus
};

const ALLOWED_FIELDS = new Set(["notes", "status", "phone"]);
const STATUSES = new Set(["PROSPECT", "ACTIF", "A_RISQUE", "INACTIF"]);

/**
 * Validation humaine : seules les propositions cochées sont appliquées.
 * En production, c'est ici que le brouillon Outlook sera créé via Microsoft Graph
 * (Mail.ReadWrite, POST /me/messages) — SalesFlow n'envoie jamais l'email lui-même.
 */
export async function validateNote(db: PrismaClient, noteId: string, userId: string, d: ValidationDecision) {
  const note = await db.voiceNote.findUniqueOrThrow({
    where: { id: noteId },
    include: { tasks: true, accountUpdates: true, productMentions: true, user: true, visit: true },
  });
  if (note.userId !== userId) throw new Error("Cette note appartient à un autre utilisateur");
  if (note.status !== "A_VALIDER") throw new Error("Cette note a déjà été traitée");

  const now = new Date();
  const keepTask = new Set(d.taskIds);
  const keepUpdate = new Set(d.updateIds);
  const keepMention = new Set(d.mentionIds);

  await db.$transaction(async (tx) => {
    await tx.emailDraft.update({
      where: { voiceNoteId: note.id },
      data: d.email.keep
        ? { subject: d.email.subject.trim(), body: d.email.body, status: "VALIDE" }
        : { status: "ABANDONNE" },
    });

    for (const t of note.tasks) {
      await tx.task.update({ where: { id: t.id }, data: { status: keepTask.has(t.id) ? "A_FAIRE" : "ANNULEE" } });
    }

    const accountData: Record<string, string> = {};
    for (const u of note.accountUpdates) {
      const ok = keepUpdate.has(u.id) && ALLOWED_FIELDS.has(u.field) && (u.field !== "status" || STATUSES.has(u.newValue));
      await tx.accountUpdate.update({ where: { id: u.id }, data: { status: ok ? "ACCEPTEE" : "REJETEE" } });
      if (ok) accountData[u.field] = u.newValue;
    }

    for (const m of note.productMentions) {
      await tx.productMention.update({ where: { id: m.id }, data: { status: keepMention.has(m.id) ? "ACCEPTEE" : "REJETEE" } });
    }

    await tx.account.update({ where: { id: note.accountId }, data: { ...accountData, lastVisitAt: note.visit?.startsAt ?? note.createdAt } });

    if (note.visitId) {
      await tx.visit.update({ where: { id: note.visitId }, data: { status: "REALISEE", summary: note.summary } });
    }

    await tx.voiceNote.update({ where: { id: note.id }, data: { status: "VALIDEE", validatedAt: now } });

    await tx.auditLog.create({
      data: {
        orgId: note.user.orgId,
        userId,
        action: "voice_note.validated",
        entity: "VoiceNote",
        entityId: note.id,
        meta: { email: d.email.keep, tasks: d.taskIds.length, updates: Object.keys(accountData), products: d.mentionIds.length },
      },
    });
  });
}

export async function rejectNote(db: PrismaClient, noteId: string, userId: string) {
  const note = await db.voiceNote.findUniqueOrThrow({ where: { id: noteId }, include: { user: true } });
  if (note.userId !== userId || note.status !== "A_VALIDER") throw new Error("Action impossible");
  await db.$transaction([
    db.task.updateMany({ where: { voiceNoteId: noteId }, data: { status: "ANNULEE" } }),
    db.accountUpdate.updateMany({ where: { voiceNoteId: noteId }, data: { status: "REJETEE" } }),
    db.productMention.updateMany({ where: { voiceNoteId: noteId }, data: { status: "REJETEE" } }),
    db.emailDraft.update({ where: { voiceNoteId: noteId }, data: { status: "ABANDONNE" } }),
    db.voiceNote.update({ where: { id: noteId }, data: { status: "REJETEE" } }),
    db.auditLog.create({ data: { orgId: note.user.orgId, userId, action: "voice_note.rejected", entity: "VoiceNote", entityId: noteId } }),
  ]);
}
