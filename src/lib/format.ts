const TZ = "Europe/Paris";

export const fmtDate = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: TZ }).format(d) : "—";

export const fmtDateLong = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(d);

export const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(d);

export const fmtDuration = (sec: number | null | undefined) =>
  sec ? `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, "0")} s` : "";

export function daysSince(d: Date | null | undefined) {
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function startOfDay(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

export const ACCOUNT_STATUS: Record<string, { label: string; cls: string }> = {
  PROSPECT: { label: "Prospect", cls: "bg-sky-100 text-sky-800" },
  ACTIF: { label: "Actif", cls: "bg-emerald-100 text-emerald-800" },
  A_RISQUE: { label: "À risque", cls: "bg-amber-100 text-amber-900" },
  INACTIF: { label: "Inactif", cls: "bg-zinc-200 text-zinc-700" },
};

export const ACCOUNT_TYPE: Record<string, string> = {
  MAGASIN: "Magasin",
  CHAINE: "Chaîne",
  DISTRIBUTEUR: "Distributeur",
};

export const PRIORITY: Record<string, { label: string; cls: string }> = {
  HAUTE: { label: "Haute", cls: "bg-rose-100 text-rose-800" },
  NORMALE: { label: "Normale", cls: "bg-zinc-100 text-zinc-700" },
  BASSE: { label: "Basse", cls: "bg-zinc-50 text-zinc-500" },
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
