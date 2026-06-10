"use client";

import Link from "next/link";
import { LabourerForm } from "@/components/LabourerForm";
import { IconChevron } from "@/components/icons";

export default function AddLabourerPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/roster"
          className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-ink"
        >
          <IconChevron className="rotate-180" />
          Back to roster
        </Link>
        <h1 className="heading mt-3 text-3xl">Add a labourer</h1>
      </div>
      <LabourerForm />
    </div>
  );
}
