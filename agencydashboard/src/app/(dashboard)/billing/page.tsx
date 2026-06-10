"use client";

import { getBilling } from "@/lib/api";
import { planCatalogue } from "@/lib/plans";
import { useAsync } from "@/lib/useAsync";
import { cn, fmtDate, fmtMoney } from "@/lib/utils";
import { Button, Card, Eyebrow, Loading } from "@/components/ui";
import { IconCheck } from "@/components/icons";

/** "$299" for a real price, "Custom" for contact-sales (null), "Free" for 0. */
function priceLabel(price: number | null): string {
  if (price === null) return "Custom";
  if (price === 0) return "Free";
  return fmtMoney(price);
}

export default function BillingPage() {
  const billing = useAsync(getBilling, []);

  if (billing.loading || !billing.data) return <Loading />;
  const { plan, invoices } = billing.data;
  const unlimited = plan.seatLimit >= 100_000;
  const pct = unlimited ? 0 : Math.round((plan.seatsUsed / plan.seatLimit) * 100);

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="heading text-3xl">Plan &amp; usage</h1>
        </div>
      </div>

      {/* Current plan + seat meter */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Eyebrow>Current plan</Eyebrow>
            <div className="mt-1 flex items-baseline gap-2">
              <h2 className="heading text-2xl">{plan.tier}</h2>
              <span className="text-sm text-muted">
                {plan.pricePerMonth === null ? "Custom pricing" : `${priceLabel(plan.pricePerMonth)}/mo`}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {plan.renewsOn ? `Renews ${fmtDate(plan.renewsOn)}` : "Trial — no renewal date yet"}
            </p>
          </div>

          <div className="min-w-64 flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-ink">
                {unlimited
                  ? `${plan.seatsUsed} seats used`
                  : `${plan.seatsUsed} of ${plan.seatLimit} seats used`}
              </span>
              {!unlimited && (
                <span className="text-muted">{plan.seatLimit - plan.seatsUsed} free</span>
              )}
            </div>
            {unlimited ? (
              <p className="mt-2 text-xs font-medium text-muted">Unlimited seats on this plan.</p>
            ) : (
              <>
                <div
                  className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-field"
                  role="progressbar"
                  aria-valuenow={plan.seatsUsed}
                  aria-valuemin={0}
                  aria-valuemax={plan.seatLimit}
                >
                  <div
                    className={cn("h-full rounded-full", pct >= 90 ? "bg-amber-ink" : "bg-ink")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {pct >= 80 && (
                  <p className="mt-2 text-xs font-medium text-amber-ink">
                    You&rsquo;re close to your seat limit — consider upgrading.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Plan comparison */}
      <div>
        <Eyebrow>Compare plans</Eyebrow>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {planCatalogue.map((p, i) => {
            const current = p.tier === plan.tier;
            const currentRank = planCatalogue.findIndex((c) => c.tier === plan.tier);
            const isUpgrade = i > currentRank;
            const isEnterprise = p.tier === "Enterprise";
            return (
              <Card
                key={p.tier}
                className={cn("flex flex-col p-5", current && "border-2 border-ink")}
              >
                <div className="flex items-center justify-between">
                  <h3 className="heading text-lg">{p.tier}</h3>
                  {current && (
                    <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bg">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">{p.blurb}</p>
                <p className="mt-3">
                  <span className="heading text-3xl">{priceLabel(p.pricePerMonth)}</span>
                  {p.pricePerMonth !== null && <span className="text-sm text-muted"> /mo</span>}
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink">
                      <span className="mt-0.5 text-sage-ink">
                        <IconCheck />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={current ? "secondary" : "primary"}
                  className="mt-5 w-full"
                  disabled={current}
                >
                  {current
                    ? "Your plan"
                    : isEnterprise
                      ? "Contact sales"
                      : isUpgrade
                        ? "Upgrade"
                        : "Downgrade"}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Invoices */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <Eyebrow>Invoices</Eyebrow>
          <h2 className="heading mt-0.5 text-lg">Billing history</h2>
        </div>
        {invoices.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            No invoices yet — your first invoice appears after your trial converts to a paid plan.
          </p>
        ) : (
        <div className="px-5">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <Th>Invoice</Th>
                <Th>Date</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th className="text-right">Receipt</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-line/70 last:border-0">
                  <td className="py-3.5 pr-4 font-semibold text-ink">{inv.number}</td>
                  <td className="py-3.5 pr-4 text-muted">{fmtDate(inv.date)}</td>
                  <td className="py-3.5 pr-4 text-ink">{fmtMoney(inv.amount)}</td>
                  <td className="py-3.5 pr-4">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        inv.status === "paid"
                          ? "bg-sage text-sage-ink"
                          : inv.status === "due"
                            ? "bg-amber text-amber-ink"
                            : "bg-danger text-danger-ink",
                      )}
                    >
                      {inv.status[0].toUpperCase() + inv.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button className="text-xs font-bold text-ink underline-offset-4 hover:underline">
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Card>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`eyebrow pb-2.5 pr-4 font-bold ${className}`} style={{ fontSize: "10px" }}>
      {children}
    </th>
  );
}
