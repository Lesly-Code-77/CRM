import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignTask, cancelTask } from "@/app/actions/direction";
import { fmtDate, PRIORITY, startOfDay } from "@/lib/format";

export const metadata = { title: "Tâches" };

export default async function DirectionTasks({ searchParams }: PageProps<"/direction/taches">) {
  const manager = await requireUser("direction");
  const { commercial } = await searchParams;
  const filter = typeof commercial === "string" ? commercial : undefined;

  const [sales, accounts, tasks] = await Promise.all([
    db.user.findMany({ where: { orgId: manager.orgId, role: "SALES", active: true }, orderBy: { name: "asc" } }),
    db.account.findMany({ where: { orgId: manager.orgId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.task.findMany({
      where: { orgId: manager.orgId, status: "A_FAIRE", ...(filter ? { assigneeId: filter } : {}) },
      include: { assignee: true, account: true, createdBy: true },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
    }),
  ]);
  const today = startOfDay();

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-2xl font-bold">Tâches ouvertes · {tasks.length}</h1>
          <Link href="/direction/taches" className={`badge px-3 py-1 ${!filter ? "bg-ink text-white" : "bg-zinc-200"}`}>Toute l&apos;équipe</Link>
          {sales.map((u) => (
            <Link key={u.id} href={`/direction/taches?commercial=${u.id}`} className={`badge px-3 py-1 ${filter === u.id ? "bg-ink text-white" : "bg-zinc-200"}`}>
              {u.name.split(" ")[0]}
            </Link>
          ))}
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-zinc-200 text-left text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Tâche</th>
                <th className="px-4 py-2.5 font-medium">Commercial</th>
                <th className="px-4 py-2.5 font-medium">Échéance</th>
                <th className="px-4 py-2.5 font-medium">Origine</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {tasks.map((t) => {
                const late = t.dueDate && t.dueDate < today;
                return (
                  <tr key={t.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {t.title}
                        {t.priority === "HAUTE" && <span className={`badge ml-2 ${PRIORITY.HAUTE.cls}`}>Haute</span>}
                      </p>
                      {t.account && <Link href={`/direction/clients/${t.account.id}`} className="text-xs text-brand-600">{t.account.name}</Link>}
                    </td>
                    <td className="px-4 py-3">{t.assignee.name}</td>
                    <td className={`px-4 py-3 ${late ? "font-semibold text-rose-600" : ""}`}>{fmtDate(t.dueDate)}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {t.source === "DIRECTION" ? `Direction (${t.createdBy.name.split(" ")[0]})` : t.source === "NOTE_VOCALE" ? "Note vocale" : "Manuelle"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.source === "DIRECTION" && (
                        <form action={cancelTask.bind(null, t.id)}>
                          <button className="text-xs text-zinc-500 hover:text-rose-600">Annuler</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-zinc-500">Aucune tâche ouverte.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside>
        <form action={assignTask} className="card sticky top-4 space-y-3 p-4">
          <h2 className="font-semibold">Confier une tâche</h2>
          <input name="title" required minLength={3} placeholder="Ex. Présenter la nouvelle collection" className="input" />
          <textarea name="details" rows={2} placeholder="Précisions (facultatif)" className="input text-sm" />
          <select name="assigneeId" required defaultValue={filter ?? ""} className="input">
            <option value="" disabled>Commercial…</option>
            {sales.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select name="accountId" defaultValue="" className="input">
            <option value="">Client (facultatif)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" name="dueDate" className="input" />
            <select name="priority" defaultValue="NORMALE" className="input">
              <option value="BASSE">Basse</option>
              <option value="NORMALE">Normale</option>
              <option value="HAUTE">Haute</option>
            </select>
          </div>
          <button className="btn-primary w-full">Confier la tâche</button>
        </form>
      </aside>
    </div>
  );
}
