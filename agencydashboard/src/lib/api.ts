/**
 * Agency API client — LIVE data via the BFF.
 *
 * Every call goes to a same-origin Next.js Route Handler under `/api/*`
 * (src/app/api/*), which runs server-side, attaches the agency's bearer token
 * from the httpOnly session cookie, and forwards to the real backend. The token
 * is never readable by client JS. The backend wraps responses in an
 * `{ ok, ... }` envelope; the helpers below unwrap the relevant key.
 */
import type {
  AgencyProfile,
  Billing,
  Labourer,
  LabourerInput,
  Offer,
  Placement,
} from "./types";

/** Parse the JSON envelope, throw a clean Error on failure, return `body[key]`. */
async function unwrap<T>(res: Response, key: string): Promise<T> {
  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (!res.ok || body?.ok === false) {
    const message = typeof body?.error === "string" ? body.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body[key] as T;
}

const jsonInit = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

/** Encode a managed-labourer id (a synthetic email) for use in a path segment. */
const seg = (id: string) => encodeURIComponent(id);

/* -------------------------------------------------------------------------- */
/* Roster                                                                      */
/* -------------------------------------------------------------------------- */

export async function getRoster(): Promise<Labourer[]> {
  return unwrap(await fetch("/api/agency/labourers"), "labourers");
}

export async function getLabourer(id: string): Promise<Labourer | null> {
  const res = await fetch(`/api/agency/labourers/${seg(id)}`);
  if (res.status === 404) return null;
  return unwrap(res, "labourer");
}

export async function upsertLabourer(input: LabourerInput): Promise<Labourer> {
  const res = input.id
    ? await fetch(`/api/agency/labourers/${seg(input.id)}`, jsonInit("PUT", input))
    : await fetch("/api/agency/labourers", jsonInit("POST", input));
  return unwrap(res, "labourer");
}

export async function deleteLabourer(id: string): Promise<void> {
  const res = await fetch(`/api/agency/labourers/${seg(id)}`, { method: "DELETE" });
  await unwrap(res, "ok");
}

/* -------------------------------------------------------------------------- */
/* Offers                                                                      */
/* -------------------------------------------------------------------------- */

export async function getOffers(): Promise<Offer[]> {
  return unwrap(await fetch("/api/agency/offers"), "offers");
}

/**
 * Accept an offer AND assign a specific labourer to it (the targeted labourer
 * or any other roster member). Flips that labourer to "on_job" and creates an
 * active placement.
 */
export async function assignOffer(
  offerId: string,
  labourerId: string,
): Promise<{ offer: Offer; placement: Placement }> {
  const res = await fetch(`/api/agency/offers/${seg(offerId)}/assign`, jsonInit("POST", { labourerId }));
  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (!res.ok || body?.ok === false) {
    throw new Error(typeof body?.error === "string" ? body.error : `Request failed (${res.status})`);
  }
  return { offer: body.offer as Offer, placement: body.placement as Placement };
}

export async function declineOffer(offerId: string): Promise<Offer> {
  const res = await fetch(`/api/agency/offers/${seg(offerId)}/decline`, { method: "POST" });
  return unwrap(res, "offer");
}

/* -------------------------------------------------------------------------- */
/* Jobs / placements                                                           */
/* -------------------------------------------------------------------------- */

export async function getJobs(): Promise<Placement[]> {
  return unwrap(await fetch("/api/agency/placements"), "placements");
}

/* -------------------------------------------------------------------------- */
/* Billing                                                                     */
/* -------------------------------------------------------------------------- */

export async function getBilling(): Promise<Billing> {
  return unwrap(await fetch("/api/agency/billing"), "billing");
}

/* -------------------------------------------------------------------------- */
/* Agency profile                                                              */
/* -------------------------------------------------------------------------- */

export async function getAgency(): Promise<AgencyProfile> {
  return unwrap(await fetch("/api/agency/profile"), "agency");
}

export async function updateAgency(patch: Partial<AgencyProfile>): Promise<AgencyProfile> {
  return unwrap(await fetch("/api/agency/profile", jsonInit("PUT", patch)), "agency");
}

/* -------------------------------------------------------------------------- */
/* Auth (BFF — cookies set server-side; token never reaches client JS)         */
/* -------------------------------------------------------------------------- */

export async function login(email: string, password: string): Promise<AgencyProfile> {
  return unwrap(await fetch("/api/auth/login", jsonInit("POST", { email, password })), "agency");
}

export async function register(input: {
  companyName: string;
  email: string;
  password: string;
  abn?: string;
  website?: string;
}): Promise<AgencyProfile> {
  return unwrap(await fetch("/api/auth/register", jsonInit("POST", input)), "agency");
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
