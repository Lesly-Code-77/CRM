import { requireUser } from "@/lib/auth";
import { DirectionNav } from "@/components/DirectionNav";
import { logout } from "@/app/actions/auth";

export default async function DirectionLayout({ children }: LayoutProps<"/direction">) {
  const user = await requireUser("direction");
  return (
    <div className="min-h-dvh">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="" className="h-7 w-7" />
              <span className="font-bold">SalesFlow</span>
              <span className="badge bg-violet-100 text-violet-800">Direction</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-zinc-600 sm:inline">{user.name} · {user.org.name}</span>
              <form action={logout}>
                <button className="text-xs text-zinc-500 underline">Déconnexion</button>
              </form>
            </div>
          </div>
          <DirectionNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
