"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/direction", label: "Tableau de bord" },
  { href: "/direction/clients", label: "Clients" },
  { href: "/direction/taches", label: "Tâches" },
];

export function DirectionNav() {
  const path = usePathname();
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {links.map((l) => {
        const active = l.href === "/direction" ? path === l.href : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap ${active ? "border-brand-600 text-brand-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
