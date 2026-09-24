import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACCOUNT_STATUS, daysSince, fmtDate, initials, startOfDay } from "@/lib/format";

export const metadata = { title: "Tableau de bord" };

const count = <T extends { [k: string]: unknown; _count: { _all: number } }>(rows: T[], key: keyof T, id: string) =>
  rows.find((r) => r[key] === id)?._count._all ?? 0;

export default async function DirectionDashboard() {
  const manager = await requireUser("direction");
  const org = manager.orgId;
  const d7 = startOfDay(-7);
  const d30 = startOfDay(-30);
  const today = startOfDay();

  const [sales, visits7, visits30, notes7, pendingNotes, openTasks, lateTasks, watch, recent] = await Promise.all([
    db.user.findMany({ where: { orgId: org, role: "SALES", active: true }, orderBy: { name: "asc" } }),
    db.visit.groupBy({ by: ["userId"], where: { user: { orgId: org }, status: "REALISEE", startsAt: { gte: d7 } }, _count: { _all: true } }),
    db.visit.groupBy({ by: ["userId"], where: { user: { orgId: org }, status: "REALISEE", startsAt: { gte: d30 } }, _count: { _all: true } }),
    db.voiceNote.groupBy({ by: ["userId"], where: { user: { orgId: org }, status: "VALIDEE", validatedAt: { gte: d7 } }, _count: { _all: true } }),
    db.voiceNote.groupBy({ by: ["userId"], where: { user: { orgId: org }, status: "A_VALIDER" }, _count: { _all: true } }),
    db.task.groupBy({ by: ["assigneeId"], where: { orgId: org, status: "A_FAIRE" }, _count: { _all: true } }),
    db.task.groupBy({ by: ["assigneeId"], where: { orgId: org, status: "A_FAIRE", dueDate: { lt: today } }, _count: { _all: true } }),
    db.account.findMany({
      where: { orgId: org, status: { not: "PROSPECT" }, OR: [{ status: "A_RISQUE" }, { lastVisitAt: null }, { lastVisitAt: { lt: d30 } }] },
      include: { owner: true },
      orderBy: { lastVisitAt: { sort: "asc", nulls: "first" } },
      take: 8,
    }),
    db.voiceNote.findMany({
      where: { user: { orgId: org }, status: "VALIDEE" },
      include: { user: true, account: true },
      orderBy: { validatedAt: "desc" },
      take: 6,
    }),
  ]);

  const sum = (rows: { _count: { _all: number } }[]) => rows.reduce((s, r) => s + r._count._all, 0);
  const kpis = [
    { label: "Visites (7 j)", value: sum(visits7) },
    { label: "Notes validées (7 j)", value: sum(notes7) },
    { label: "Tâches ouvertes", value: sum(openTasks) },
    { label: "Tâches en retard", value: sum(lateTasks), alert: sum(lateTasks) > 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Activité de l&apos;équipe</h1>
        <p className="text-sm text-zinc-500">Données issues des notes validées par les commerciaux.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4">
            <p className="text-xs text-zinc-500">{k.label}</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${k.alert ? "text-rose-600" : ""}`}>{k.value}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="label mb-2">Par commercial</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-zinc-200 text-left text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Commercial</th>
                <th className="px-4 py-2.5 text-right font-medium">Visites 7 j</th>
                <th className="px-4 py-2.5 text-right font-medium">Visites 30 j</th>
                <th className="px-4 py-2.5 text-right font-medium">Notes à valider</th>
                <th className="px-4 py-2.5 text-right font-medium">Tâches ouvertes</th>
                <th className="px-4 py-2.5 text-right font-medium">En retard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sales.map((u) => {
                const late = count(lateTasks, "assigneeId", u.id);
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{initials(u.name)}</span>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-zinc-500">{u.region}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{count(visits7, "userId", u.id)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{count(visits30, "userId", u.id)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{count(pendingNotes, "userId", u.id)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <Link href={`/direction/taches?commercial=${u.id}`} className="text-brand-600">{count(openTasks, "assigneeId", u.id)}</Link>
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${late ? "font-semibold text-rose-600" : ""}`}>{late}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="label mb-2">Clients à surveiller</h2>
          <ul className="card divide-y divide-zinc-100">
            {watch.map((a) => {
              const since = daysSince(a.lastVisitAt);
              return (
                <li key={a.id}>
                  <Link href={`/direction/clients/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.name}</p>
                      <p className="text-xs text-zinc-500">
                        {a.owner?.name ?? "Sans commercial"} · {since === null ? "jamais visité" : `pas de visite depuis ${since} j`}
                      </p>
                    </div>
                    <span className={`badge ${ACCOUNT_STATUS[a.status].cls}`}>{ACCOUNT_STATUS[a.status].label}</span>
                  </Link>
                </li>
              );
            })}
            {watch.length === 0 && <li className="p-4 text-sm text-zinc-500">Aucun client à surveiller.</li>}
          </ul>
        </section>

        <section>
          <h2 className="label mb-2">Derniers comptes rendus</h2>
          <ul className="space-y-2">
            {recent.map((n) => (
              <li key={n.id} className="card p-4">
                <p className="mb-1 text-xs text-zinc-500">
                  {fmtDate(n.validatedAt)} · {n.user.name} ·{" "}
                  <Link href={`/direction/clients/${n.accountId}`} className="font-medium text-brand-600">{n.account.name}</Link>
                </p>
                <p className="text-sm">{n.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
