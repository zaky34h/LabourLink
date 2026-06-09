"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { getAgency, logout } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { Avatar } from "./ui";

const TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p.startsWith("/overview"), title: "Overview" },
  { match: (p) => p === "/roster/new", title: "Add labourer" },
  { match: (p) => p.startsWith("/roster/"), title: "Labourer" },
  { match: (p) => p.startsWith("/roster"), title: "Roster" },
  { match: (p) => p.startsWith("/offers"), title: "Offers" },
  { match: (p) => p.startsWith("/jobs"), title: "Jobs" },
  { match: (p) => p.startsWith("/billing"), title: "Billing" },
  { match: (p) => p.startsWith("/settings"), title: "Settings" },
];

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: agency } = useAsync(getAgency, []);
  const [signingOut, setSigningOut] = useState(false);
  const title = TITLES.find((t) => t.match(pathname))?.title ?? "Overview";

  async function onLogout() {
    setSigningOut(true);
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-bg/85 px-8 backdrop-blur">
      <h2 className="heading text-lg">{title}</h2>
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm font-semibold text-ink">{agency?.companyName ?? "—"}</p>
          <p className="text-xs text-muted">{agency?.email ?? ""}</p>
        </div>
        <Avatar name={agency?.companyName ?? "Agency"} src={agency?.logoUrl} size={38} />
        <button
          onClick={onLogout}
          disabled={signingOut}
          className="ml-1 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Log out"}
        </button>
      </div>
    </header>
  );
}
