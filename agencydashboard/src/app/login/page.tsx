"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Inter } from "next/font/google";
import { login } from "@/lib/api";
import { IconEye, IconEyeOff } from "@/components/icons";

// Scoped to the login screen only — the rest of the app keeps its own font.
const inter = Inter({ subsets: ["latin"] });

type Status = "idle" | "loading" | "success" | "error";

/**
 * Agency sign in — "Contour" direction. Two-column layout: a calm contour-ring
 * brand panel on the left, the form on the right. Posts to the BFF
 * (`/api/auth/login`), which sets the httpOnly session cookie server-side; on
 * success we route into the dashboard.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const busy = status === "loading" || status === "success";

  function edited<T>(setter: (v: T) => void) {
    return (v: T) => {
      if (status === "error") {
        setStatus("idle");
        setErrorMessage(null);
      }
      setter(v);
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!email.trim()) {
      setStatus("error");
      return setErrorMessage("Enter your email.");
    }
    if (!password) {
      setStatus("error");
      return setErrorMessage("Enter your password.");
    }
    setStatus("loading");
    setErrorMessage(null);
    try {
      await login(email.trim(), password);
      setStatus("success");
      router.push("/overview");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "That email or password doesn’t match.",
      );
    }
  }

  return (
    <main
      className={`${inter.className} grid min-h-screen grid-cols-2 bg-[#EFE8D7] text-[#100F0C] max-[880px]:grid-cols-1`}
    >
      {/* ---- Left: contour field ---- */}
      <section
        aria-hidden
        className="relative flex flex-col justify-between overflow-hidden bg-[#E7DFCA] p-[clamp(36px,4vw,64px)] max-[880px]:order-first max-[880px]:min-h-[320px]"
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
          Track availability, fill placements and watch your bench utilisation in one calm
          view.
        </p>
      </section>

      {/* ---- Right: sign-in form ---- */}
      <section className="flex items-center justify-center bg-[#F5EEDD] p-[clamp(40px,5vw,72px)]">
        <form onSubmit={onSubmit} noValidate className="w-full max-w-[400px]">
          <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.22em] text-[#8C8067]">
            Agency Portal
          </span>
          <h1 className="mb-1 text-[24px] font-extrabold tracking-[-0.02em]">Sign in</h1>
          <p className="mb-5 text-[13.5px] leading-[1.5] text-[#6B6457]">
            Manage your roster and keep your bench billable.
          </p>

          {/* Email */}
          <div className="mb-3">
            <label
              htmlFor="email"
              className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#8C8067]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => edited(setEmail)(e.target.value)}
              placeholder="zak@example.com"
              className="h-[44px] w-full rounded-[10px] border border-[rgba(40,60,120,0.06)] bg-[#E7EBF7] px-4 text-[14.5px] text-[#100F0C] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#9a93a8] focus:border-[rgba(16,15,12,0.45)] focus:shadow-[0_0_0_3px_rgba(16,15,12,0.06)] focus-visible:outline-none"
            />
          </div>

          {/* Password */}
          <div className="mb-3">
            <label
              htmlFor="password"
              className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#8C8067]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => edited(setPassword)(e.target.value)}
                placeholder="••••••••"
                className="h-[44px] w-full rounded-[10px] border border-[rgba(40,60,120,0.06)] bg-[#E7EBF7] pl-4 pr-[54px] text-[14.5px] text-[#100F0C] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#9a93a8] focus:border-[rgba(16,15,12,0.45)] focus:shadow-[0_0_0_3px_rgba(16,15,12,0.06)] focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1 grid h-9 w-9 place-items-center rounded-lg text-[#7d7765] transition-colors hover:bg-[rgba(16,15,12,0.05)]"
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>

          {/* Remember / Forgot */}
          <div className="-mt-0.5 flex items-center justify-between">
            <label className="flex cursor-pointer select-none items-center gap-[9px] text-[13px] text-[#5a5446]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-[15px] w-[15px] accent-[#100F0C]"
              />
              Remember me
            </label>
            {/* Forgot-password flow not built yet — placeholder, no route. */}
            <button
              type="button"
              className="border-b border-[rgba(107,100,87,0.35)] pb-px text-[13px] text-[#5a5446]"
            >
              Forgot?
            </button>
          </div>

          {/* Auth error */}
          {status === "error" && errorMessage && (
            <p className="mt-4 text-[12.5px] font-medium text-[#B05A4C]">{errorMessage}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className={`mt-5 flex h-[48px] w-full items-center justify-center gap-2.5 rounded-full text-[15px] font-bold text-[#F5F0E4] transition-[background-color,transform] duration-200 active:scale-[0.99] ${
              status === "success"
                ? "bg-[#2F7A4D]"
                : "bg-[#100F0C] hover:bg-[#1f1d18]"
            }`}
          >
            {status === "loading" && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(245,240,228,0.35)] border-t-[#F5F0E4] [animation-duration:700ms]" />
            )}
            {status === "loading"
              ? "Signing in…"
              : status === "success"
                ? "Signed in ✓"
                : "Sign in"}
          </button>

          <p className="mt-4 text-center text-[13.5px] text-[#6B6457]">
            Don’t have an account?{" "}
            <Link
              href="/create-account"
              className="border-b-2 border-[#100F0C] pb-px font-bold text-[#100F0C]"
            >
              Create one
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
