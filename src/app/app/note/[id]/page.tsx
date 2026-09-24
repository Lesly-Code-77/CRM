import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { confirmNote, discardNote } from "@/app/actions/sales";
import { ACCOUNT_STATUS, fmtDate, fmtDuration, PRIORITY } from "@/lib/format";

export const metadata = { title: "Validation" };

function displayValue(field: string, v: string | null) {
  if (!v) return "—";
  return field === "status" ? (ACCOUNT_STATUS[v]?.label ?? v) : v;
}

export default async function NotePage({ params, searchParams }: PageProps<"/app/note/[id]">) {
  const user = await requireUser("sales");
  const { id } = await params;
  const { ok } = await searchParams;
  const note = await db.voiceNote.findFirst({
    where: { id, userId: user.id },
    include: {
      account: true,
      emailDraft: true,
      tasks: { orderBy: { dueDate: "asc" } },
      accountUpdates: true,
      productMentions: { include: { product: true } },
    },
  });
  if (!note) notFound();

  const pending = note.status === "A_VALIDER";
  const email = note.emailDraft;

  if (!pending) {
    const keptTasks = note.tasks.filter((t) => t.status !== "ANNULEE" && t.status !== "PROPOSEE");
    const keptUpdates = note.accountUpdates.filter((u) => u.status === "ACCEPTEE");
    return (
      <>
        <PageHeader title={note.account.name} subtitle={`Note du ${fmtDate(note.createdAt)}`} back="/app" />
        <main className="space-y-4 px-4 py-4">
          {ok && (
            <div className="rounded-2xl bg-emerald-600 p-4 text-white">
              <p className="font-semibold">C&apos;est validé ✓</p>
              <p className="text-sm text-white/90">
                {email?.status === "VALIDE" ? "Brouillon d'email prêt" : "Pas d'email"} · {keptTasks.length} tâche{keptTasks.length > 1 ? "s" : ""} créée
                {keptTasks.length > 1 ? "s" : ""} · fiche client {keptUpdates.length ? "mise à jour" : "inchangée"}
              </p>
            </div>
          )}
          {note.status === "REJETEE" && <p className="card p-4 text-sm">Cette note a été rejetée : aucune action n&apos;a été appliquée.</p>}
          <section className="card p-4">
            <p className="label mb-1">Résumé</p>
            <p className="text-sm">{note.summary}</p>
          </section>
          {email && email.status !== "ABANDONNE" && (
            <section className="card p-4">
              <p className="label mb-1">Email · {email.status === "BROUILLON_OUTLOOK" ? "dans vos brouillons Outlook" : "validé"}</p>
              <p className="text-sm font-medium">{email.subject}</p>
              <p className="mt-2 text-sm whitespace-pre-line text-zinc-700">{email.body}</p>
              {email.status === "VALIDE" && (
                <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                  Mode démo : le brouillon sera déposé dans Outlook quand la connexion Microsoft 365 sera activée. SalesFlow n&apos;envoie jamais d&apos;email lui-même.
                </p>
              )}
            </section>
          )}
          {keptTasks.length > 0 && (
            <section className="card p-4">
              <p className="label mb-2">Tâches</p>
              <ul className="space-y-1 text-sm">
                {keptTasks.map((t) => (
                  <li key={t.id}>• {t.title} <span className="text-zinc-500">({fmtDate(t.dueDate)})</span></li>
                ))}
              </ul>
            </section>
          )}
          <Link href={`/app/clients/${note.accountId}`} className="btn-ghost w-full">Voir la fiche client</Link>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader title="À valider" subtitle={`${note.account.name} · ${fmtDate(note.createdAt)}`} back="/app" />
      <form action={confirmNote.bind(null, note.id)} className="space-y-5 px-4 py-4">
        <section className="card p-4">
          <p className="label mb-1">Résumé de la visite</p>
          <p className="text-sm">{note.summary}</p>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-xs font-medium text-brand-600">
              Voir la transcription {note.durationSec ? `(${fmtDuration(note.durationSec)})` : ""}
            </summary>
            <p className="mt-2 rounded-xl bg-zinc-50 p-3 text-zinc-700">{note.transcript}</p>
          </details>
        </section>

        {email && (
          <section>
            <label className="mb-2 flex items-center justify-between">
              <span className="label">Brouillon d&apos;email</span>
              <span className="flex items-center gap-2 text-sm">
                Garder <input type="checkbox" name="emailKeep" defaultChecked className="h-5 w-5 accent-brand-600" />
              </span>
            </label>
            <div className="card space-y-3 p-4">
              <p className="text-xs text-zinc-500">
                À : {email.toName ? `${email.toName} <${email.toEmail ?? "adresse inconnue"}>` : "destinataire à compléter"}
              </p>
              <input name="emailSubject" defaultValue={email.subject} className="input font-medium" aria-label="Objet" />
              <textarea name="emailBody" defaultValue={email.body} rows={10} className="input text-sm leading-relaxed" aria-label="Message" />
            </div>
          </section>
        )}

        {note.tasks.length > 0 && (
          <section>
            <p className="label mb-2">Tâches proposées</p>
            <ul className="card divide-y divide-zinc-100">
              {note.tasks.map((t) => (
                <li key={t.id}>
                  <label className="flex items-start gap-3 px-4 py-3">
                    <input type="checkbox" name="task" value={t.id} defaultChecked className="mt-0.5 h-5 w-5 accent-brand-600" />
                    <span className="flex-1 text-sm">
                      <span className="block font-medium">{t.title}</span>
                      <span className="text-xs text-zinc-500">
                        Échéance {fmtDate(t.dueDate)}
                        {t.priority !== "NORMALE" && <span className={`badge ml-2 ${PRIORITY[t.priority].cls}`}>{PRIORITY[t.priority].label}</span>}
                      </span>
                      {t.details && <span className="mt-1 block text-xs text-zinc-500 italic">« {t.details} »</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        {note.accountUpdates.length > 0 && (
          <section>
            <p className="label mb-2">Mises à jour de la fiche client</p>
            <ul className="card divide-y divide-zinc-100">
              {note.accountUpdates.map((u) => (
                <li key={u.id}>
                  <label className="flex items-start gap-3 px-4 py-3">
                    <input type="checkbox" name="update" value={u.id} defaultChecked className="mt-0.5 h-5 w-5 accent-brand-600" />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-medium">{u.label}</span>
                      {u.field === "notes" ? (
                        <span className="block text-xs whitespace-pre-line text-zinc-600">{u.newValue.replace(u.oldValue ?? "", "").trim()}</span>
                      ) : (
                        <span className="block text-xs text-zinc-600">
                          <span className="line-through">{displayValue(u.field, u.oldValue)}</span> → <strong>{displayValue(u.field, u.newValue)}</strong>
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        {note.productMentions.length > 0 && (
          <section>
            <p className="label mb-2">Produits cités</p>
            <ul className="card divide-y divide-zinc-100">
              {note.productMentions.map((m) => (
                <li key={m.id}>
                  <label className="flex items-center gap-3 px-4 py-3 text-sm">
                    <input type="checkbox" name="mention" value={m.id} defaultChecked className="h-5 w-5 accent-brand-600" />
                    <span className="flex-1">
                      {m.product ? `${m.product.category} ${m.product.name}` : m.rawLabel}
                      {m.product && <span className="ml-1 font-mono text-xs text-zinc-400">{m.product.foItemNumber}</span>}
                    </span>
                    <span className="text-xs text-zinc-500">{m.intent}{m.quantity ? ` · ${m.quantity} pcs` : ""}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="sticky bottom-20 space-y-2 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent pt-4">
          <button className="btn-primary w-full py-3">Valider la sélection</button>
          <button formAction={discardNote.bind(null, note.id)} className="btn-ghost w-full text-rose-600">
            Tout rejeter
          </button>
        </div>
      </form>
    </>
  );
}
