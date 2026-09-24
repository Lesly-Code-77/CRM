import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACCOUNT_STATUS, ACCOUNT_TYPE, fmtDate } from "@/lib/format";

export default async function DirectionClient({ params }: PageProps<"/direction/clients/[id]">) {
  const manager = await requireUser("direction");
  const { id } = await params;
  const a = await db.account.findFirst({
    where: { id, orgId: manager.orgId },
    include: {
      owner: true,
      contacts: true,
      visits: { orderBy: { startsAt: "desc" }, take: 10, include: { user: true } },
      tasks: { where: { status: "A_FAIRE" }, include: { assignee: true }, orderBy: { dueDate: "asc" } },
    },
  });
  if (!a) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/direction/clients" className="text-sm text-brand-600">‹ Portefeuille</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{a.name}</h1>
          <span className={`badge ${ACCOUNT_STATUS[a.status].cls}`}>{ACCOUNT_STATUS[a.status].label}</span>
        </div>
        <p className="text-sm text-zinc-500">
          {ACCOUNT_TYPE[a.type]} · {a.postalCode} {a.city} · F&amp;O {a.foAccountNumber ?? "—"} · suivi par {a.owner?.name ?? "—"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="label mb-2">Visites</h2>
          <ol className="space-y-2">
            {a.visits.map((v) => (
              <li key={v.id} className="card p-4 text-sm">
                <p className="mb-1 text-xs text-zinc-500">
                  {fmtDate(v.startsAt)} · {v.user.name} · {v.status === "PLANIFIEE" ? "planifiée" : v.status === "REALISEE" ? "réalisée" : "annulée"}
                </p>
                <p>{v.summary ?? (v.status === "PLANIFIEE" ? "À venir." : "Pas de compte rendu.")}</p>
              </li>
            ))}
            {a.visits.length === 0 && <li className="card p-4 text-sm text-zinc-500">Aucune visite.</li>}
          </ol>
        </section>
        <aside className="space-y-6">
          {a.notes && (
            <section className="card p-4">
              <p className="label mb-1">Informations clés</p>
              <p className="text-sm whitespace-pre-line">{a.notes}</p>
            </section>
          )}
          <section className="card p-4">
            <p className="label mb-2">Tâches ouvertes</p>
            <ul className="space-y-2 text-sm">
              {a.tasks.map((t) => (
                <li key={t.id}>
                  {t.title}
                  <span className="block text-xs text-zinc-500">{t.assignee.name} · {fmtDate(t.dueDate)}</span>
                </li>
              ))}
              {a.tasks.length === 0 && <li className="text-zinc-500">Aucune.</li>}
            </ul>
          </section>
          <section className="card p-4">
            <p className="label mb-2">Contacts</p>
            <ul className="space-y-2 text-sm">
              {a.contacts.map((c) => (
                <li key={c.id}>
                  {c.firstName} {c.lastName}
                  <span className="block text-xs text-zinc-500">{c.jobTitle} · {c.email}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
