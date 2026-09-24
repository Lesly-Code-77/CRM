import "server-only";

/**
 * Appels Microsoft Graph (au nom de l'utilisateur connecté).
 * SalesFlow crée des BROUILLONS uniquement : l'utilisateur relit et envoie depuis Outlook.
 */
const GRAPH = "https://graph.microsoft.com/v1.0";

export class GraphError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function graph<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GraphError(res.status, `Graph ${res.status} sur ${path} : ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/** Crée un brouillon dans le dossier « Brouillons » d'Outlook. Renvoie l'id du message et son lien web. */
export async function createOutlookDraft(
  token: string,
  draft: { subject: string; body: string; toEmail?: string | null; toName?: string | null },
) {
  const message = await graph<{ id: string; webLink?: string }>(token, "/me/messages", {
    method: "POST",
    body: JSON.stringify({
      subject: draft.subject,
      body: { contentType: "Text", content: draft.body },
      toRecipients: draft.toEmail ? [{ emailAddress: { address: draft.toEmail, name: draft.toName ?? undefined } }] : [],
    }),
  });
  return { id: message.id, webLink: message.webLink ?? null };
}
