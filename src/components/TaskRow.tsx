import Link from "next/link";
import { toggleTask } from "@/app/actions/sales";
import { fmtDate, PRIORITY } from "@/lib/format";

type T = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  source: string;
  account: { id: string; name: string } | null;
  createdBy?: { name: string } | null;
};

export function TaskRow({ task, clientHref = "/app/clients" }: { task: T; clientHref?: string }) {
  const done = task.status === "FAITE";
  const overdue = !done && task.dueDate && task.dueDate < new Date(new Date().setHours(0, 0, 0, 0));
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <form action={toggleTask.bind(null, task.id)}>
        <button
          aria-label={done ? "Marquer à faire" : "Marquer comme faite"}
          className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full border-2 ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 hover:border-brand-500"}`}
        >
          {done && "✓"}
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] leading-snug ${done ? "text-zinc-400 line-through" : ""}`}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
          {task.account && (
            <Link href={`${clientHref}/${task.account.id}`} className="font-medium text-brand-600">
              {task.account.name}
            </Link>
          )}
          {task.dueDate && <span className={overdue ? "font-semibold text-rose-600" : ""}>{overdue ? "En retard · " : ""}{fmtDate(task.dueDate)}</span>}
          {task.priority === "HAUTE" && !done && <span className={`badge ${PRIORITY.HAUTE.cls}`}>Priorité haute</span>}
          {task.source === "DIRECTION" && <span className="badge bg-violet-100 text-violet-800">Direction{task.createdBy ? ` · ${task.createdBy.name.split(" ")[0]}` : ""}</span>}
          {task.source === "NOTE_VOCALE" && <span className="badge bg-brand-50 text-brand-700">Note vocale</span>}
        </div>
      </div>
    </li>
  );
}
