import type { Weekday } from "@/lib/types";
import { WEEKDAYS, cn } from "@/lib/utils";

/** Compact M T W T F S S row; filled = available that weekday. */
export function AvailabilityDots({
  pattern,
  className,
}: {
  pattern: Weekday[];
  className?: string;
}) {
  if (pattern.length === 0) {
    return <span className="text-xs font-medium text-danger-ink">No availability</span>;
  }
  const set = new Set(pattern);
  return (
    <div className={cn("flex gap-1", className)} aria-label="Weekly availability">
      {WEEKDAYS.map((d, i) => {
        const on = set.has(d.key);
        return (
          <span
            key={i}
            title={d.key.toUpperCase()}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
              on ? "bg-ink text-bg" : "bg-field text-muted/60 border border-line",
            )}
          >
            {d.short}
          </span>
        );
      })}
    </div>
  );
}
