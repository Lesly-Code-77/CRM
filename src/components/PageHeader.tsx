import Link from "next/link";

export function PageHeader({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: string; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-200 bg-zinc-50/95 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur">
      {back && (
        <Link href={back} aria-label="Retour" className="-ml-2 grid h-9 w-9 place-items-center rounded-full text-xl text-zinc-600 hover:bg-zinc-200">
          ‹
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold">{title}</h1>
        {subtitle && <p className="truncate text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
