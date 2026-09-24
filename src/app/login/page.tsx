import { connection } from "next/server";
import { db } from "@/lib/db";
import { loginAs } from "@/app/actions/auth";
import { initials } from "@/lib/format";
import { demoModeEnabled } from "@/lib/auth";
import { microsoftConfigured } from "@/lib/msal";

const ERRORS: Record<string, string> = {
  config: "La connexion Microsoft n'est pas encore configurée (variables AZURE_AD_* manquantes).",
  refus: "Connexion annulée.",
  session: "La connexion a expiré, veuillez réessayer.",
  microsoft: "Microsoft n'a pas pu confirmer la connexion. Réessayez ou contactez votre administrateur.",
  organisation: "Votre organisation n'est pas encore inscrite sur SalesFlow.",
  utilisateur: "Votre compte n'a pas encore accès à SalesFlow. Demandez à votre responsable de vous ajouter.",
};

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  await connection(); // rendu à chaque requête (la liste vient de la base)
  const sp = await searchParams;
  const error = typeof sp.erreur === "string" ? ERRORS[sp.erreur] : undefined;
  const detail = [sp.tenant && `Locataire : ${sp.tenant}`, sp.email && `Compte : ${sp.email}`].filter(Boolean).join(" · ");
  const demo = demoModeEnabled();
  const microsoft = microsoftConfigured();
  const users = demo ? await db.user.findMany({ where: { active: true }, orderBy: [{ role: "desc" }, { name: "asc" }] }) : [];
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

      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
          {error}
          {detail && <p className="mt-1 font-mono text-xs break-all text-rose-700">{detail}</p>}
        </div>
      )}

      {microsoft ? (
        <a href="/api/auth/login" className="btn-primary mb-2 w-full py-3">
          <svg viewBox="0 0 21 21" className="h-4 w-4" aria-hidden>
            <path fill="#f25022" d="M1 1h9v9H1z" /><path fill="#7fba00" d="M11 1h9v9h-9z" /><path fill="#00a4ef" d="M1 11h9v9H1z" /><path fill="#ffb900" d="M11 11h9v9h-9z" />
          </svg>
          Se connecter avec Microsoft 365
        </a>
      ) : (
        <button disabled className="btn-ghost mb-2 w-full">Se connecter avec Microsoft 365</button>
      )}
      {demo && (
        <p className="mb-8 text-center text-xs text-zinc-500">
          {microsoft ? "Mode démo actif : vous pouvez aussi choisir un profil fictif." : "Connexion Microsoft non configurée. Mode démo : choisissez un profil."}
        </p>
      )}

      {demo && groups.map((g) => (
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
      {demo && users.length === 0 && (
        <p className="card p-4 text-sm">Aucun utilisateur. Lancez <code>npm run db:seed</code> pour charger les données de démo.</p>
      )}
    </main>
  );
}
