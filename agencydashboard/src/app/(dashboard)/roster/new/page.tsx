"use client";

import Link from "next/link";
import { LabourerForm } from "@/components/LabourerForm";
import { Eyebrow } from "@/components/ui";
import { IconChevron } from "@/components/icons";

export default function AddLabourerPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/roster"
          className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-ink"
        >
          <IconChevron className="rotate-180" />
          Back to roster
        </Link>
        <Eyebrow className="mt-3">New profile</Eyebrow>
        <h1 className="heading mt-1 text-3xl">Add a labourer</h1>
        <p className="mt-1.5 text-sm text-muted">
          You own and manage this profile — there&rsquo;s no separate login for the labourer.
        </p>
      </div>
      <LabourerForm />
    </div>
  );
}
