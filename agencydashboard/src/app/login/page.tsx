"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/api";
import { Button, Card, Field, Input } from "@/components/ui";

/**
 * Agency login. Posts to the BFF (`/api/auth/login`), which sets the httpOnly
 * session cookie server-side; the proxy then routes us into the dashboard. The
 * backend rejects non-agency accounts and bad credentials with a generic 401.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Enter your email.");
    if (!password) return setError("Enter your password.");
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.push("/overview");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
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
          <h2 className="heading text-xl">Sign in</h2>
          <p className="mt-1 text-sm text-muted">
            Manage your roster and keep your bench billable.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            {error && (
              <p className="rounded-lg border border-danger-ink/30 bg-danger px-3 py-2 text-sm font-medium text-danger-ink">
                {error}
              </p>
            )}
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
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-muted">
          Don&rsquo;t have an account?{" "}
          <Link href="/create-account" className="font-semibold text-ink underline underline-offset-4">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
