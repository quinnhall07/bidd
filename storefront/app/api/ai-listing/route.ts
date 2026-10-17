// POST /api/ai-listing: one photo in, a draft listing out, from Gemma 4 on the Gemini API.
// multipart/form-data: "photo" (JPEG/PNG/WebP, ≤ 4 MB; the client sends its shrunk JPEG) and optional "campus".
// 200 { fill: Fill, model } | 4xx/5xx { error: { code, message } }. No key → 503 ai_unavailable; the client then
// falls back to the on-device demo fill (components/sell-ai.tsx), so the sell flow never breaks.
// Unauthenticated, so: same-origin only when a browser says where it's from, a per-IP limit, a hard upstream timeout.
// The key is sent as a header (never in a URL) and is never logged or returned; upstream bodies never reach the client.
import { CATEGORIES, CONDITIONS, MOMENTS, SIZES, repairFill } from "@/components/sell-ai";

export const maxDuration = 20;

const MODEL = "gemma-4-26b-a4b-it";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_BYTES = 4 * 1024 * 1024;
/** Whole multipart body: the photo plus boundaries and the small "campus" field. */
const MAX_BODY = MAX_BYTES + 64 * 1024;
/** Smallest file worth an upstream call; no real photo is this small. */
const MIN_BYTES = 64;
const BODY_MS = 10_000;
const UPSTREAM_MS = 10_000;
const LIMIT = 20;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_IPS = 5000;

