"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Labourer, Placement } from "@/lib/types";
import { fmtRate } from "@/lib/utils";
import { AvailabilityDots } from "./AvailabilityDots";
import { StatusBadge } from "./StatusBadge";
import { Avatar } from "./ui";
import { IconChevron } from "./icons";

/** Editorial roster table. Rows are clickable → labourer detail. */
export function RosterTable({
  labourers,
  placements,
}: {
  labourers: Labourer[];
  placements: Placement[];
}) {
  const router = useRouter();
  const placementById = new Map(placements.map((p) => [p.id, p]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <Th>Name</Th>
            <Th>Trade</Th>
            <Th>Status</Th>
            <Th>Availability</Th>
            <Th className="w-full">Current placement</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {labourers.map((l) => {
            const placement = l.currentPlacementId
              ? placementById.get(l.currentPlacementId)
              : undefined;
            return (
              <tr
                key={l.id}
                onClick={() => router.push(`/roster/${l.id}`)}
                className="group cursor-pointer border-b border-line/70 last:border-0 hover:bg-field/60"
              >
                <td className="py-3.5 pr-8">
                  <div className="flex items-center gap-3">
                    <Avatar name={l.name} src={l.photoUrl} size={36} />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{l.name}</p>
                      <p className="text-xs text-muted">
                        {l.suburb} · {fmtRate(l.hourlyRate)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 pr-8 text-ink">{l.trade}</td>
                <td className="py-3.5 pr-8">
                  <StatusBadge status={l.status} />
                </td>
                <td className="py-3.5 pr-8">
                  <AvailabilityDots pattern={l.availability.pattern} />
                </td>
                <td className="py-3.5 pr-8">
                  {placement ? (
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{placement.builderCompany}</p>
                      <p className="truncate text-xs text-muted">{placement.site}</p>
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="py-3.5 text-right">
                  <Link
                    href={`/roster/${l.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs font-bold text-ink underline-offset-4 hover:underline"
                  >
                    View
                    <IconChevron className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`eyebrow whitespace-nowrap pb-2.5 pr-8 font-bold ${className}`}
      style={{ fontSize: "10px" }}
    >
      {children}
    </th>
  );
}
