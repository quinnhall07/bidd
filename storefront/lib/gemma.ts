// Gemma 4 on the Gemini API (Google AI Studio free tier). Server-only, shared by smart search and,
// later, the listing auto-fill route. One model only: gemma-4-26b-a4b-it (free; no paid fallback).
// The key comes from GOOGLE_GENERATIVE_AI_API_KEY and only ever travels in the x-goog-api-key header.
// It is never put in a URL, a log line, an error, or a response, and nothing here is NEXT_PUBLIC.
// Every failure comes back as a short error code so callers can fall back without try/catch.
import "server-only";

export const GEMMA_MODEL = "gemma-4-26b-a4b-it";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent`;

export type GemmaPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export type GemmaRequest = {
  parts: GemmaPart[];
  /** System instruction (Gemma 4 on the Gemini API supports systemInstruction). */
  system?: string;
  /** Ask for application/json and parse it (code fences and stray prose are stripped). */
  json?: boolean;
  /** Aborts the request, including reading the body. Default 8000ms. */
  timeoutMs?: number;
  temperature?: number;
  maxOutputTokens?: number;
  /** "minimal" turns thinking off (fast, cheap); "high" turns it on. Default "minimal". */
  thinking?: "minimal" | "high";
  /** Optional caller signal, e.g. the incoming request's. */
  signal?: AbortSignal;
};

export type GemmaError =
  | "no_key"
  | "cooldown"
  | "timeout"
  | "rate_limited"
  | "auth"
  | "http_error"
  | "network"
  | "blocked"
  | "empty"
  | "bad_json";

export type GemmaResult<T = unknown> =
  | { ok: true; text: string; data: T | null; ms: number }
  | { ok: false; error: GemmaError; status?: number; ms: number };

type GenerateContentResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
};

// After a 429 (free-tier quota) or an auth failure, skip calls for a while instead of hammering the API.
let cooldownUntil = 0;

const apiKey = () => process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || null;

/** True when a key is configured and we are not cooling down after a 429 or auth failure. */
export function gemmaAvailable(): boolean {
  return apiKey() !== null && Date.now() >= cooldownUntil;
}

export async function callGemma<T = unknown>(req: GemmaRequest): Promise<GemmaResult<T>> {
  const started = Date.now();
  const elapsed = () => Date.now() - started;
  const key = apiKey();
  if (!key) return { ok: false, error: "no_key", ms: 0 };
  if (Date.now() < cooldownUntil) return { ok: false, error: "cooldown", ms: 0 };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 8000);
  const onCallerAbort = () => controller.abort();
  if (req.signal?.aborted) controller.abort();
  else req.signal?.addEventListener("abort", onCallerAbort, { once: true });

  const body = {
    ...(req.system ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
    contents: [{ role: "user", parts: req.parts }],
    generationConfig: {
      temperature: req.temperature ?? 0.2,
      maxOutputTokens: req.maxOutputTokens ?? 512,
      thinkingConfig: { thinkingLevel: req.thinking ?? "minimal" },
      ...(req.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const errorBody: unknown = await res.json().catch(() => null);
      if (controller.signal.aborted) return { ok: false, error: "timeout", ms: elapsed() };
      if (res.status === 429) {
        cooldownUntil = Date.now() + retryDelayMs(errorBody);
        return { ok: false, error: "rate_limited", status: 429, ms: elapsed() };
      }
      // A bad or revoked key comes back as 400 API_KEY_INVALID on this API, not only 401/403.
      if (res.status === 401 || res.status === 403 || (res.status === 400 && isKeyError(errorBody))) {
        cooldownUntil = Date.now() + 5 * 60_000;
        return { ok: false, error: "auth", status: res.status, ms: elapsed() };
      }
      return { ok: false, error: "http_error", status: res.status, ms: elapsed() };
    }

    const payload = (await res.json().catch(() => null)) as GenerateContentResponse | null;
    if (controller.signal.aborted) return { ok: false, error: "timeout", ms: elapsed() };
    if (!payload) return { ok: false, error: "http_error", status: res.status, ms: elapsed() };
    const candidate = payload.candidates?.[0];
    if (!candidate) return { ok: false, error: payload.promptFeedback?.blockReason ? "blocked" : "empty", ms: elapsed() };

    // Gemma 4 returns a (possibly empty) thought part before the answer; keep only answer text.
    const text = (candidate.content?.parts ?? [])
      .filter((p) => !p.thought && typeof p.text === "string")
      .map((p) => p.text)
      .join("")
      .trim();
    if (!text) return { ok: false, error: candidate.finishReason === "SAFETY" ? "blocked" : "empty", ms: elapsed() };
    if (!req.json) return { ok: true, text, data: null, ms: elapsed() };

    const data = parseJsonLoose(text);
    if (data === undefined) return { ok: false, error: "bad_json", ms: elapsed() };
    return { ok: true, text, data: data as T, ms: elapsed() };
  } catch {
    // Deliberately no error details: fetch errors can echo request options.
    return { ok: false, error: controller.signal.aborted ? "timeout" : "network", ms: elapsed() };
  } finally {
    clearTimeout(timer);
    req.signal?.removeEventListener("abort", onCallerAbort);
  }
}

/** Parses model JSON defensively: strips ``` fences and any prose around the first {...} or [...]. undefined when unparseable. */
export function parseJsonLoose(text: string): unknown {
  const stripped = text
    .trim()
    .replace(/^```[a-zA-Z]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
  const attempt = (s: string) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      return undefined;
    }
  };
  const direct = attempt(stripped);
  if (direct !== undefined) return direct;
  const start = stripped.search(/[[{]/);
  const end = Math.max(stripped.lastIndexOf("}"), stripped.lastIndexOf("]"));
  return start >= 0 && end > start ? attempt(stripped.slice(start, end + 1)) : undefined;
}

/** True for the Gemini API's invalid/expired key error (read only to pick a cooldown; never logged). */
function isKeyError(errorBody: unknown): boolean {
  const error = (errorBody as { error?: { message?: unknown; details?: { reason?: unknown }[] } } | null)?.error;
  if (!error) return false;
  return (error.details ?? []).some((d) => d?.reason === "API_KEY_INVALID") || /api key/i.test(String(error.message ?? ""));
}

/** Reads the Gemini error's RetryInfo ("17s") if present; clamps to 5s..60s, default 30s. */
function retryDelayMs(errorBody: unknown): number {
  const details = (errorBody as { error?: { details?: { retryDelay?: string }[] } } | null)?.error?.details ?? [];
  const delay = details.map((d) => d?.retryDelay).find((d): d is string => typeof d === "string");
  const seconds = delay ? Number.parseFloat(delay) : NaN;
  return Math.min(60, Math.max(5, Number.isFinite(seconds) ? seconds : 30)) * 1000;
}
