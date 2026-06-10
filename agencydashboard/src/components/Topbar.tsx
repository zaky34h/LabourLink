"use client";

import { usePathname } from "next/navigation";

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
  const title = TITLES.find((t) => t.match(pathname))?.title ?? "Overview";

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center border-b border-line bg-bg/85 px-8 backdrop-blur">
      <h2 className="heading text-lg">{title}</h2>
    </header>
  );
}
