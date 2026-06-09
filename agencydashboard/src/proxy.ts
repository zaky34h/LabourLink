import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth gate (Next.js 16 Proxy — the renamed Middleware).
 *
 * - Unauthenticated request to any app route → redirect to /login.
 * - Authenticated request to /login or /create-account → redirect to /overview.
 *
 * This is an optimistic cookie-presence check only (not full session
 * validation) — the BFF route handlers still enforce the real token on every
 * data call. `/api/*` is excluded via the matcher so the auth handlers can run
 * before a cookie exists.
 */
const SESSION_COOKIE = "ll_agency_session";
const AUTH_PAGES = ["/login", "/create-account"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!hasSession && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/overview";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes, Next internals and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
