"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { getAgency, logout } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui";
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
  const router = useRouter();
  const { data: agency } = useAsync(getAgency, []);
  const [signingOut, setSigningOut] = useState(false);

  async function onLogout() {
    setSigningOut(true);
    await logout();
    router.push("/login");
    router.refresh();
  }

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

      {/* Account — pinned to bottom */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 px-1.5 py-1">
          <Avatar name={agency?.companyName ?? "Agency"} src={agency?.logoUrl} size={38} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-ink">
              {agency?.companyName ?? "—"}
            </p>
            <p className="truncate text-xs text-muted">{agency?.email ?? ""}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          disabled={signingOut}
          className="mt-2 w-full rounded-full border border-line px-3 py-2 text-xs font-bold text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Log out"}
        </button>
      </div>
    </aside>
  );
}
