import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACCOUNT_STATUS, ACCOUNT_TYPE, daysSince, fmtDate } from "@/lib/format";
import type { AccountStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Clients" };

export default async function DirectionClients({ searchParams }: PageProps<"/direction/clients">) {
  const manager = await requireUser("direction");
  const sp = await searchParams;
  const status = typeof sp.statut === "string" && sp.statut in ACCOUNT_STATUS ? (sp.statut as AccountStatus) : undefined;

  const accounts = await db.account.findMany({
    where: { orgId: manager.orgId, ...(status ? { status } : {}) },
    include: { owner: true, _count: { select: { tasks: { where: { status: "A_FAIRE" } } } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Portefeuille clients · {accounts.length}</h1>
        <Link href="/direction/clients" className={`badge px-3 py-1 ${!status ? "bg-ink text-white" : "bg-zinc-200"}`}>Tous</Link>
        {Object.entries(ACCOUNT_STATUS).map(([k, v]) => (
          <Link key={k} href={`/direction/clients?statut=${k}`} className={`badge px-3 py-1 ${status === k ? "bg-ink text-white" : "bg-zinc-200"}`}>{v.label}</Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-zinc-200 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Client</th>
              <th className="px-4 py-2.5 font-medium">N° F&amp;O</th>
              <th className="px-4 py-2.5 font-medium">Commercial</th>
              <th className="px-4 py-2.5 font-medium">Statut</th>
              <th className="px-4 py-2.5 font-medium">Dernière visite</th>
              <th className="px-4 py-2.5 text-right font-medium">Tâches</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {accounts.map((a) => {
              const since = daysSince(a.lastVisitAt);
              return (
                <tr key={a.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/direction/clients/${a.id}`} className="font-medium text-brand-700">{a.name}</Link>
                    <p className="text-xs text-zinc-500">{ACCOUNT_TYPE[a.type]} · {a.city}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{a.foAccountNumber ?? "—"}</td>
                  <td className="px-4 py-3">{a.owner?.name ?? "—"}</td>
                  <td className="px-4 py-3"><span className={`badge ${ACCOUNT_STATUS[a.status].cls}`}>{ACCOUNT_STATUS[a.status].label}</span></td>
                  <td className={`px-4 py-3 ${since !== null && since > 30 ? "text-amber-700" : ""}`}>{fmtDate(a.lastVisitAt)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{a._count.tasks}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
