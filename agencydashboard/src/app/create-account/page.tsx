"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { register } from "@/lib/api";
import { Button, Card, Field, Input } from "@/components/ui";

/**
 * Agency registration. Posts to the BFF (`/api/auth/register`), which creates a
 * Starter-tier agency on a 14-day trial and sets the httpOnly session cookie.
 * Body matches the backend contract: company name, email, password, and the
 * optional ABN + website.
 */
export default function CreateAccountPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [abn, setAbn] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!companyName.trim()) return setError("Enter your company name.");
    if (!email.trim()) return setError("Enter your email.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    try {
      await register({
        companyName: companyName.trim(),
        email: email.trim(),
        password,
        abn: abn.trim() || undefined,
        website: website.trim() || undefined,
      });
      router.push("/overview");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-8 text-center">
          <h1 className="heading text-3xl leading-none">
            Labourlink
            <span className="text-brand-yellow" aria-hidden>
              .
            </span>
          </h1>
          <p className="eyebrow mt-2">Agency portal</p>
        </div>

        <Card className="p-6">
          <h2 className="heading text-xl">Create your agency</h2>
          <p className="mt-1 text-sm text-muted">
            Start free on the Starter plan — 14-day trial, no card required.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            {error && (
              <p className="rounded-lg border border-danger-ink/30 bg-danger px-3 py-2 text-sm font-medium text-danger-ink">
                {error}
              </p>
            )}
            <Field label="Company name" htmlFor="company">
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Hardhat Labour Co."
                autoComplete="organization"
              />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@agency.com.au"
                autoComplete="email"
              />
            </Field>
            <Field label="Password" hint="At least 8 characters." htmlFor="password">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
            <Field label="ABN" hint="Optional" htmlFor="abn">
              <Input
                id="abn"
                value={abn}
                onChange={(e) => setAbn(e.target.value)}
                placeholder="54 123 456 789"
              />
            </Field>
            <Field label="Website" hint="Optional" htmlFor="website">
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="hardhatlabour.com.au"
              />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
