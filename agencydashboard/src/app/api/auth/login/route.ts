import { NextResponse } from "next/server";
import {
  AGENCY_API_BASE,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/server/agency";

/**
 * POST /api/auth/login — agency sign-in (BFF).
 * Forwards credentials to the backend, then stores the returned token in an
 * httpOnly cookie. The token is stripped from the response so client JS can
 * never read it. Returns a generic error on bad creds / non-agency accounts
 * (the backend already rejects those with a 401).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  let res: Response;
  try {
    res = await fetch(`${AGENCY_API_BASE}/agency/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not reach the server. Please try again." },
      { status: 502 },
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false || !data?.token) {
    return NextResponse.json(
      { ok: false, error: data?.error || "Invalid email or password." },
      { status: res.status >= 400 ? res.status : 401 },
    );
  }

  const out = NextResponse.json({ ok: true, agency: data.agency });
  out.cookies.set(SESSION_COOKIE, data.token, SESSION_COOKIE_OPTIONS);
  return out;
}
