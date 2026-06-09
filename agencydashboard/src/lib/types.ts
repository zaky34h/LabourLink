/**
 * Labourlink Agency — domain types.
 *
 * SINGLE SOURCE OF TRUTH for the agency-facing data model. Kept in one file so
 * it can later be lifted into a shared package consumed by both this dashboard
 * and the backend. Mirrors (and extends) the mobile app's `src/types.ts`.
 */

/** Lifecycle of a labourer relative to work. Drives every status badge + colour. */
export type LabourerStatus =
  | "on_job" // currently placed on a job  → sage
  | "bench" // available but idle (lost money) → amber
  | "unavailable"; // off / not working this period → beige

/** A day in a weekly availability pattern. */
export type Weekday =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

/** A weekly recurring availability pattern + one-off exceptions. */
export type Availability = {
  /** Days the labourer is generally available to be placed. */
  pattern: Weekday[];
  /** One-off overrides, e.g. annual leave or an extra Saturday. */
  exceptions: AvailabilityException[];
};

export type AvailabilityException = {
  date: string; // ISO date (YYYY-MM-DD)
  available: boolean; // true = extra day on; false = day off
  note?: string;
};

/** A ticket / certification the agency tracks (white card, EWP, etc.). */
export type Ticket = {
  id: string;
  name: string;
  issuer?: string;
  /** ISO date; undefined = no expiry. */
  expires?: string;
};

/**
 * A labourer the agency owns and manages. There is NO separate login for the
 * labourer — the agency is the system of record for this profile.
 */
export type Labourer = {
  id: string;
  name: string;
  trade: string;
  /** Free-form skill tags, e.g. ["Formwork", "Concreting"]. */
  skills: string[];
  hourlyRate: number; // AUD/hr the agency bills
  suburb: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  status: LabourerStatus;
  tickets: Ticket[];
  availability: Availability;
  /** Id of the placement they're currently on, if status === "on_job". */
  currentPlacementId?: string;
  notes?: string;
};

/** Status of an incoming offer from a builder. */
export type OfferStatus = "pending" | "accepted" | "declined";

/**
 * An offer raised by a builder. Because labourers don't log in, offers route to
 * the AGENCY, who accepts/declines and assigns a specific labourer.
 */
export type Offer = {
  id: string;
  builderName: string;
  builderCompany: string;
  trade: string; // trade of the targeted labourer
  site: string; // site / suburb
  startDate: string; // ISO date
  endDate?: string; // ISO date; undefined = ongoing
  hourlyRate: number; // AUD/hr offered
  message?: string;
  status: OfferStatus;
  receivedAt: string; // ISO datetime
  /**
   * The SPECIFIC roster labourer the builder targeted. Offers are labourer-level,
   * not trade-level. The agency can accept for this labourer or reassign to
   * another roster member at assign time.
   */
  targetLabourerId?: string;
  targetLabourerName?: string;
  /** Set once accepted + assigned (may differ from the target if reassigned). */
  assignedLabourerId?: string;
};

/** An active or completed placement (a labourer on a builder's job). */
export type Placement = {
  id: string;
  labourerId: string;
  builderCompany: string;
  site: string;
  trade: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date; undefined = ongoing
  hourlyRate: number;
  status: "active" | "completed";
};

/** Subscription tier names — must match the backend's AGENCY_TIERS. */
export type PlanTier = "Starter" | "Crew" | "Fleet" | "Enterprise";

export type Plan = {
  tier: PlanTier;
  seatsUsed: number;
  seatLimit: number;
  /** AUD/month. `null` for custom/contact-sales tiers (Enterprise). */
  pricePerMonth: number | null;
  /** ISO date, or `null` while on trial / before first renewal. */
  renewsOn: string | null;
};

/** A tier in the plan-comparison catalogue. */
export type PlanCatalogueEntry = {
  tier: PlanTier;
  pricePerMonth: number | null;
  /** Number of roster seats; `null` = unlimited (Enterprise). */
  seatLimit: number | null;
  blurb: string;
  features: string[];
};

export type Invoice = {
  id: string;
  number: string;
  date: string; // ISO date
  amount: number; // AUD
  status: "paid" | "due" | "overdue";
};

export type Billing = {
  plan: Plan;
  invoices: Invoice[];
};

/** Public-facing + administrative details of the agency itself. */
export type AgencyProfile = {
  id: string;
  companyName: string;
  /** The public "via [Agency]" identity shown to builders. */
  publicHandle: string;
  abn?: string;
  email: string;
  phone?: string;
  suburb?: string;
  website?: string;
  logoUrl?: string;
  about?: string;
};

/** Payload for creating / updating a labourer (no server-managed fields). */
export type LabourerInput = Omit<
  Labourer,
  "id" | "currentPlacementId"
> & {
  id?: string; // present when editing
};
