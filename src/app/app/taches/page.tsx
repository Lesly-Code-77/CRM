import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { TaskRow } from "@/components/TaskRow";
import { addTask } from "@/app/actions/sales";
import { startOfDay } from "@/lib/format";

export const metadata = { title: "Tâches" };

export default async function TasksPage() {
  const user = await requireUser("sales");
  const [open, done, accounts] = await Promise.all([
    db.task.findMany({
      where: { assigneeId: user.id, status: "A_FAIRE" },
      include: { account: true, createdBy: true },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    }),
    db.task.findMany({
      where: { assigneeId: user.id, status: "FAITE", completedAt: { gte: startOfDay(-7) } },
      include: { account: true, createdBy: true },
      orderBy: { completedAt: "desc" },
    }),
    db.account.findMany({ where: { orgId: user.orgId, ownerId: user.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const today = startOfDay();
  const tomorrow = startOfDay(1);
  const groups = [
    { title: "En retard", list: open.filter((t) => t.dueDate && t.dueDate < today) },
    { title: "Aujourd'hui", list: open.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate < tomorrow) },
    { title: "À venir", list: open.filter((t) => !t.dueDate || t.dueDate >= tomorrow) },
    { title: "Faites cette semaine", list: done },
  ];

  return (
    <>
      <PageHeader title="Tâches" subtitle={`${open.length} à faire`} />
      <main className="space-y-5 px-4 py-4">
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-semibold text-brand-600">+ Ajouter une tâche</summary>
          <form action={addTask} className="mt-3 space-y-2">
            <input name="title" required placeholder="Ex. Rappeler pour la commande" className="input" />
            <div className="grid grid-cols-2 gap-2">
              <select name="accountId" className="input" defaultValue="">
                <option value="">Sans client</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <input type="date" name="dueDate" className="input" />
            </div>
            <button className="btn-primary w-full">Ajouter</button>
          </form>
        </details>

        {groups.map(
          (g) =>
            g.list.length > 0 && (
              <section key={g.title}>
                <h2 className={`label mb-2 ${g.title === "En retard" ? "text-rose-600" : ""}`}>
                  {g.title} · {g.list.length}
                </h2>
                <ul className="card divide-y divide-zinc-100">
                  {g.list.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </ul>
              </section>
            ),
        )}
      </main>
    </>
  );
}
