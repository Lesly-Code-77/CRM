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

/** Heure « murale » à Paris d'un instant, exprimée comme si c'était de l'UTC (pour calculer le décalage). */
function parisWallAsUtc(ms: number) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, Number(x.value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/**
 * Minuit à Paris (aujourd'hui + offsetDays), quel que soit le fuseau du serveur
 * (Netlify et Azure tournent en UTC).
 */
export function startOfDay(offsetDays = 0) {
  const now = Date.now();
  const wall = new Date(parisWallAsUtc(now));
  const guess = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() + offsetDays);
  return new Date(guess - (parisWallAsUtc(guess) - guess));
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
