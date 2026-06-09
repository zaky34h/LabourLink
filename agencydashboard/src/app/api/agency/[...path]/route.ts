import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AGENCY_API_BASE, getSessionToken } from "@/lib/server/agency";

/**
 * Catch-all BFF proxy for every authenticated agency API call.
 *
 * The browser calls same-origin `/api/agency/*`; this handler reads the bearer
 * token from the httpOnly cookie (server-side) and forwards the request to the
 * real backend with an `Authorization: Bearer` header. The token never touches
 * client JS. The original (already URL-encoded) path is forwarded verbatim so
 * synthetic managed-labourer ids survive intact.
 */
async function handle(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/agency/, "");
  const target = `${AGENCY_API_BASE}/agency${subPath}${url.search}`;

  const method = request.method;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(method !== "GET" && method !== "HEAD" && method !== "DELETE"
        ? { "Content-Type": "application/json" }
        : {}),
    },
  };
  if (method !== "GET" && method !== "HEAD") {
    const text = await request.text();
    if (text) init.body = text;
  }

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not reach the server." },
      { status: 502 },
    );
  }

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
