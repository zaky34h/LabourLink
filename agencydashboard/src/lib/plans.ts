/**
 * Plan catalogue for the billing comparison table.
 *
 * SOURCE OF TRUTH is the backend's `AGENCY_TIERS` (backend/server.js):
 *   Starter → 5 seats, $0 (14-day trial tier)
 *   Crew    → 20 seats, $299/mo
 *   Fleet   → 50 seats, $599/mo
 *   Enterprise → unlimited seats, custom pricing (contact sales)
 * Keep seat limits + prices in sync with that map.
 */
import type { PlanCatalogueEntry } from "./types";

export const planCatalogue: PlanCatalogueEntry[] = [
  {
    tier: "Starter",
    pricePerMonth: 0,
    seatLimit: 5,
    blurb: "Get started free — your 14-day trial tier.",
    features: ["Up to 5 seats", "Roster + availability", "Incoming offers", "Email support"],
  },
  {
    tier: "Crew",
    pricePerMonth: 299,
    seatLimit: 20,
    blurb: "For agencies keeping a bench billable.",
    features: [
      "Up to 20 seats",
      "Everything in Starter",
      "Jobs board + placement tracking",
      "Ticket / cert expiry alerts",
      "Priority support",
    ],
  },
  {
    tier: "Fleet",
    pricePerMonth: 599,
    seatLimit: 50,
    blurb: "For multi-site labour-hire operations.",
    features: [
      "Up to 50 seats",
      "Everything in Crew",
      "Multiple branches",
      "Advanced reporting",
      "Dedicated account manager",
    ],
  },
  {
    tier: "Enterprise",
    pricePerMonth: null,
    seatLimit: null,
    blurb: "Unlimited seats and custom terms for large operators.",
    features: [
      "Unlimited seats",
      "Everything in Fleet",
      "SSO + custom integrations",
      "Custom SLA",
      "Contact sales for pricing",
    ],
  },
];
