"use client";

import Link from "next/link";
import { getJobs, getRoster } from "@/lib/api";
import type { Labourer, Placement } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { ROLE_LABELS } from "@/lib/roles";
import { cn, daysUntil, fmtDate, fmtRate, relativeDays } from "@/lib/utils";
import { Avatar, Card, EmptyState, Eyebrow, Loading } from "@/components/ui";

const TODAY = new Date("2026-06-09T09:00:00+10:00");

export default function JobsPage() {
  const jobs = useAsync(getJobs, []);
  const roster = useAsync(getRoster, []);

  const placements = jobs.data ?? [];
  const labourers = roster.data ?? [];
  const byId = new Map(labourers.map((l) => [l.id, l]));

  const active = placements
    .filter((p) => p.status === "active")
    .sort((a, b) => endRank(a) - endRank(b));

  const loading = jobs.loading || roster.loading;

  // Soonest to free up (active, has end date, not past).
  const freeingSoon = active
    .filter((p) => p.endDate)
    .map((p) => ({ p, days: daysUntil(p.endDate!, TODAY) }))
    .filter((x) => x.days >= 0)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Eyebrow>Jobs</Eyebrow>
        <h1 className="heading mt-1 text-3xl">Active placements</h1>
        <p className="mt-1.5 text-sm text-muted">
          Who&rsquo;s where, when each job ends, and who comes free next.
        </p>
      </div>

      {/* Coming-free summary */}
      {!loading && freeingSoon.length > 0 && (
        <Card className="p-5">
          <Eyebrow>Coming free soon</Eyebrow>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {freeingSoon.map(({ p, days }) => {
              const l = byId.get(p.labourerId);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-field p-3"
                >
                  <Avatar name={l?.name ?? "?"} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{l?.name}</p>
                    <p className="text-xs text-amber-ink">
                      Frees up {days === 0 ? "today" : relativeDays(p.endDate!, TODAY)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Active table */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <Eyebrow>On the job</Eyebrow>
          <h2 className="heading mt-0.5 text-lg">
            {loading ? "—" : `${active.length} active placement${active.length === 1 ? "" : "s"}`}
          </h2>
        </div>

        <div className="px-5">
          {loading ? (
            <Loading />
          ) : active.length === 0 ? (
            <div className="py-8">
              <EmptyState title="No active placements" hint="Accept an offer to place a labourer." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <Th>Labourer</Th>
                    <Th>{ROLE_LABELS.builder}</Th>
                    <Th>Site</Th>
                    <Th>Dates</Th>
                    <Th className="text-right">Frees up</Th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((p) => (
                    <JobRow key={p.id} placement={p} labourer={byId.get(p.labourerId)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function JobRow({
  placement,
  labourer,
}: {
  placement: Placement;
  labourer?: Labourer;
}) {
  const days = placement.endDate ? daysUntil(placement.endDate, TODAY) : null;
  const soon = days !== null && days >= 0 && days <= 7;
  return (
    <tr className="border-b border-line/70 last:border-0 hover:bg-field/60">
      <td className="py-3.5 pr-4">
        <div className="flex items-center gap-3">
          <Avatar name={labourer?.name ?? "?"} src={labourer?.photoUrl} size={34} />
          <div>
            {labourer ? (
              <Link
                href={`/roster/${labourer.id}`}
                className="font-semibold text-ink hover:underline"
              >
                {labourer.name}
              </Link>
            ) : (
              <span className="font-semibold text-ink">Unknown</span>
            )}
            <p className="text-xs text-muted">{placement.trade}</p>
          </div>
        </div>
      </td>
      <td className="py-3.5 pr-4 text-ink">{placement.builderCompany}</td>
      <td className="py-3.5 pr-4 text-muted">{placement.site}</td>
      <td className="py-3.5 pr-4 text-ink">
        {fmtDate(placement.startDate)} → {placement.endDate ? fmtDate(placement.endDate) : "ongoing"}
        <span className="ml-2 text-xs text-muted">{fmtRate(placement.hourlyRate)}</span>
      </td>
      <td className="py-3.5 text-right">
        {placement.endDate ? (
          <span className={cn("text-sm font-semibold", soon ? "text-amber-ink" : "text-muted")}>
            {days! < 0 ? "overdue" : days === 0 ? "today" : relativeDays(placement.endDate, TODAY)}
          </span>
        ) : (
          <span className="text-sm text-muted">ongoing</span>
        )}
      </td>
    </tr>
  );
}

function endRank(p: Placement) {
  return p.endDate ? daysUntil(p.endDate, TODAY) : Number.MAX_SAFE_INTEGER;
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`eyebrow pb-2.5 pr-4 font-bold ${className}`} style={{ fontSize: "10px" }}>
      {children}
    </th>
  );
}
