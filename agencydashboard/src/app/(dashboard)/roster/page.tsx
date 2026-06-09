"use client";

import { useMemo, useState } from "react";
import { getJobs, getRoster } from "@/lib/api";
import type { LabourerStatus } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { TRADES, cn } from "@/lib/utils";
import { RosterTable } from "@/components/RosterTable";
import {
  ButtonLink,
  Card,
  EmptyState,
  Eyebrow,
  Input,
  Loading,
  Select,
} from "@/components/ui";
import { IconPlus, IconSearch } from "@/components/icons";

const STATUS_FILTERS: { key: LabourerStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "on_job", label: "On a job" },
  { key: "bench", label: "On the bench" },
  { key: "unavailable", label: "Unavailable" },
];

export default function RosterPage() {
  const roster = useAsync(getRoster, []);
  const jobs = useAsync(getJobs, []);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LabourerStatus | "all">("all");
  const [trade, setTrade] = useState("all");

  const labourers = roster.data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return labourers.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (trade !== "all" && l.trade !== trade) return false;
      if (q) {
        const hay = `${l.name} ${l.trade} ${l.suburb} ${l.skills.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [labourers, query, status, trade]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Roster</Eyebrow>
          <h1 className="heading mt-1 text-3xl">Managed labourers</h1>
          <p className="mt-1.5 text-sm text-muted">
            {roster.loading
              ? "Loading…"
              : `${labourers.length} labourers on your books`}
          </p>
        </div>
        <ButtonLink href="/roster/new">
          <IconPlus />
          Add labourer
        </ButtonLink>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <IconSearch />
          </span>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, trade, suburb or skill…"
            className="pl-9"
            aria-label="Search roster"
          />
        </div>

        <div className="flex rounded-full border border-line bg-surface p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                status === f.key ? "bg-ink text-bg" : "text-muted hover:text-ink",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Select
          value={trade}
          onChange={(e) => setTrade(e.target.value)}
          aria-label="Filter by trade"
          className="w-44"
        >
          <option value="all">All trades</option>
          {TRADES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="px-5">
          {roster.loading ? (
            <Loading />
          ) : filtered.length === 0 ? (
            <div className="py-8">
              <EmptyState
                title="No labourers match your filters"
                hint="Try clearing the search or status filter."
              />
            </div>
          ) : (
            <RosterTable labourers={filtered} placements={jobs.data ?? []} />
          )}
        </div>
      </Card>
    </div>
  );
}
