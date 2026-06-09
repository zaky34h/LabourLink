"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertLabourer } from "@/lib/api";
import type {
  Availability,
  AvailabilityException,
  Labourer,
  LabourerStatus,
  Ticket,
  Weekday,
} from "@/lib/types";
import { STATUS_META, TRADES, WEEKDAYS, cn } from "@/lib/utils";
import { Button, Card, Eyebrow, Field, Input, Select, Textarea } from "./ui";
import { IconPlus } from "./icons";

/** Shape the form edits before it's sent through `upsertLabourer`. */
type Draft = {
  name: string;
  trade: string;
  skillsText: string;
  hourlyRate: string;
  suburb: string;
  phone: string;
  email: string;
  status: LabourerStatus;
  tickets: Ticket[];
  availability: Availability;
  notes: string;
};

const blankTicket = (i: number): Ticket => ({
  id: `new_${i}`,
  name: "",
  issuer: "",
  expires: "",
});

function toDraft(l?: Labourer): Draft {
  return {
    name: l?.name ?? "",
    trade: l?.trade ?? TRADES[0],
    skillsText: l?.skills.join(", ") ?? "",
    hourlyRate: l ? String(l.hourlyRate) : "",
    suburb: l?.suburb ?? "",
    phone: l?.phone ?? "",
    email: l?.email ?? "",
    status: l?.status ?? "bench",
    tickets: l?.tickets ?? [],
    availability: l?.availability ?? { pattern: [], exceptions: [] },
    notes: l?.notes ?? "",
  };
}

