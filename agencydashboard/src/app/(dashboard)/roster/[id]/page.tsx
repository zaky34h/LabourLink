"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { deleteLabourer, getJobs, getLabourer } from "@/lib/api";
import type { Placement } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import {
  WEEKDAYS,
  cn,
  daysUntil,
  fmtDate,
  fmtRate,
} from "@/lib/utils";
import { AvailabilityDots } from "@/components/AvailabilityDots";
import { LabourerForm } from "@/components/LabourerForm";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Eyebrow,
  Loading,
} from "@/components/ui";
import {
  IconChevron,
  IconMail,
  IconPhone,
} from "@/components/icons";

const TODAY = new Date("2026-06-09T09:00:00+10:00");

export default function LabourerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: labourer, loading, error } = useAsync(() => getLabourer(id), [id]);
  const { data: placements } = useAsync(getJobs, []);
  const [editing, setEditing] = useState(false);

  if (loading) return <Loading />;
  if (error || !labourer)
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="p-8 text-center">
          <p className="text-sm font-semibold text-ink">Labourer not found.</p>
          <Link href="/roster" className="mt-2 inline-block text-xs font-bold underline">
            Back to roster
          </Link>
        </Card>
      </div>
    );

  const placement: Placement | undefined = labourer.currentPlacementId
    ? placements?.find((p) => p.id === labourer.currentPlacementId)
    : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/roster"
        className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-ink"
      >
        <IconChevron className="rotate-180" />
        Back to roster
      </Link>

      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={labourer.name} src={labourer.photoUrl} size={64} />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="heading text-2xl">{labourer.name}</h1>
                <StatusBadge status={labourer.status} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {labourer.trade} · {fmtRate(labourer.hourlyRate)} · {labourer.suburb}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-muted">
                {labourer.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <IconPhone />
                    {labourer.phone}
                  </span>
                )}
                {labourer.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <IconMail />
                    {labourer.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          {!editing && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit details
            </Button>
          )}
        </div>
      </Card>

      {editing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Eyebrow>Editing profile</Eyebrow>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Stop editing
            </Button>
          </div>
          <LabourerForm labourer={labourer} />
        </div>
      ) : (
        <>
          {/* Current placement */}
          {placement && (
            <Card className="p-5">
              <Eyebrow>Current placement</Eyebrow>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{placement.builderCompany}</p>
                  <p className="text-sm text-muted">{placement.site}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-ink">
                    {fmtDate(placement.startDate)} → {fmtDate(placement.endDate)}
                  </p>
                  <p className="text-muted">{fmtRate(placement.hourlyRate)}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Skills */}
          <Card className="p-5">
            <Eyebrow>Skills</Eyebrow>
            {labourer.skills.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {labourer.skills.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">No skills listed.</p>
            )}
          </Card>

          {/* Availability */}
          <Card className="p-5">
            <Eyebrow>Weekly availability</Eyebrow>
            <div className="mt-3">
              <AvailabilityDots pattern={labourer.availability.pattern} />
            </div>
            {labourer.availability.exceptions.length > 0 && (
              <div className="mt-4">
                <Eyebrow>Exceptions</Eyebrow>
                <ul className="mt-2 space-y-1.5">
                  {labourer.availability.exceptions.map((ex, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Chip
                        bg={ex.available ? "bg-sage" : "bg-beige"}
                        text={ex.available ? "text-sage-ink" : "text-beige-ink"}
                      >
                        {ex.available ? "Extra day" : "Day off"}
                      </Chip>
                      <span className="text-ink">{fmtDate(ex.date)}</span>
                      {ex.note && <span className="text-muted">— {ex.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 flex gap-1.5 text-[10px] text-muted">
              {WEEKDAYS.map((d, i) => (
                <span key={i} className="w-5 text-center">
                  {d.short}
                </span>
              ))}
            </div>
          </Card>

          {/* Tickets */}
          <Card className="p-5">
            <Eyebrow>Tickets &amp; certifications</Eyebrow>
            {labourer.tickets.length ? (
              <ul className="mt-3 divide-y divide-line/70">
                {labourer.tickets.map((t) => {
                  const days = t.expires ? daysUntil(t.expires, TODAY) : null;
                  const expiringSoon = days !== null && days <= 30;
                  const expired = days !== null && days < 0;
                  return (
                    <li key={t.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="font-medium text-ink">{t.name}</p>
                        {t.issuer && <p className="text-xs text-muted">{t.issuer}</p>}
                      </div>
                      <div className="text-right text-xs">
                        <p
                          className={cn(
                            "font-semibold",
                            expired
                              ? "text-danger-ink"
                              : expiringSoon
                                ? "text-amber-ink"
                                : "text-muted",
                          )}
                        >
                          {t.expires ? `Expires ${fmtDate(t.expires)}` : "No expiry"}
                        </p>
                        {expiringSoon && !expired && (
                          <p className="text-amber-ink">in {days} days</p>
                        )}
                        {expired && <p className="text-danger-ink">Expired</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No tickets recorded.</p>
            )}
          </Card>

          {/* Notes */}
          {labourer.notes && (
            <Card className="p-5">
              <Eyebrow>Internal notes</Eyebrow>
              <p className="mt-2 text-sm text-ink">{labourer.notes}</p>
            </Card>
          )}

          {/* Danger zone */}
          <div className="flex justify-end pt-2">
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                if (!confirm(`Remove ${labourer.name} from your roster?`)) return;
                await deleteLabourer(labourer.id);
                router.push("/roster");
                router.refresh();
              }}
            >
              Remove from roster
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
