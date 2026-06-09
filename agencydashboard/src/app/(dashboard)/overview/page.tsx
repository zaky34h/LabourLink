"use client";

import Link from "next/link";
import { getAgency, getJobs, getOffers, getRoster } from "@/lib/api";
import type { Labourer, Offer, Placement } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import {
  cn,
  expiringTickets,
  finishingSoon,
  noAvailability,
  pendingOffers,
  relativeDays,
} from "@/lib/utils";
import { RosterTable } from "@/components/RosterTable";
import { Avatar, ButtonLink, Card, Eyebrow, Loading } from "@/components/ui";
import {
  IconAlert,
  IconArrowRight,
  IconClock,
  IconOffers,
  IconPlus,
} from "@/components/icons";

const TODAY = new Date("2026-06-09T09:00:00+10:00");

export default function OverviewPage() {
  const roster = useAsync(getRoster, []);
  const offers = useAsync(getOffers, []);
  const jobs = useAsync(getJobs, []);
  const agency = useAsync(getAgency, []);
  const firstName = agency.data?.companyName?.split(" ")[0] ?? "there";

  const labourers = roster.data ?? [];
  const placements = jobs.data ?? [];
  const allOffers = offers.data ?? [];

  const onJob = labourers.filter((l) => l.status === "on_job");
  const bench = labourers.filter((l) => l.status === "bench");
  const unavailable = labourers.filter((l) => l.status === "unavailable");

  const greeting = greetingFor(TODAY);
  const dateLabel = TODAY.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Greeting + primary action */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{dateLabel}</Eyebrow>
          <h1 className="heading mt-1 text-3xl">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Here&rsquo;s how your roster is tracking today.
          </p>
        </div>
        <ButtonLink href="/roster/new">
          <IconPlus />
          Add labourer
        </ButtonLink>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="On a job"
          value={onJob.length}
          dot="bg-sage-ink"
          loading={roster.loading}
        />
        <Kpi
          label="On the bench"
          value={bench.length}
          dot="bg-amber-ink"
          loading={roster.loading}
          hero
          tag="needs work"
          caption="Idle labourers are lost money"
        />
        <Kpi
          label="Unavailable"
          value={unavailable.length}
          dot="bg-beige-ink"
          loading={roster.loading}
        />
        <Kpi
          label="Total on roster"
          value={labourers.length}
          dot="bg-ink"
          loading={roster.loading}
        />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr]">
        {/* Roster table */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <Eyebrow>Roster</Eyebrow>
              <h2 className="heading mt-0.5 text-lg">Your labourers</h2>
            </div>
            <Link
              href="/roster"
              className="inline-flex items-center gap-1 text-xs font-bold text-ink underline-offset-4 hover:underline"
            >
              View all
              <IconArrowRight />
            </Link>
          </div>
          <div className="px-5">
            {roster.loading ? (
              <Loading />
            ) : (
              <RosterTable labourers={labourers.slice(0, 6)} placements={placements} />
            )}
          </div>
        </Card>

        {/* Needs your attention */}
        <AttentionPanel
          labourers={labourers}
          placements={placements}
          offers={allOffers}
          loading={roster.loading || offers.loading || jobs.loading}
        />
      </div>
    </div>
  );
}

/* --------------------------------- KPI card -------------------------------- */
function Kpi({
  label,
  value,
  dot,
  hero,
  tag,
  caption,
  loading,
}: {
  label: string;
  value: number;
  dot: string;
  hero?: boolean;
  tag?: string;
  caption?: string;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] p-5",
        hero
          ? "border-2 border-amber-ink/40 bg-amber/35"
          : "border border-line bg-surface",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
          <span className="eyebrow">{label}</span>
        </div>
        {tag && (
          <span className="rounded-full bg-amber-ink px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber">
            {tag}
          </span>
        )}
      </div>
      <p className="heading mt-3 text-4xl tabular-nums">{loading ? "—" : value}</p>
      {caption && <p className="mt-1 text-xs font-medium text-amber-ink">{caption}</p>}
    </div>
  );
}