// Per-IP sliding window, in memory: per instance and best effort, which is enough to stop casual abuse of a free form.
// Entries are kept in last-hit order so that, if the table ever fills with active IPs, the least recent are dropped
// instead of resetting everyone's count at once.
const hits = new Map<string, number[]>();
/** Seconds to wait when over the limit, else 0 (and the hit is counted). */
function overLimit(ip: string, now: number): number {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.delete(ip);
  if (recent.length >= LIMIT) {
    hits.set(ip, recent);
    return Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > MAX_IPS) {
    for (const [k, ts] of hits) if (!ts.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    for (const k of hits.keys()) {
      if (hits.size <= MAX_IPS * 0.8) break;
      hits.delete(k);
    }
  }
  return 0;
}

// After Google says the quota is spent (429) or the key is refused (401/403), stop calling it for a while: every
// photo would fail anyway, and hammering a refused key only digs the hole deeper. The client falls back meanwhile.
let coolUntil = 0;
let coolCode: "ai_busy" | "ai_unavailable" = "ai_busy";

/**
 * The request body, read with a hard byte cap and a deadline, so a missing or understated Content-Length (chunked
 * upload) can't make us buffer more than MAX_BODY, and a trickled upload can't hold the function open.
 */
async function readBody(body: ReadableStream<Uint8Array> | null): Promise<Uint8Array<ArrayBuffer> | "too_large" | "too_slow"> {
  if (!body) return new Uint8Array(0);
  const reader = body.getReader();
  let late = false;
  const timer = setTimeout(() => {
    late = true;
    reader.cancel().catch(() => {});
  }, BODY_MS);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (late) return "too_slow";
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY) {
        reader.cancel().catch(() => {});
        return "too_large";
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(timer);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

/** Drops an upstream body we won't read, so the connection is freed now rather than at garbage collection. */
const discard = (res: Response) => {
  if (!res.bodyUsed) res.body?.cancel().catch(() => {});
};

// No responseMimeType: measured on this model it adds ~5s per call (6-9s vs ~1.6s), which would trip the client's 8s
// fallback. The prompt demands bare JSON and parseJson/repairFill take care of the rest. thinkingLevel "minimal" turns
// reasoning off (Gemma 4 on the Gemini API). `lean` is set if the API ever refuses thinkingConfig and plain works.
let lean = false;

const fail = (status: number, code: string, message: string, headers: Record<string, string> = {}) =>
  Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store", ...headers } });

/** The real type, from the first bytes; the browser's or client's claim is ignored. */
function sniff(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "image/png";
  if (b.length >= 12 && String.fromCharCode(...b.subarray(0, 4)) === "RIFF" && String.fromCharCode(...b.subarray(8, 12)) === "WEBP") return "image/webp";
  return null;
}

const SYSTEM =
  "You write resale listings for Bidd, a campus marketplace where college students in Greek life resell clothes: " +
  "rush outfits, bid day tees, gameday fits, formal dresses, chapter and school merch. You look at one photo and answer " +
  "with a single JSON object and nothing else: no prose, no markdown, no code fences.";

const list = (xs: readonly string[]) => xs.map((x) => JSON.stringify(x)).join(" | ");

function prompt(campus: string) {
  return [
    "Draft a listing for the clothing or accessory in this photo. Describe only what you can clearly see. If a matching top and bottom are shown together, list them as one item with category \"Sets\".",
    "Return exactly this JSON shape:",
    "{",
    '  "title": string, 3-80 characters, specific: color, school or brand if visible, garment (e.g. "Crimson script A cropped puffer"). No emojis, no all caps.',
    '  "brand": string, only if a logo or label is legible or the item is unmistakable, else "".',
    `  "category": one of ${list(CATEGORIES)},`,
    `  "size": one of ${list(SIZES)}. Read it from a visible tag; otherwise your best guess for the garment. "ONE_SIZE" for bags, hats and jewelry; numeric sizes are for dresses and bottoms.`,
    `  "condition": one of ${list(CONDITIONS.map(([id]) => id))}. "new_with_tags" only if a retail tag is visible.`,
    '  "priceCents": integer, a fair campus resale price in US cents, 100 to 100000 (4500 means $45). Students price under retail: tees $15-35, rush and bid day dresses $30-80, formal dresses $50-150, outerwear $40-120, designer pieces more.',
    `  "tags": 0 to 3 of ${list(MOMENTS)}, the occasions it fits.`,
    '  "description": string, 1-3 short sentences, under 400 characters, in the seller\'s voice: what it is, the color and fit details you can see, its condition. Don\'t invent flaws, measurements or history you can\'t see.',
    "}",
    campus ? `The seller is a student at ${campus}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Gemma's text → the first parseable JSON object in it, tolerating code fences or stray text around it. */
function parseJson(text: string): unknown {
  const t = text.replace(/```(?:json)?/gi, "").trim();
  const end = t.lastIndexOf("}");
  if (end < 0) return null;
  for (let i = t.indexOf("{"), tries = 0; i >= 0 && i < end && tries < 40; i = t.indexOf("{", i + 1), tries++) {
    try {
      const v: unknown = JSON.parse(t.slice(i, end + 1));
      if (v && typeof v === "object" && !Array.isArray(v)) return v;
    } catch {
      // not this brace; try the next
    }
  }
  return null;
}

type Gen = { candidates?: { content?: { parts?: { text?: unknown; thought?: unknown }[] } }[] };

/**
 * Google's machine-readable reason (e.g. "API_KEY_INVALID") from an error body, or "". Codes only, for logs and routing.
 * `thinking` says whether the message is about thinkingConfig; the message itself is never logged or returned.
 */
async function upstreamReason(res: Response): Promise<{ reason: string; thinking: boolean }> {
  try {
    const body = (await res.json()) as { error?: { status?: unknown; message?: unknown; details?: { reason?: unknown }[] } };
    const code = body.error?.details?.find((d) => typeof d?.reason === "string")?.reason ?? body.error?.status;
    const message = typeof body.error?.message === "string" ? body.error.message.slice(0, 4000) : "";
    return { reason: typeof code === "string" && /^[A-Z_]{1,40}$/.test(code) ? code : "", thinking: /thinking/i.test(message) };
  } catch {
    return { reason: "", thinking: false };
  }
}

function ask(key: string, mimeType: string, data: string, campus: string, signal: AbortSignal, plain: boolean) {
  const generationConfig = plain
    ? { temperature: 0.1, maxOutputTokens: 800 }
    : { temperature: 0.1, maxOutputTokens: 800, thinkingConfig: { thinkingLevel: "minimal" } };
  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ inlineData: { mimeType, data } }, { text: prompt(campus) }] }],
      generationConfig,
    }),
    signal,
    cache: "no-store",
  });
}

