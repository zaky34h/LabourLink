/**
 * Shared UI primitives — the editorial, flat, hairline-bordered building blocks
 * used across every screen. Match the mobile app's Twoflo system.
 */
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn, initials } from "@/lib/utils";

/* --------------------------------- Eyebrow -------------------------------- */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

/* ---------------------------------- Card ---------------------------------- */
export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <As
      className={cn(
        "rounded-[var(--radius-card)] border border-line bg-surface",
        className,
      )}
    >
      {children}
    </As>
  );
}

/* --------------------------------- Button --------------------------------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const buttonSizes = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5",
} as const;

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-bg hover:bg-black",
  secondary: "border border-ink text-ink hover:bg-ink/5",
  ghost: "text-ink hover:bg-ink/5",
  danger: "border border-danger-ink/30 bg-danger text-danger-ink hover:bg-danger/70",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: keyof typeof buttonSizes }) {
  return (
    <button
      className={cn(buttonBase, buttonSizes[size], buttonVariants[variant], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
}) {
  return (
    <Link
      className={cn(buttonBase, buttonSizes[size], buttonVariants[variant], className)}
      {...props}
    />
  );
}

/* ---------------------------------- Chip ---------------------------------- */
export function Chip({
  children,
  bg = "bg-field",
  text = "text-ink",
  className,
}: {
  children: ReactNode;
  bg?: string;
  text?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        bg,
        text,
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------- Avatar --------------------------------- */
export function Avatar({
  name,
  src,
  size = 36,
}: {
  name: string;
  src?: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-field font-bold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/* --------------------------------- Field ---------------------------------- */
export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={htmlFor}>
      <span className="eyebrow">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-lg border border-line bg-field px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputBase, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(inputBase, "appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
}

/* ------------------------------- Empty state ------------------------------ */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/* --------------------------------- Spinner -------------------------------- */
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-16 text-sm text-muted" role="status">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-ink" />
      {label}
    </div>
  );
}
