import { NextResponse, type NextRequest } from "next/server";

// CORS + origin check for /api/*. Auth is Bearer-token based (no cookies), so the only job here
// is keeping browsers on other origins from calling the API. Server-to-server calls send no Origin.

function allowedOrigins(req: NextRequest): Set<string> {
  const list = [req.nextUrl.origin, process.env.APP_BASE_URL ?? "", ...(process.env.FRONTEND_ORIGINS ?? "").split(",")];
  return new Set(list.map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean));
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function proxy(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = origin !== null && allowedOrigins(req).has(origin);

  if (req.method === "OPTIONS") {
    return allowed ? new NextResponse(null, { status: 204, headers: corsHeaders(origin) }) : new NextResponse(null, { status: 403 });
  }

  if (origin !== null && !allowed && req.method !== "GET" && req.method !== "HEAD") {
    return NextResponse.json(
      { error: { code: "origin_not_allowed", message: "This origin may not call the Bidd API." } },
      { status: 403 },
    );
  }

  const res = NextResponse.next();
  if (allowed) {
    for (const [key, value] of Object.entries(corsHeaders(origin))) res.headers.set(key, value);
  }
  return res;
}

export const config = { matcher: "/api/:path*" };
