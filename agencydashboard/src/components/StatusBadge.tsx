import type { LabourerStatus } from "@/lib/types";
import { STATUS_META, cn } from "@/lib/utils";

/** Functional status pill (sage / amber / beige) with a leading dot. */
export function StatusBadge({
  status,
  className,
}: {
  status: LabourerStatus;
  className?: string;
}) {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        m.chipBg,
        m.chipText,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} aria-hidden />
      {m.label}
    </span>
  );
}