export async function POST(request: Request) {
  // A browser always sends Origin on a cross-site POST; only this site's own pages may spend the key.
  const origin = request.headers.get("origin");
  if (origin) {
    const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host"))?.split(",")[0]?.trim();
    let same = false;
    try {
      same = new URL(origin).host === host;
    } catch {
      // malformed Origin
    }
    if (!same) return fail(403, "forbidden_origin", "This endpoint only serves Bidd's own pages.");
  }

  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!key) return fail(503, "ai_unavailable", "AI fill isn't configured here.");

  // Vercel sets x-real-ip / x-forwarded-for itself (clients can't spoof them there). Capped so a giant header can't
  // bloat the table when running somewhere that passes them through.
  const ip = (request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local").slice(0, 64);
  const wait = overLimit(ip, Date.now());
  if (wait) return fail(429, "rate_limited", "Too many photos at once. Try again in a few minutes.", { "Retry-After": String(wait) });

  if (Date.now() < coolUntil) {
    return coolCode === "ai_busy"
      ? fail(503, "ai_busy", "AI fill is busy. Try again in a minute.")
      : fail(503, "ai_unavailable", "AI fill isn't available right now.");
  }

  // Content-Length is only a fast path: readBody enforces the cap on the bytes actually received.
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return fail(413, "too_large", "Photos must be 4 MB or less.");
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data/i.test(contentType)) return fail(400, "bad_request", "Send the photo as multipart/form-data.");

  let photo: FormDataEntryValue | null;
  let campus = "";
  let bytes: Uint8Array;
  try {
    const body = await readBody(request.body);
    if (body === "too_large") return fail(413, "too_large", "Photos must be 4 MB or less.");
    if (body === "too_slow") return fail(408, "too_slow", "The upload took too long.");
    const form = await new Response(body, { headers: { "content-type": contentType } }).formData();
    photo = form.get("photo");
    const c = form.get("campus");
    campus = typeof c === "string" ? c.replace(/[^\p{L}\p{N} .&'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40) : "";
    if (!photo || typeof photo === "string") return fail(400, "bad_request", "Add a photo.");
    if (photo.size > MAX_BYTES) return fail(413, "too_large", "Photos must be 4 MB or less.");
    bytes = new Uint8Array(await photo.arrayBuffer());
  } catch {
    return fail(400, "bad_request", "Send the photo as multipart/form-data.");
  }
  // The real type comes from the file's first bytes; the browser's claimed type and the file name are ignored.
  const mimeType = bytes.length >= MIN_BYTES ? sniff(bytes) : null;
  if (!mimeType) return fail(415, "unsupported_type", "That file isn't a JPEG, PNG or WebP.");
  const data = Buffer.from(bytes).toString("base64");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_MS);
  try {
    let res = await ask(key, mimeType, data, campus, ctrl.signal, lean);
    // A bad key comes back as 400 API_KEY_INVALID, not 401: read Google's reason code (only the code, never the
    // message, and it never leaves the server) so a bad key isn't retried and reads as unavailable.
    let why = res.status === 400 ? await upstreamReason(res) : { reason: "", thinking: false };
    // If the thinking switch is ever refused, retry once without it. Only for that error: a 400 about the image itself
    // would fail again, and retrying every junk upload would double what each one costs.
    if (res.status === 400 && !lean && why.thinking && !why.reason.startsWith("API_KEY")) {
      res = await ask(key, mimeType, data, campus, ctrl.signal, true);
      if (res.ok) lean = true;
      else why = res.status === 400 ? await upstreamReason(res) : { reason: "", thinking: false };
    }
    if (!res.ok) {
      discard(res);
      const { reason } = why;
      console.warn(`[ai-listing] upstream status ${res.status}${reason ? ` ${reason}` : ""}`);
      if (res.status === 401 || res.status === 403 || reason.startsWith("API_KEY")) {
        coolUntil = Date.now() + 5 * 60_000;
        coolCode = "ai_unavailable";
        return fail(503, "ai_unavailable", "AI fill isn't available right now.");
      }
      if (res.status === 429) {
        coolUntil = Date.now() + 30_000;
        coolCode = "ai_busy";
        return fail(503, "ai_busy", "AI fill is busy. Try again in a minute.");
      }
      return fail(502, "ai_failed", "AI couldn't read that photo.");
    }
    const gen = (await res.json()) as Gen;
    const text = (gen.candidates?.[0]?.content?.parts ?? [])
      .filter((p) => !p.thought && typeof p.text === "string")
      .map((p) => p.text as string)
      .join("");
    const fill = repairFill(parseJson(text));
    if (!fill) {
      console.warn("[ai-listing] unusable model output");
      return fail(502, "ai_failed", "AI couldn't read that photo.");
    }
    return Response.json({ fill, model: MODEL }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const timedOut = ctrl.signal.aborted;
    console.warn(`[ai-listing] ${timedOut ? "upstream timeout" : `request failed: ${e instanceof Error ? e.name : "error"}`}`);
    return timedOut ? fail(504, "ai_timeout", "AI took too long.") : fail(502, "ai_failed", "AI couldn't read that photo.");
  } finally {
    clearTimeout(timer);
  }
}
