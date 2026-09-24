import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { TaskRow } from "@/components/TaskRow";
import { MicIcon } from "@/components/BottomNav";
import { ACCOUNT_STATUS, ACCOUNT_TYPE, fmtDate } from "@/lib/format";

export default async function ClientPage({ params }: PageProps<"/app/clients/[id]">) {
  const user = await requireUser("sales");
  const { id } = await params;
  const a = await db.account.findFirst({
    where: { id, orgId: user.orgId },
    include: {
      owner: true,
      contacts: { orderBy: { isPrimary: "desc" } },
      visits: { where: { status: "REALISEE" }, orderBy: { startsAt: "desc" }, take: 5, include: { user: true } },
      tasks: { where: { status: "A_FAIRE" }, include: { account: true, createdBy: true }, orderBy: { dueDate: "asc" } },
      productMentions: { where: { status: "ACCEPTEE" }, include: { product: true, voiceNote: true }, orderBy: { voiceNote: { createdAt: "desc" } }, take: 6 },
    },
  });
  if (!a) notFound();

  return (
    <>
      <PageHeader title={a.name} subtitle={`${ACCOUNT_TYPE[a.type]} · ${a.city ?? ""}`} back="/app/clients" />
      <main className="space-y-5 px-4 py-4">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className={`badge ${ACCOUNT_STATUS[a.status].cls}`}>{ACCOUNT_STATUS[a.status].label}</span>
            <span className="text-xs text-zinc-500">Suivi par {a.owner?.name ?? "—"}</span>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="label">N° compte F&amp;O</dt>
              <dd className="font-mono">{a.foAccountNumber ?? "—"}</dd>
            </div>
            <div>
              <dt className="label">Dernière visite</dt>
              <dd>{fmtDate(a.lastVisitAt)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="label">Adresse</dt>
              <dd>{[a.address, a.postalCode, a.city].filter(Boolean).join(" ") || "—"}</dd>
            </div>
            {a.phone && (
              <div className="col-span-2">
                <dt className="label">Téléphone</dt>
                <dd><a href={`tel:${a.phone.replace(/\s/g, "")}`} className="text-brand-600">{a.phone}</a></dd>
              </div>
            )}
          </dl>
          {a.notes && (
            <div className="mt-3 rounded-xl bg-zinc-50 p-3">
              <p className="label mb-1">Informations clés</p>
              <p className="text-sm whitespace-pre-line">{a.notes}</p>
            </div>
          )}
        </section>

        <Link href={`/app/note/new?account=${a.id}`} className="btn-primary w-full py-3">
          <MicIcon className="h-5 w-5" /> Dicter une note pour ce client
        </Link>

        <section>
          <h2 className="label mb-2">Contacts</h2>
          <ul className="card divide-y divide-zinc-100">
            {a.contacts.map((c) => (
              <li key={c.id} className="px-4 py-3 text-sm">
                <p className="font-medium">
                  {c.firstName} {c.lastName} {c.isPrimary && <span className="badge bg-brand-50 text-brand-700">Principal</span>}
                </p>
                <p className="text-xs text-zinc-500">{c.jobTitle}</p>
                <div className="mt-1 flex gap-3 text-xs">
                  {c.email && <a href={`mailto:${c.email}`} className="text-brand-600">{c.email}</a>}
                  {c.phone && <a href={`tel:${c.phone}`} className="text-brand-600">{c.phone}</a>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {a.tasks.length > 0 && (
          <section>
            <h2 className="label mb-2">Tâches en cours</h2>
            <ul className="card divide-y divide-zinc-100">
              {a.tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          </section>
        )}

        {a.productMentions.length > 0 && (
          <section>
            <h2 className="label mb-2">Produits évoqués</h2>
            <ul className="card divide-y divide-zinc-100 text-sm">
              {a.productMentions.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-4 py-2.5">
                  <span>
                    {m.product ? `${m.product.category} ${m.product.name}` : m.rawLabel}
                    {m.product && <span className="ml-1 font-mono text-xs text-zinc-400">{m.product.foItemNumber}</span>}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {m.intent}{m.quantity ? ` · ${m.quantity} pcs` : ""} · {fmtDate(m.voiceNote.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="label mb-2">Historique des visites</h2>
          {a.visits.length === 0 ? (
            <p className="card p-4 text-sm text-zinc-500">Aucune visite enregistrée.</p>
          ) : (
            <ol className="space-y-2">
              {a.visits.map((v) => (
                <li key={v.id} className="card p-4 text-sm">
                  <p className="mb-1 text-xs text-zinc-500">{fmtDate(v.startsAt)} · {v.user.name}</p>
                  <p>{v.summary ?? "Pas de compte rendu."}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </>
  );
}
