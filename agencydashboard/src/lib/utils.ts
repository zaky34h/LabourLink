/**
 * Presentation helpers — status meta, formatting, and derived "needs attention"
 * lists. Pure functions; safe to import on server or client.
 */
import type { Labourer, LabourerStatus, Offer, Weekday } from "./types";

/** Maps a labourer status to its label + functional colour classes. */
export const STATUS_META: Record<
  LabourerStatus,
  { label: string; dot: string; chipBg: string; chipText: string }
> = {
  on_job: {
    label: "On a job",
    dot: "bg-sage-ink",
    chipBg: "bg-sage",
    chipText: "text-sage-ink",
  },
  bench: {
    label: "On the bench",
    dot: "bg-amber-ink",
    chipBg: "bg-amber",
    chipText: "text-amber-ink",
  },
  unavailable: {
    label: "Unavailable",
    dot: "bg-beige-ink",
    chipBg: "bg-beige",
    chipText: "text-beige-ink",
  },
};

export const WEEKDAYS: { key: Weekday; short: string }[] = [
  { key: "mon", short: "M" },
  { key: "tue", short: "T" },
  { key: "wed", short: "W" },
  { key: "thu", short: "T" },
  { key: "fri", short: "F" },
  { key: "sat", short: "S" },
  { key: "sun", short: "S" },
];

export const TRADES = [
  "Carpenter",
  "Electrician",
  "Plumber",
  "Concreter",
  "Steel Fixer",
  "Plasterer",
  "Tiler",
  "Painter",
  "General Labourer",
] as const;

const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

export const fmtMoney = (n: number) => AUD.format(n);
export const fmtRate = (n: number) => `${AUD.format(n)}/hr`;

/** "9 Jun 2026" */
export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Whole days from `today` until `iso` (negative = past). */
export function daysUntil(iso: string, today = new Date()): number {
  const target = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  return Math.round((b - a) / 86_400_000);
}

/** Human "in 3 days" / "in 2 weeks" / "tomorrow". */
export function relativeDays(iso: string, today = new Date()): string {
  const d = daysUntil(iso, today);
  if (d < 0) return `${Math.abs(d)}d ago`;
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d < 14) return `in ${d} days`;
  return `in ${Math.round(d / 7)} weeks`;
}

export const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** A ticket / cert expiring within `withinDays` (default 30) and not yet expired. */
export function expiringTickets(
  labourers: Labourer[],
  withinDays = 30,
  today = new Date(),
) {
  const out: { labourer: Labourer; ticket: Labourer["tickets"][number]; days: number }[] = [];
  for (const l of labourers) {
    for (const t of l.tickets) {
      if (!t.expires) continue;
      const days = daysUntil(t.expires, today);
      if (days <= withinDays) out.push({ labourer: l, ticket: t, days });
    }
  }
  return out.sort((a, b) => a.days - b.days);
}

/** Active placements ending within `withinDays` (default 7). */
export function finishingSoon(
  labourers: Labourer[],
  placements: { id: string; endDate?: string }[],
  withinDays = 7,
  today = new Date(),
) {
  const byPlacement = new Map(placements.map((p) => [p.id, p]));
  return labourers
    .filter((l) => l.status === "on_job" && l.currentPlacementId)
    .map((l) => ({ labourer: l, placement: byPlacement.get(l.currentPlacementId!) }))
    .filter(
      (x): x is { labourer: Labourer; placement: { id: string; endDate?: string } } =>
        !!x.placement?.endDate,
    )
    .map((x) => ({ ...x, days: daysUntil(x.placement.endDate!, today) }))
    .filter((x) => x.days >= 0 && x.days <= withinDays)
    .sort((a, b) => a.days - b.days);
}

/** Bench labourers with no weekly availability set (can't be placed). */
export const noAvailability = (labourers: Labourer[]) =>
  labourers.filter((l) => l.status !== "on_job" && l.availability.pattern.length === 0);

export const pendingOffers = (offers: Offer[]) =>
  offers.filter((o) => o.status === "pending");

/** `cn("a", cond && "b")` → "a b" — tiny classnames joiner. */
export const cn = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");
