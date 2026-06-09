import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/server/agency";

/** POST /api/auth/logout — clear the session cookie. */
export async function POST() {
  const out = NextResponse.json({ ok: true });
  out.cookies.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return out;
}
