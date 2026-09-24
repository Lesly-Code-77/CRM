import { connection } from "next/server";
import { db } from "@/lib/db";
import { loginAs } from "@/app/actions/auth";
import { initials } from "@/lib/format";

export const metadata = { title: "Connexion" };

export default async function LoginPage() {
  await connection(); // rendu à chaque requête (la liste vient de la base)
  const users = await db.user.findMany({ where: { active: true }, orderBy: [{ role: "desc" }, { name: "asc" }] });
  const groups = [
    { title: "Commerciaux", list: users.filter((u) => u.role === "SALES") },
    { title: "Direction", list: users.filter((u) => u.role !== "SALES") },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-11 w-11" />
        <div>
          <h1 className="text-2xl font-bold">SalesFlow</h1>
          <p className="text-sm text-zinc-500">De la note vocale au suivi client</p>
        </div>
      </div>

      <button disabled className="btn-ghost mb-2 w-full" title="Disponible avec Entra ID">
        Se connecter avec Microsoft 365
      </button>
      <p className="mb-8 text-center text-xs text-zinc-500">Connexion Microsoft bientôt disponible. Mode démo : choisissez un profil.</p>

      {groups.map((g) => (
        <section key={g.title} className="mb-6">
          <h2 className="label mb-2">{g.title}</h2>
          <div className="card divide-y divide-zinc-100">
            {g.list.map((u) => (
              <form key={u.id} action={loginAs}>
                <input type="hidden" name="userId" value={u.id} />
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {initials(u.name)}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">{u.name}</span>
                    <span className="block text-xs text-zinc-500">{u.region ?? (u.role === "SALES" ? "Commercial" : "Direction")}</span>
                  </span>
                  <span className="text-zinc-400">›</span>
                </button>
              </form>
            ))}
          </div>
        </section>
      ))}
      {users.length === 0 && (
        <p className="card p-4 text-sm">Aucun utilisateur. Lancez <code>npm run db:seed</code> pour charger les données de démo.</p>
      )}
    </main>
  );
}
