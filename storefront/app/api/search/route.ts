// GET /api/search?q=...&school=... → { filters, by, summary, count }
// Smart search over a campus feed: Gemma 4 parses the query (lib/smart-search.ts), count is how many feed pieces match.
// Per-IP in-memory rate limit (30 per 5 minutes) to protect the free Gemma quota; q is capped at 120 characters.
import { getCampus, getFeed } from "@/lib/data";
import { MAX_QUERY_LENGTH, applySmartFilters, smartSearch } from "@/lib/smart-search";

const WINDOW_MS = 5 * 60_000;
const LIMIT = 30;
const windows = new Map<string, { start: number; count: number }>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || request.headers.get("x-real-ip")?.trim() || "local").slice(0, 64);
}

/** Seconds until the caller may retry, or 0 when the request is allowed. */
function throttle(ip: string, now = Date.now()): number {
  if (windows.size > 10_000) for (const [k, w] of windows) if (now - w.start > WINDOW_MS) windows.delete(k);
  const w = windows.get(ip);
  if (!w || now - w.start > WINDOW_MS) {
    windows.set(ip, { start: now, count: 1 });
    return 0;
  }
  if (w.count >= LIMIT) return Math.max(1, Math.ceil((w.start + WINDOW_MS - now) / 1000));
  w.count++;
  return 0;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function GET(request: Request) {
  const retryAfter = throttle(clientIp(request));
  if (retryAfter) return json({ error: "rate_limited" }, 429, { "Retry-After": String(retryAfter) });

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  if (!q) return json({ error: "missing_q" }, 400);
  if (q.length > MAX_QUERY_LENGTH) return json({ error: "q_too_long", max: MAX_QUERY_LENGTH }, 400);

  const school = (params.get("school") ?? "ua").toLowerCase().slice(0, 32);
  try {
    const campus = (await getCampus(school)) ?? (await getCampus("ua"));
    const result = await smartSearch(q, campus?.name);
    const count = applySmartFilters(await getFeed(campus?.slug ?? "ua"), result.filters).length;
    return json({ ...result, count }, 200, { "Cache-Control": "private, max-age=60" });
  } catch {
    // smartSearch never throws; this covers the data layer. No details: errors must not echo anything server-side.
    return json({ error: "search_failed" }, 500);
  }
}
