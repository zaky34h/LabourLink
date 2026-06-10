"use client";

import { useMemo, useState } from "react";
import {
  assignOffer,
  declineOffer,
  getOffers,
  getRoster,
} from "@/lib/api";
import type { Labourer, Offer, OfferStatus } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { cn, fmtDate, fmtRate, relativeDays } from "@/lib/utils";
import { AvailabilityDots } from "@/components/AvailabilityDots";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Eyebrow,
  Loading,
} from "@/components/ui";
import { IconCheck } from "@/components/icons";

const TODAY = new Date("2026-06-09T09:00:00+10:00");

const TABS: { key: OfferStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "pending", label: "Pending" },
];

export default function OffersPage() {
  const offers = useAsync(getOffers, []);
  const roster = useAsync(getRoster, []);
  const [tab, setTab] = useState<OfferStatus | "all">("all");
  const [assigning, setAssigning] = useState<Offer | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = offers.data ?? [];
  const labourers = roster.data ?? [];

  const filtered = useMemo(
    () => (tab === "all" ? list : list.filter((o) => o.status === tab)),
    [list, tab],
  );

  const pendingCount = list.filter((o) => o.status === "pending").length;

  async function handleDecline(o: Offer) {
    setBusyId(o.id);
    await declineOffer(o.id);
    await offers.reload();
    setBusyId(null);
  }

  async function handleAssign(offer: Offer, labourerId: string) {
    setBusyId(offer.id);
    await assignOffer(offer.id, labourerId);
    setAssigning(null);
    await Promise.all([offers.reload(), roster.reload()]);
    setBusyId(null);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="heading text-3xl">Incoming offers</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-full border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              tab === t.key ? "bg-ink text-bg" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.key === "pending" && pendingCount > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold",
                  tab === t.key ? "bg-bg text-ink" : "bg-amber text-amber-ink",
                )}
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {offers.loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nothing here" hint="No offers in this tab." />
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              labourers={labourers}
              busy={busyId === o.id}
              onDecline={() => handleDecline(o)}
              onStartAssign={() => setAssigning(o)}
            />
          ))}
        </div>
      )}

      {assigning && (
        <AssignModal
          offer={assigning}
          labourers={labourers}
          busy={busyId === assigning.id}
          onClose={() => setAssigning(null)}
          onAssign={(lid) => handleAssign(assigning, lid)}
        />
      )}
    </div>
  );
}

