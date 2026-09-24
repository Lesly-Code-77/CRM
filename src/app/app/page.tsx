import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateLong, fmtTime, startOfDay } from "@/lib/format";
import { TaskRow } from "@/components/TaskRow";
import { MicIcon } from "@/components/BottomNav";
import { logout } from "@/app/actions/auth";

export default async function TodayPage() {
  const user = await requireUser("sales");
  const [visits, pending, tasks] = await Promise.all([
    db.visit.findMany({
      where: { userId: user.id, startsAt: { gte: startOfDay(), lt: startOfDay(1) }, status: { not: "ANNULEE" } },
      include: { account: true, voiceNotes: { select: { id: true, status: true } } },
      orderBy: { startsAt: "asc" },
    }),
    db.voiceNote.findMany({
      where: { userId: user.id, status: "A_VALIDER" },
      include: { account: true },
      orderBy: { createdAt: "desc" },
    }),
    db.task.findMany({
      where: { assigneeId: user.id, status: "A_FAIRE", dueDate: { lt: startOfDay(3) } },
      include: { account: true, createdBy: true },
      orderBy: [{ dueDate: "asc" }],
      take: 6,
    }),
  ]);

  return (
    <main className="px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <div className="flex items-start justify-between py-3">
        <div>
          <p className="text-sm capitalize text-zinc-500">{fmtDateLong(new Date())}</p>
          <h1 className="text-2xl font-bold">Bonjour {user.name.split(" ")[0]}</h1>
        </div>
        <form action={logout}>
          <button className="text-xs text-zinc-500 underline">Déconnexion</button>
        </form>
      </div>

      {pending.length > 0 && (
        <section className="mb-5">
          {pending.map((n) => (
            <Link key={n.id} href={`/app/note/${n.id}`} className="mb-2 flex items-center gap-3 rounded-2xl bg-brand-600 p-4 text-white">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">
                <MicIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">À valider · {n.account.name}</span>
                <span className="block truncate text-xs text-white/80">Email, tâches et fiche client prêts à relire</span>
              </span>
              <span className="text-xl">›</span>
            </Link>
          ))}
        </section>
      )}

      <section className="mb-6">
        <h2 className="label mb-2">Rendez-vous du jour</h2>
        {visits.length === 0 ? (
          <p className="card p-4 text-sm text-zinc-500">Aucun rendez-vous aujourd&apos;hui dans votre calendrier.</p>
        ) : (
          <ol className="card divide-y divide-zinc-100">
            {visits.map((v) => {
              const note = v.voiceNotes[0];
              return (
                <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">{fmtTime(v.startsAt)}</span>
                  <Link href={`/app/clients/${v.accountId}`} className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{v.account.name}</span>
                    <span className="block text-xs text-zinc-500">{v.account.city}</span>
                  </Link>
                  {note ? (
                    <Link href={`/app/note/${note.id}`} className={`badge ${note.status === "VALIDEE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                      {note.status === "VALIDEE" ? "Traitée" : "À valider"}
                    </Link>
                  ) : (
                    <Link href={`/app/note/new?visit=${v.id}`} className="btn-ghost px-3 py-1.5 text-xs">
                      <MicIcon className="h-4 w-4" /> Dicter
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="label">Tâches urgentes</h2>
          <Link href="/app/taches" className="text-xs font-medium text-brand-600">Tout voir</Link>
        </div>
        {tasks.length === 0 ? (
          <p className="card p-4 text-sm text-zinc-500">Rien d&apos;urgent pour les 3 prochains jours.</p>
        ) : (
          <ul className="card divide-y divide-zinc-100">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
