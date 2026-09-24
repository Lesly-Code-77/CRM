import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { ACCOUNT_STATUS, ACCOUNT_TYPE, daysSince } from "@/lib/format";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: PageProps<"/app/clients">) {
  const user = await requireUser("sales");
  const { q, tous } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const all = tous === "1";

  const accounts = await db.account.findMany({
    where: {
      orgId: user.orgId,
      ...(all ? {} : { ownerId: user.id }),
      ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { city: { contains: query, mode: "insensitive" } }, { foAccountNumber: { contains: query, mode: "insensitive" } }] } : {}),
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader title="Clients" subtitle={`${accounts.length} revendeur${accounts.length > 1 ? "s" : ""}`} />
      <div className="px-4 py-3">
        <form className="mb-3 flex gap-2">
          <input name="q" defaultValue={query} placeholder="Nom, ville, n° de compte…" className="input" />
          {all && <input type="hidden" name="tous" value="1" />}
        </form>
        <div className="mb-3 flex gap-2 text-sm">
          <Link href={`/app/clients${query ? `?q=${encodeURIComponent(query)}` : ""}`} className={`badge px-3 py-1 ${!all ? "bg-ink text-white" : "bg-zinc-200"}`}>Mes clients</Link>
          <Link href={`/app/clients?tous=1${query ? `&q=${encodeURIComponent(query)}` : ""}`} className={`badge px-3 py-1 ${all ? "bg-ink text-white" : "bg-zinc-200"}`}>Tous</Link>
        </div>
        <ul className="card divide-y divide-zinc-100">
          {accounts.map((a) => {
            const since = daysSince(a.lastVisitAt);
            return (
              <li key={a.id}>
                <Link href={`/app/clients/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="text-xs text-zinc-500">
                      {ACCOUNT_TYPE[a.type]} · {a.city}
                      {since !== null ? ` · vu il y a ${since} j` : " · jamais visité"}
                    </p>
                  </div>
                  <span className={`badge ${ACCOUNT_STATUS[a.status].cls}`}>{ACCOUNT_STATUS[a.status].label}</span>
                </Link>
              </li>
            );
          })}
          {accounts.length === 0 && <li className="p-4 text-sm text-zinc-500">Aucun client trouvé.</li>}
        </ul>
      </div>
    </>
  );
}
