/**
 * Server-only helpers for the agency BFF (backend-for-frontend).
 *
 * These run exclusively inside Route Handlers (src/app/api/*). They hold the
 * SERVER-SIDE backend base URL and the session-cookie contract. The session
 * token lives in an httpOnly cookie and is read here on the server — it is NEVER
 * exposed to client JS. This is the web equivalent of the mobile app's
 * SecureStore-backed session.
 */
import { cookies } from "next/headers";

/** httpOnly cookie holding the opaque backend bearer token. Not readable by JS. */
export const SESSION_COOKIE = "ll_agency_session";

/**
 * Backend base URL — server-side only (no NEXT_PUBLIC_ prefix, so it never ships
 * to the browser). Defaults to the local backend for development/smoke tests.
 */
export const AGENCY_API_BASE = process.env.AGENCY_API_BASE ?? "http://localhost:4000";

/** Cookie options: httpOnly + Secure (prod) + SameSite=Lax. 30-day TTL to match the backend session. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  // Secure cookies aren't stored by browsers over plain http (local dev/smoke),
  // so only require Secure in production.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

/** Read the agency session token from the httpOnly cookie (server-side only). */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}
