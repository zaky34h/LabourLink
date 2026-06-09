import { NextResponse } from "next/server";
import {
  AGENCY_API_BASE,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/server/agency";

/**
 * POST /api/auth/register — create a Starter-tier agency on a 14-day trial (BFF).
 * Body: { companyName, email, password, abn?, website? } — matches the backend's
 * /agency/auth/register contract. On success the backend returns a token, which
 * we store in the httpOnly cookie (never returned to the client).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  let res: Response;
  try {
    res = await fetch(`${AGENCY_API_BASE}/agency/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: body.companyName,
        email: body.email,
        password: body.password,
        abn: body.abn || undefined,
        website: body.website || undefined,
      }),
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
      { ok: false, error: data?.error || "Could not create your account." },
      { status: res.status >= 400 ? res.status : 400 },
    );
  }

  const out = NextResponse.json({ ok: true, agency: data.agency });
  out.cookies.set(SESSION_COOKIE, data.token, SESSION_COOKIE_OPTIONS);
  return out;
}