/* -------------------------------- Offer card ------------------------------- */
function OfferCard({
  offer,
  labourers,
  busy,
  onDecline,
  onStartAssign,
}: {
  offer: Offer;
  labourers: Labourer[];
  busy: boolean;
  onDecline: () => void;
  onStartAssign: () => void;
}) {
  const assigned = offer.assignedLabourerId
    ? labourers.find((l) => l.id === offer.assignedLabourerId)
    : undefined;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="heading text-lg">{offer.targetLabourerName ?? offer.trade}</h2>
            <StatusTag status={offer.status} />
          </div>
          {offer.targetLabourerName && (
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-muted">
              Company requested this labourer · {offer.trade}
            </p>
          )}
          <p className="mt-0.5 text-sm font-medium text-ink">{offer.builderCompany}</p>
          <p className="text-sm text-muted">{offer.site}</p>
          {offer.message && (
            <p className="mt-2 max-w-xl text-sm text-ink/80">&ldquo;{offer.message}&rdquo;</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip>{fmtRate(offer.hourlyRate)}</Chip>
            <Chip>
              {fmtDate(offer.startDate)}
              {offer.endDate ? ` → ${fmtDate(offer.endDate)}` : " · ongoing"}
            </Chip>
            <Chip>Starts {relativeDays(offer.startDate, TODAY)}</Chip>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <p className="text-xs text-muted">From {offer.builderName}</p>
          {offer.status === "pending" ? (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onDecline} disabled={busy}>
                Decline
              </Button>
              <Button size="sm" onClick={onStartAssign} disabled={busy}>
                Accept &amp; assign
              </Button>
            </div>
          ) : assigned ? (
            <div className="flex items-center gap-2 rounded-full bg-sage px-3 py-1.5 text-xs font-semibold text-sage-ink">
              <IconCheck />
              Assigned to {assigned.name}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function StatusTag({ status }: { status: OfferStatus }) {
  const map = {
    pending: { bg: "bg-amber", text: "text-amber-ink", label: "Pending" },
    accepted: { bg: "bg-sage", text: "text-sage-ink", label: "Accepted" },
    declined: { bg: "bg-beige", text: "text-beige-ink", label: "Declined" },
  }[status];
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", map.bg, map.text)}>
      {map.label}
    </span>
  );
}

/* ------------------------------- Assign modal ------------------------------ */
function AssignModal({
  offer,
  labourers,
  busy,
  onClose,
  onAssign,
}: {
  offer: Offer;
  labourers: Labourer[];
  busy: boolean;
  onClose: () => void;
  onAssign: (labourerId: string) => void;
}) {
  // Default to the labourer the builder targeted; the agency can still reassign.
  const [selected, setSelected] = useState<string | null>(offer.targetLabourerId ?? null);

  // Assignable labourers: anyone not already on a job, plus the targeted labourer
  // (always shown so the agency can accept for them or reassign). The targeted
  // labourer sorts first, then trade matches.
  const candidates = labourers
    .filter((l) => l.status !== "on_job" || l.id === offer.targetLabourerId)
    .sort((a, b) => {
      const at = a.id === offer.targetLabourerId ? 0 : 1;
      const bt = b.id === offer.targetLabourerId ? 0 : 1;
      if (at !== bt) return at - bt;
      const am = a.trade === offer.trade ? 0 : 1;
      const bm = b.trade === offer.trade ? 0 : 1;
      return am - bm;
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Assign a labourer"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-[var(--radius-card)] border border-line bg-bg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-5 py-4">
          <Eyebrow>Accept offer · assign labourer</Eyebrow>
          <h2 className="heading mt-0.5 text-lg">
            {offer.trade} — {offer.builderCompany}
          </h2>
          <p className="text-sm text-muted">{offer.site}</p>
          {offer.targetLabourerName && (
            <p className="mt-1.5 text-sm text-ink">
              Company requested{" "}
              <span className="font-semibold">{offer.targetLabourerName}</span> — accept for them
              or reassign below.
            </p>
          )}
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
          {candidates.length === 0 ? (
            <EmptyState
              title="No available labourers"
              hint="Everyone is currently on a job."
            />
          ) : (
            <ul className="space-y-2">
              {candidates.map((l) => {
                const isMatch = l.trade === offer.trade;
                const isTarget = l.id === offer.targetLabourerId;
                const isSel = selected === l.id;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(l.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                        isSel
                          ? "border-ink bg-field"
                          : "border-line bg-surface hover:border-ink/40",
                      )}
                    >
                      <Avatar name={l.name} src={l.photoUrl} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-ink">{l.name}</p>
                          {isTarget && (
                            <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold text-bg">
                              Targeted
                            </span>
                          )}
                          {isMatch && !isTarget && (
                            <span className="rounded-full bg-sage px-1.5 py-0.5 text-[10px] font-bold text-sage-ink">
                              Trade match
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted">
                          {l.trade} · {fmtRate(l.hourlyRate)}
                        </p>
                        <div className="mt-1.5">
                          <AvailabilityDots pattern={l.availability.pattern} />
                        </div>
                      </div>
                      <StatusBadge status={l.status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!selected || busy}
            onClick={() => selected && onAssign(selected)}
          >
            {busy ? "Assigning…" : "Confirm & place on job"}
          </Button>
        </div>
      </div>
    </div>
  );
}
