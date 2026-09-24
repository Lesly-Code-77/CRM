import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { getGraphToken } from "@/lib/msal";
import { createOutlookDraft } from "@/lib/graph";

/**
 * Dépose le brouillon validé dans Outlook (Graph, Mail.ReadWrite).
 * « no-token » : l'utilisateur doit se reconnecter ; « error » : Graph a refusé.
 */
export async function pushDraftToOutlook(
  db: PrismaClient,
  noteId: string,
  userId: string,
  homeAccountId: string,
): Promise<"ok" | "no-token" | "error"> {
  const note = await db.voiceNote.findFirst({ where: { id: noteId, userId }, include: { emailDraft: true, user: true } });
  const draft = note?.emailDraft;
  if (!note || !draft || draft.status !== "VALIDE") return "error";

  const token = await getGraphToken(homeAccountId);
  if (!token) return "no-token";
  try {
    const created = await createOutlookDraft(token, draft);
    await db.emailDraft.update({
      where: { id: draft.id },
      data: { status: "BROUILLON_OUTLOOK", graphMessageId: created.id, graphWebLink: created.webLink },
    });
    await db.auditLog.create({
      data: { orgId: note.user.orgId, userId, action: "email.draft_created", entity: "EmailDraft", entityId: draft.id },
    });
    return "ok";
  } catch (e) {
    console.error("[graph] création du brouillon impossible", e);
    return "error";
  }
}