export function LabourerForm({ labourer }: { labourer?: Labourer }) {
  const router = useRouter();
  const editing = !!labourer;
  const [d, setD] = useState<Draft>(() => toDraft(labourer));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setD((prev) => ({ ...prev, [key]: value }));

  const toggleDay = (day: Weekday) =>
    setD((prev) => {
      const has = prev.availability.pattern.includes(day);
      return {
        ...prev,
        availability: {
          ...prev.availability,
          pattern: has
            ? prev.availability.pattern.filter((x) => x !== day)
            : [...prev.availability.pattern, day],
        },
      };
    });

  const addTicket = () =>
    set("tickets", [...d.tickets, blankTicket(d.tickets.length)]);
  const updateTicket = (id: string, patch: Partial<Ticket>) =>
    set(
      "tickets",
      d.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  const removeTicket = (id: string) =>
    set("tickets", d.tickets.filter((t) => t.id !== id));

  const addException = () =>
    set("availability", {
      ...d.availability,
      exceptions: [
        ...d.availability.exceptions,
        { date: "", available: false, note: "" },
      ],
    });
  const updateException = (i: number, patch: Partial<AvailabilityException>) =>
    set("availability", {
      ...d.availability,
      exceptions: d.availability.exceptions.map((e, idx) =>
        idx === i ? { ...e, ...patch } : e,
      ),
    });
  const removeException = (i: number) =>
    set("availability", {
      ...d.availability,
      exceptions: d.availability.exceptions.filter((_, idx) => idx !== i),
    });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!d.name.trim()) return setError("Name is required.");
    const rate = Number(d.hourlyRate);
    if (!rate || rate <= 0) return setError("Enter a valid hourly rate.");

    setSaving(true);
    try {
      const saved = await upsertLabourer({
        id: labourer?.id,
        name: d.name.trim(),
        trade: d.trade,
        skills: d.skillsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        hourlyRate: rate,
        suburb: d.suburb.trim(),
        phone: d.phone.trim() || undefined,
        email: d.email.trim() || undefined,
        status: d.status,
        tickets: d.tickets
          .filter((t) => t.name.trim())
          .map((t) => ({
            ...t,
            issuer: t.issuer?.trim() || undefined,
            expires: t.expires || undefined,
          })),
        availability: d.availability,
        notes: d.notes.trim() || undefined,
      });
      router.push(`/roster/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <p className="rounded-lg border border-danger-ink/30 bg-danger px-4 py-2.5 text-sm font-medium text-danger-ink">
          {error}
        </p>
      )}

      {/* Profile */}
      <Card className="p-5">
        <Eyebrow>Profile</Eyebrow>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name">
            <Input
              id="name"
              value={d.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Jacob Mensah"
              required
            />
          </Field>
          <Field label="Trade" htmlFor="trade">
            <Select id="trade" value={d.trade} onChange={(e) => set("trade", e.target.value)}>
              {TRADES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hourly rate (AUD)" htmlFor="rate">
            <Input
              id="rate"
              type="number"
              min={0}
              step={1}
              value={d.hourlyRate}
              onChange={(e) => set("hourlyRate", e.target.value)}
              placeholder="e.g. 62"
              required
            />
          </Field>
          <Field label="Suburb" htmlFor="suburb">
            <Input
              id="suburb"
              value={d.suburb}
              onChange={(e) => set("suburb", e.target.value)}
              placeholder="e.g. Footscray, VIC"
            />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input
              id="phone"
              value={d.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="0412 345 678"
            />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={d.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@example.com"
            />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Skills" hint="Comma-separated, e.g. Formwork, Framing" htmlFor="skills">
            <Input
              id="skills"
              value={d.skillsText}
              onChange={(e) => set("skillsText", e.target.value)}
              placeholder="Formwork, Framing, Fit-out"
            />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select
              id="status"
              value={d.status}
              onChange={(e) => set("status", e.target.value as LabourerStatus)}
            >
              {(Object.keys(STATUS_META) as LabourerStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {/* Availability */}
      <Card className="p-5">
        <Eyebrow>Weekly availability</Eyebrow>
        <p className="mt-1 text-sm text-muted">
          Tap the days this labourer can generally be placed.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const on = d.availability.pattern.includes(day.key);
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => toggleDay(day.key)}
                aria-pressed={on}
                className={cn(
                  "h-11 w-11 rounded-full text-sm font-bold transition-colors",
                  on
                    ? "bg-ink text-bg"
                    : "border border-line bg-field text-muted hover:border-ink",
                )}
              >
                {day.short}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Eyebrow>Exceptions</Eyebrow>
          <Button type="button" variant="ghost" size="sm" onClick={addException}>
            <IconPlus />
            Add exception
          </Button>
        </div>
        {d.availability.exceptions.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No exceptions — e.g. leave or an extra day.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {d.availability.exceptions.map((ex, i) => (
              <div
                key={i}
                className="grid grid-cols-1 items-end gap-2 rounded-lg border border-line bg-field p-3 sm:grid-cols-[auto_auto_1fr_auto]"
              >
                <Field label="Date">
                  <Input
                    type="date"
                    value={ex.date}
                    onChange={(e) => updateException(i, { date: e.target.value })}
                  />
                </Field>
                <Field label="Type">
                  <Select
                    value={ex.available ? "on" : "off"}
                    onChange={(e) =>
                      updateException(i, { available: e.target.value === "on" })
                    }
                  >
                    <option value="off">Day off</option>
                    <option value="on">Extra day</option>
                  </Select>
                </Field>
                <Field label="Note">
                  <Input
                    value={ex.note ?? ""}
                    onChange={(e) => updateException(i, { note: e.target.value })}
                    placeholder="e.g. Annual leave"
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeException(i)}
                  className="text-danger-ink"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tickets / certs */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <Eyebrow>Tickets &amp; certifications</Eyebrow>
          <Button type="button" variant="ghost" size="sm" onClick={addTicket}>
            <IconPlus />
            Add ticket
          </Button>
        </div>
        {d.tickets.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No tickets yet — add white cards, licences, height tickets etc.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {d.tickets.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-1 items-end gap-2 rounded-lg border border-line bg-field p-3 sm:grid-cols-[1.4fr_1fr_auto_auto]"
              >
                <Field label="Name">
                  <Input
                    value={t.name}
                    onChange={(e) => updateTicket(t.id, { name: e.target.value })}
                    placeholder="e.g. White Card"
                  />
                </Field>
                <Field label="Issuer">
                  <Input
                    value={t.issuer ?? ""}
                    onChange={(e) => updateTicket(t.id, { issuer: e.target.value })}
                    placeholder="e.g. WorkSafe VIC"
                  />
                </Field>
                <Field label="Expires">
                  <Input
                    type="date"
                    value={t.expires ?? ""}
                    onChange={(e) => updateTicket(t.id, { expires: e.target.value })}
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTicket(t.id)}
                  className="text-danger-ink"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Notes */}
      <Card className="p-5">
        <Field label="Internal notes" hint="Only visible to your agency.">
          <Textarea
            value={d.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Reliability, preferred sites, anything worth remembering…"
          />
        </Field>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : "Add labourer"}
        </Button>
      </div>
    </form>
  );
}
