"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Inter } from "next/font/google";
import { register } from "@/lib/api";
import { IconEye, IconEyeOff } from "@/components/icons";

// Scoped to the auth screens only — the rest of the app keeps its own font.
const inter = Inter({ subsets: ["latin"] });

type Status = "idle" | "loading" | "success" | "error";
type FieldErrors = { company?: string; email?: string; password?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Agency registration — "Contour" direction. Two-column layout matching the
 * sign-in screen (even 50/50 split, sticky brand panel). Posts to the BFF
 * (`/api/auth/register`), which creates a Starter-tier agency on a 14-day trial
 * and sets the httpOnly session cookie; on success we route into the dashboard.
 */
export default function CreateAccountPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [abn, setAbn] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const companyRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const busy = status === "loading" || status === "success";

  function fieldErrorFor(field: keyof FieldErrors, value: string): string | undefined {
    if (field === "company") return value.trim() ? undefined : "Enter your company name.";
    if (field === "email")
      return EMAIL_RE.test(value.trim()) ? undefined : "Enter a valid email address.";
    return value.length >= 8 ? undefined : "Use at least 8 characters.";
  }

  // Update a flagged field's value and clear its error the moment it's valid.
  function edit(field: keyof FieldErrors, setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      if (formError) setFormError(null);
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: fieldErrorFor(field, value) }));
      }
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const next: FieldErrors = {
      company: fieldErrorFor("company", companyName),
      email: fieldErrorFor("email", email),
      password: fieldErrorFor("password", password),
    };
    setErrors(next);
    if (next.company) return companyRef.current?.focus();
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();

    setStatus("loading");
    setFormError(null);
    try {
      await register({
        companyName: companyName.trim(),
        email: email.trim(),
        password,
        abn: abn.trim() || undefined,
        website: website.trim() || undefined,
      });
      setStatus("success");
      router.push("/overview");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setFormError(err instanceof Error ? err.message : "Could not create your account.");
    }
  }

  const inputBase =
    "h-[44px] w-full rounded-[10px] border bg-[#FAF6EC] text-[14.5px] text-[#100F0C] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#ADA694] focus-visible:outline-none";
  const inputIdle =
    "border-[rgba(16,15,12,0.12)] focus:border-[rgba(16,15,12,0.45)] focus:shadow-[0_0_0_3px_rgba(16,15,12,0.06)]";
  const inputInvalid = "border-[#B05A4C] shadow-[0_0_0_3px_rgba(176,90,76,0.10)]";
  const labelCls =
    "mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#8C8067]";

  return (
    <main
      className={`${inter.className} grid min-h-screen grid-cols-2 bg-[#EFE8D7] text-[#100F0C] max-[880px]:grid-cols-1`}
    >
      {/* ---- Left: contour field (sticky so it stays calm while the form scrolls) ---- */}
      <section
        aria-hidden
        className="sticky top-0 flex h-screen flex-col justify-between self-start overflow-hidden bg-[#E7DFCA] p-[clamp(36px,4vw,64px)] max-[880px]:static max-[880px]:order-first max-[880px]:h-auto max-[880px]:min-h-[300px]"
      >
        <div className="contour-grid absolute inset-0" />

        {/* Breathing concentric rings, centered at 54% */}
        <div
          className="absolute left-[54%] top-1/2 motion-safe:animate-[breathe_9s_ease-in-out_infinite]"
          style={{ transform: "translate(-50%, -50%)" }}
        >
          {Array.from({ length: 10 }).map((_, i) => {
            const s = 90 + i * 82;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 rounded-full border border-[rgba(16,15,12,0.10)]"
                style={{
                  width: s,
                  height: s,
                  marginTop: -s / 2,
                  marginLeft: -s / 2,
                  opacity: 1 - i * 0.07,
                }}
              />
            );
          })}
          <div className="absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full bg-[#F2C94C] shadow-[0_0_0_6px_rgba(242,201,76,0.18)]" />
        </div>

        {/* Wordmark (top) */}
        <div className="relative inline-flex items-baseline text-[26px] font-extrabold tracking-[-0.035em]">
          Labourlink<span className="ml-px text-[#F2C94C]">.</span>
        </div>

        {/* Heading group (middle) */}
        <div className="relative">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8C8067]">
            The operating layer for labour hire
          </span>
          <h2 className="mt-3.5 max-w-[440px] text-balance text-[clamp(30px,3.4vw,42px)] font-bold leading-[1.08] tracking-[-0.03em] max-[880px]:text-[30px]">
            One roster. Every shift. Fully booked.
          </h2>
        </div>

        {/* Supporting line (bottom) */}
        <p className="relative m-0 max-w-[380px] text-[15px] leading-[1.6] text-[#6B6457]">
          Set up your agency in minutes — add your crew, track availability and keep the
          bench billable.
        </p>
      </section>

      {/* ---- Right: signup form ---- */}
      <section className="flex items-center justify-center bg-[#F5EEDD] px-[clamp(40px,5vw,72px)] py-[clamp(20px,3vw,40px)]">
        <form onSubmit={onSubmit} noValidate className="w-full max-w-[400px]">
          <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.22em] text-[#8C8067]">
            Agency Portal
          </span>
          <h1 className="mb-1 text-[24px] font-extrabold tracking-[-0.02em]">
            Create your agency
          </h1>
          <p className="mb-5 text-[13.5px] leading-[1.5] text-[#6B6457]">
            Start free on the Starter plan — 14-day trial, no card required.
          </p>

          {/* Company name */}
          <div className="mb-3">
            <label htmlFor="company" className={labelCls}>
              Company name
            </label>
            <input
              ref={companyRef}
              id="company"
              type="text"
              autoComplete="organization"
              value={companyName}
              onChange={(e) => edit("company", setCompanyName)(e.target.value)}
              placeholder="Hardhat Labour Co."
              aria-invalid={!!errors.company}
              className={`${inputBase} px-4 ${errors.company ? inputInvalid : inputIdle}`}
            />
            {errors.company && (
              <p className="mt-1 text-[12px] text-[#B05A4C]">{errors.company}</p>
            )}
          </div>

          {/* Email */}
          <div className="mb-3">
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <input
              ref={emailRef}
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => edit("email", setEmail)(e.target.value)}
              placeholder="you@agency.com.au"
              aria-invalid={!!errors.email}
              className={`${inputBase} px-4 ${errors.email ? inputInvalid : inputIdle}`}
            />
            {errors.email && <p className="mt-1 text-[12px] text-[#B05A4C]">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="mb-3">
            <label htmlFor="password" className={labelCls}>
              Password
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => edit("password", setPassword)(e.target.value)}
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                className={`${inputBase} pl-4 pr-[54px] ${errors.password ? inputInvalid : inputIdle}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-lg text-[#7d7765] transition-colors hover:bg-[rgba(16,15,12,0.06)]"
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
            <p
              className={`mt-1 text-[12px] ${errors.password ? "text-[#B05A4C]" : "text-[#6B6457]"}`}
            >
              {errors.password ?? "At least 8 characters."}
            </p>
          </div>

          {/* ABN (optional) */}
          <div className="mb-3">
            <label htmlFor="abn" className={labelCls}>
              ABN
            </label>
            <input
              id="abn"
              type="text"
              inputMode="numeric"
              value={abn}
              onChange={(e) => setAbn(e.target.value)}
              placeholder="54 123 456 789"
              className={`${inputBase} px-4 ${inputIdle}`}
            />
            <p className="mt-1 text-[12px] text-[#6B6457]">Optional</p>
          </div>

          {/* Website (optional) */}
          <div className="mb-3">
            <label htmlFor="website" className={labelCls}>
              Website
            </label>
            <input
              id="website"
              type="text"
              autoComplete="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="hardhatlabour.com.au"
              className={`${inputBase} px-4 ${inputIdle}`}
            />
            <p className="mt-1 text-[12px] text-[#6B6457]">Optional</p>
          </div>

          {/* Backend / auth error */}
          {status === "error" && formError && (
            <p className="mb-2 text-[12.5px] font-medium text-[#B05A4C]">{formError}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className={`mt-1 flex h-[48px] w-full items-center justify-center gap-2.5 rounded-full text-[15px] font-bold text-[#F5F0E4] transition-[background-color,transform] duration-200 active:scale-[0.99] ${
              status === "success" ? "bg-[#2F7A4D]" : "bg-[#100F0C] hover:bg-[#1f1d18]"
            }`}
          >
            {status === "loading" && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(245,240,228,0.35)] border-t-[#F5F0E4] [animation-duration:700ms]" />
            )}
            {status === "loading"
              ? "Creating account…"
              : status === "success"
                ? "Account created ✓"
                : "Create account"}
          </button>

          <p className="mt-4 text-center text-[13.5px] text-[#6B6457]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="border-b-2 border-[#100F0C] pb-px font-bold text-[#100F0C]"
            >
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
