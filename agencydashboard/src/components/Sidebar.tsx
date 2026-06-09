"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBilling } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { cn } from "@/lib/utils";
import {
  IconBilling,
  IconJobs,
  IconOffers,
  IconOverview,
  IconRoster,
  IconSettings,
} from "./icons";

const NAV = [
  { href: "/overview", label: "Overview", Icon: IconOverview },
  { href: "/roster", label: "Roster", Icon: IconRoster },
  { href: "/offers", label: "Offers", Icon: IconOffers },
  { href: "/jobs", label: "Jobs", Icon: IconJobs },
  { href: "/billing", label: "Billing", Icon: IconBilling },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: billing } = useAsync(getBilling, []);
  const plan = billing?.plan;
  // Enterprise has effectively unlimited seats — don't render a misleading bar.
  const unlimited = !!plan && plan.seatLimit >= 100_000;
  const pct = plan && !unlimited ? Math.round((plan.seatsUsed / plan.seatLimit) * 100) : 0;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-bg">
      {/* Wordmark */}
      <div className="px-6 pb-6 pt-7">
        <Link href="/overview" className="block">
          <h1 className="heading text-2xl leading-none">
            Labourlink
            <span className="text-brand-yellow" aria-hidden>
              .
            </span>
          </h1>
          <p className="eyebrow mt-1.5">Agency portal</p>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3" aria-label="Primary">
        <ul className="flex flex-col gap-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-semibold transition-colors",
                    active
                      ? "bg-ink text-bg"
                      : "text-muted hover:bg-surface hover:text-ink",
                  )}
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Plan card pinned to bottom */}
      <div className="p-3">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Plan</p>
            <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bg">
              {plan?.tier ?? "—"}
            </span>
          </div>
          <p className="mt-2.5 text-sm font-semibold text-ink">
            {!plan
              ? "Loading…"
              : unlimited
                ? `${plan.seatsUsed} seats used`
                : `${plan.seatsUsed} of ${plan.seatLimit} seats used`}
          </p>
          {plan && !unlimited && (
            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-field"
              role="progressbar"
              aria-valuenow={plan.seatsUsed}
              aria-valuemin={0}
              aria-valuemax={plan.seatLimit}
              aria-label="Seats used"
            >
              <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
            </div>
          )}
          <Link
            href="/billing"
            className="mt-3 inline-block text-xs font-bold text-ink underline underline-offset-4 hover:opacity-70"
          >
            Upgrade plan
          </Link>
        </div>
      </div>
    </aside>
  );
}
