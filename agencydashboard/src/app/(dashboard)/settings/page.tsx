"use client";

import { useEffect, useState } from "react";
import { getAgency, updateAgency } from "@/lib/api";
import type { AgencyProfile } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import {
  Avatar,
  Button,
  Card,
  Eyebrow,
  Field,
  Input,
  Loading,
  Textarea,
} from "@/components/ui";

export default function SettingsPage() {
  const { data, loading } = useAsync(getAgency, []);
  const [form, setForm] = useState<AgencyProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (loading || !form) return <Loading />;

  const set = <K extends keyof AgencyProfile>(key: K, value: AgencyProfile[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setSaved(false);
  };

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    await updateAgency(form);
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Eyebrow>Settings</Eyebrow>
        <h1 className="heading mt-1 text-3xl">Agency profile</h1>
        <p className="mt-1.5 text-sm text-muted">
          Your company details and the public identity companies see.
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-6">
        {/* Public identity */}
        <Card className="p-5">
          <Eyebrow>Public identity</Eyebrow>
          <div className="mt-4 flex items-center gap-4">
            <Avatar name={form.companyName} src={form.logoUrl} size={56} />
            <div>
              <p className="text-sm font-semibold text-ink">
                Labourers appear to companies as
              </p>
              <p className="text-sm text-muted">
                &ldquo;via <span className="font-semibold text-ink">{form.publicHandle}</span>&rdquo;
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Company name" htmlFor="company">
              <Input
                id="company"
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
              />
            </Field>
            <Field label="Public handle" hint="Shown as 'via [handle]'" htmlFor="handle">
              <Input
                id="handle"
                value={form.publicHandle}
                onChange={(e) => set("publicHandle", e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="About" htmlFor="about">
              <Textarea
                id="about"
                value={form.about ?? ""}
                onChange={(e) => set("about", e.target.value)}
                placeholder="A short description companies will see."
              />
            </Field>
          </div>
        </Card>

        {/* Company details */}
        <Card className="p-5">
          <Eyebrow>Company details</Eyebrow>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="ABN" htmlFor="abn">
              <Input id="abn" value={form.abn ?? ""} onChange={(e) => set("abn", e.target.value)} />
            </Field>
            <Field label="Suburb" htmlFor="suburb">
              <Input
                id="suburb"
                value={form.suburb ?? ""}
                onChange={(e) => set("suburb", e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input
                id="phone"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
            <Field label="Website" htmlFor="website">
              <Input
                id="website"
                value={form.website ?? ""}
                onChange={(e) => set("website", e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm font-medium text-sage-ink">Saved.</span>}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
