// Checkout + handoff plumbing shared by the item page's sheet and /orders/[id]: Exchange Spots,
// the live API (only when NEXT_PUBLIC_BIDD_API_URL is set) and the mock order fallback.
// Uses lib/api.ts for the session and fetch (never edits it); every live call is optional.
import { ApiError, apiFetch, isLive } from "@/lib/api";

export const PAYMENT_NOTICE = "Payments aren't available yet. Pay the seller in person at the meetup.";

/** Handoff codes live 15 minutes (BACKEND_BRIEF 5.4). */
export const HANDOFF_TTL_MS = 15 * 60 * 1000;

/** Cup points for one completed QR handoff (BACKEND_BRIEF 5.5). */
export const HANDOFF_POINTS = 10;

export type Spot = { id: string; name: string; note: string };

const SPOTS: Record<string, Spot[]> = {
  ua: [
    { id: "ferguson", name: "Ferguson Center", note: "Indoors, open late" },
    { id: "gorgas", name: "Gorgas Library steps", note: "On the Quad, busy and well lit" },
    { id: "bryant-denny", name: "Bryant-Denny Gate 1", note: "The gameday favorite" },
  ],
};

export function exchangeSpots(slug: string | null | undefined, campusName?: string | null): Spot[] {
  if (slug && SPOTS[slug]) return SPOTS[slug];
  const prefix = campusName ? `${campusName} ` : "";
  return [
    { id: "union", name: `${prefix}Student Union`, note: "Indoors, open late" },
    { id: "library", name: "Main Library steps", note: "Busy and well lit" },
    { id: "stadium", name: "Stadium Gate 1", note: "The gameday favorite" },
  ];
}

export const findSpot = (spots: Spot[], id: string | null | undefined) => spots.find((s) => s.id === id) ?? spots[0];

// ---- Live API (optional) ----
// Goes through lib/api.ts so the signed-in session's Bearer token (and its refresh) is used.

export { isLive };

/** Mock orders are prefixed so a live session never asks the backend about them. */
export const isMockOrder = (id: string) => id.startsWith("m-");

export class LiveError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** POST to the Bidd API as the signed-in viewer. Throws LiveError on any failure (offline, signed out, timeout, 4xx/5xx). */
export async function livePost<T>(path: string, body?: unknown): Promise<T> {
  if (!isLive()) throw new LiveError(0, "offline", "Live mode is off.");
  const signal = typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(8000) : undefined;
  try {
    return await apiFetch<T>(path, { method: "POST", body, signal });
  } catch (e) {
    if (e instanceof ApiError) throw new LiveError(e.status, e.code, e.message);
    throw new LiveError(0, "network", "Couldn't reach Bidd.");
  }
}

// Minimal mirrors of backend/lib/contracts/orders.ts (the storefront has no zod).
export type LiveOrder = { id: string; status: "pending_meetup" | "completed" | "cancelled"; priceCents: number; buyerFeeCents: number; totalCents: number };
export type CheckoutResponse = { order: LiveOrder };
export type HandoffTokenResponse = { qrPayload: string; expiresAt: string };

// ---- Mock fallback ----

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function randomChars(n: number) {
  const bytes = new Uint8Array(n);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => ALPHABET[b % 64]).join("");
}

export const mockOrderId = () => `m-${Date.now().toString(36)}${randomChars(4)}`;

/** Same shape as the backend's code: "bidd:handoff:" + 43 url-safe characters. */
export const mockHandoff = (): HandoffTokenResponse => ({
  qrPayload: `bidd:handoff:${randomChars(43)}`,
  expiresAt: new Date(Date.now() + HANDOFF_TTL_MS).toISOString(),
});