/* ----------------------------- Attention panel ----------------------------- */
function AttentionPanel({
  labourers,
  placements,
  offers,
  loading,
}: {
  labourers: Labourer[];
  placements: Placement[];
  offers: Offer[];
  loading: boolean;
}) {
  const pending = pendingOffers(offers);
  const finishing = finishingSoon(labourers, placements, 7, TODAY);
  const expiring = expiringTickets(labourers, 30, TODAY);
  const noAvail = noAvailability(labourers);

  const total = pending.length + finishing.length + expiring.length + noAvail.length;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <Eyebrow>Needs your attention</Eyebrow>
          <h2 className="heading mt-0.5 text-lg">Action items</h2>
        </div>
        {!loading && total > 0 && (
          <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-bg">
            {total}
          </span>
        )}
      </div>

      {loading ? (
        <Loading />
      ) : total === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">
          All clear — nothing needs your attention.
        </p>
      ) : (
        <div className="divide-y divide-line/70">
          {/* Pending offers */}
          {pending.length > 0 && (
            <AttentionGroup
              icon={<IconOffers />}
              title={`${pending.length} offer${pending.length > 1 ? "s" : ""} awaiting response`}
              href="/offers"
            >
              {pending.slice(0, 3).map((o) => (
                <AttentionRow
                  key={o.id}
                  primary={`${o.trade} · ${o.builderCompany}`}
                  secondary={o.site}
                />
              ))}
            </AttentionGroup>
          )}

          {/* Finishing this week */}
          {finishing.length > 0 && (
            <AttentionGroup
              icon={<IconClock />}
              title={`${finishing.length} finishing job${finishing.length > 1 ? "s" : ""} this week`}
              href="/jobs"
            >
              {finishing.slice(0, 3).map(({ labourer, placement, days }) => (
                <AttentionRow
                  key={labourer.id}
                  primary={labourer.name}
                  secondary={`Frees up ${days === 0 ? "today" : relativeDays(placement.endDate!, TODAY)}`}
                />
              ))}
            </AttentionGroup>
          )}

          {/* Expiring tickets */}
          {expiring.length > 0 && (
            <AttentionGroup
              icon={<IconAlert />}
              title={`${expiring.length} ticket${expiring.length > 1 ? "s" : ""} expiring soon`}
              href="/roster"
            >
              {expiring.slice(0, 3).map(({ labourer, ticket, days }) => (
                <AttentionRow
                  key={ticket.id}
                  primary={`${labourer.name} — ${ticket.name}`}
                  secondary={days < 0 ? "Expired" : `Expires in ${days} day${days === 1 ? "" : "s"}`}
                  danger={days <= 7}
                />
              ))}
            </AttentionGroup>
          )}

          {/* No availability */}
          {noAvail.length > 0 && (
            <AttentionGroup
              icon={<IconAlert />}
              title={`${noAvail.length} can't be placed`}
              href="/roster"
            >
              {noAvail.slice(0, 3).map((l) => (
                <AttentionRow
                  key={l.id}
                  primary={l.name}
                  secondary="No availability set"
                  danger
                />
              ))}
            </AttentionGroup>
          )}
        </div>
      )}
    </Card>
  );
}

function AttentionGroup({
  icon,
  title,
  href,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4">
      <Link
        href={href}
        className="flex items-center justify-between gap-2 text-sm font-bold text-ink hover:opacity-70"
      >
        <span className="flex items-center gap-2">
          <span className="text-muted">{icon}</span>
          {title}
        </span>
        <IconArrowRight />
      </Link>
      <ul className="mt-2 space-y-1.5 pl-6">{children}</ul>
    </div>
  );
}

function AttentionRow({
  primary,
  secondary,
  danger,
}: {
  primary: string;
  secondary: string;
  danger?: boolean;
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-xs">
      <span className="truncate text-ink">{primary}</span>
      <span className={cn("shrink-0 font-medium", danger ? "text-danger-ink" : "text-muted")}>
        {secondary}
      </span>
    </li>
  );
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
