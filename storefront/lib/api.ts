// Client for Rouan's Bidd API (handoff/BACKEND_BRIEF.md, backend/lib/contracts/*). Client-safe: no server-only imports.
// Live mode is on only when NEXT_PUBLIC_BIDD_API_URL is set. Callers should treat every live call as optional and fall
// back to mock data when isLive() is false or a call throws, so the demo never breaks.
// Sessions follow the brief: access token in memory, refresh token in localStorage, refresh ~60s before expiry or once
// after a 401 invalid_token. Money is whole cents everywhere.

const BASE = (process.env.NEXT_PUBLIC_BIDD_API_URL ?? "").trim().replace(/\/+$/, "");
const REFRESH_KEY = "bidd.refreshToken";

export const isLive = () => BASE.length > 0;
export const apiUrl = (path: string) => `${BASE}${path.startsWith("/") ? path : `/${path}`}`;

// ---------------------------------------------------------------- types (mirrors backend/lib/contracts)

export type Session = { accessToken: string; refreshToken: string; expiresAt: number; tokenType: "bearer" };
export type MembershipStatus = "pending" | "active" | "rejected";
export type CampusTheme = { name?: string; primary?: string; secondary?: string; accent?: string };

export type RequestCodeResponse = { sent: true; message: string; campus: { name: string; shortName: string } };
export type VerifyCodeResponse = { session: Session; needsOnboarding: boolean };
export type MeResponse = {
  user: { id: string; email: string; displayName: string | null; role: "student" | "admin"; onboarded: boolean };
  campus: { id: string; slug: string; name: string; shortName: string; conference: string; theme: CampusTheme };
  memberships: Array<{
    id: string;
    status: MembershipStatus;
    role: "member" | "officer";
    requestedAt: string;
    organization: { id: string; name: string; kind: string } | null;
  }>;
  badges: Array<{ id: "school_email_verified"; label: "School email verified" }>;
};
export type Organization = { id: string; name: string; nationalOrg: string | null; kind: string };
export type OnboardingBody = { displayName: string; organizationId?: string };
export type OnboardingResponse = { ok: true; chapterRequest: { organizationId: string; status: MembershipStatus } | null };

export type ListingTag = "rush" | "bid_day" | "gameday" | "formal";
export type ListingSize = "XXS" | "XS" | "S" | "M" | "L" | "XL" | "XXL" | "0" | "2" | "4" | "6" | "8" | "10" | "12" | "14" | "ONE_SIZE";
export type ListingCondition = "new_with_tags" | "like_new" | "good" | "fair";
export type ListingStatus = "draft" | "active" | "reserved" | "sold" | "removed";
export type ListingPhoto = { id: string; position: number; url: string | null; width: number | null; height: number | null };
export type ListingSummary = {
  id: string;
  title: string;
  priceCents: number;
  size: ListingSize;
  condition: ListingCondition;
  tags: ListingTag[];
  brand: string | null;
  status: ListingStatus;
  publishedAt: string | null;
  coverUrl: string | null;
  seller: { id: string; displayName: string | null };
};
export type ListingDetail = ListingSummary & { description: string; photos: ListingPhoto[]; isOwner: boolean; createdAt: string; updatedAt: string };
export type FeedQuery = { tag?: ListingTag; size?: ListingSize; minPriceCents?: number; maxPriceCents?: number; limit?: number; cursor?: string };
export type FeedResponse = { listings: ListingSummary[]; nextCursor: string | null };
export type CreateListingBody = {
  title: string;
  description?: string;
  brand?: string | null;
  priceCents: number;
  size: ListingSize;
  condition: ListingCondition;
  tags?: ListingTag[];
};
export type UpdateListingBody = Partial<CreateListingBody> & { status?: "draft" | "active" | "removed" };

export type OrderStatus = "pending_meetup" | "completed" | "cancelled";
export type Order = {
  id: string;
  status: OrderStatus;
  role: "buyer" | "seller";
  priceCents: number;
  buyerFeeCents: number;
  totalCents: number;
  payment: { collected: false; message: string };
  listing: { id: string; title: string } | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
};
export type HandoffTokenResponse = { qrPayload: string; expiresAt: string };
export type ConfirmHandoffResponse = { ok: true; orderId: string };
export type CupResponse = {
  campus: {
    id: string;
    name: string;
    standings: Array<{ rank: number; organizationId: string; name: string; kind: string; points: number; sales: number }>;
  };
  conference: Array<{ rank: number; campusId: string; name: string; shortName: string; points: number; sales: number; isYourCampus: boolean }>;
};

export const PAYMENT_NOTICE = "Payments aren't available yet. Pay the seller in person at the meetup.";

// ---------------------------------------------------------------- errors

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * True when the API couldn't be reached or didn't answer in its own `{ error }` shape (network down, CORS, wrong URL,
 * backend crash). Callers use this to fall back to mock behaviour silently instead of showing an error.
 */
export const isUnreachable = (e: unknown) =>
  !(e instanceof ApiError) || e.status === 0 || e.status >= 500 || e.code === "http_error" || e.code === "origin_not_allowed";

/** The sentence to show a person for any thrown value. */
export const errorMessage = (e: unknown, fallback = "Something went wrong. Try again.") =>
  e instanceof ApiError ? e.message : e instanceof Error && e.message ? e.message : fallback;

// ---------------------------------------------------------------- session storage

let session: Session | null = null;
let refreshing: Promise<Session | null> | null = null;
const listeners = new Set<(s: Session | null) => void>();

const store = {
  get(): string | null {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set(v: string | null) {
    try {
      if (typeof window === "undefined") return;
      if (v) window.localStorage.setItem(REFRESH_KEY, v);
      else window.localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* private window or blocked storage: the session just won't survive a reload */
    }
  },
};

export const getSession = () => session;
/** True when there is a session in memory or a refresh token that can restore one. */
export const hasSession = () => session !== null || store.get() !== null;

export function setSession(next: Session) {
  session = next;
  store.set(next.refreshToken);
  listeners.forEach((l) => l(next));
}

/** Per-person preferences saved on the device; wiped with the session so a shared computer doesn't keep them. */
const PERSONAL_KEYS = ["bidd.sizes"];

export function clearSession() {
  session = null;
  store.set(null);
  try {
    for (const key of PERSONAL_KEYS) window.localStorage.removeItem(key);
  } catch {
    /* no storage access (private window or server): nothing saved to clear */
  }
  listeners.forEach((l) => l(null));
}

export function onSessionChange(listener: (s: Session | null) => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

async function refresh(): Promise<Session | null> {
  const refreshToken = session?.refreshToken ?? store.get();
  if (!refreshToken) return null;
  refreshing ??= (async () => {
    try {
      const res = await raw<{ session: Session }>("/api/auth/refresh", { method: "POST", body: { refreshToken } });
      setSession(res.session);
      return res.session;
    } catch (e) {
      if (e instanceof ApiError && (e.code === "invalid_refresh_token" || e.status === 401)) clearSession();
      throw e;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** A usable access token, refreshing first when it expires within 60 seconds. Null when signed out. */
export async function accessToken(): Promise<string | null> {
  const now = Date.now() / 1000;
  if (session && session.expiresAt - 60 > now) return session.accessToken;
  const next = await refresh();
  return next?.accessToken ?? null;
}

// ---------------------------------------------------------------- fetch

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Send the Bearer token (default true). */
  auth?: boolean;
  query?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
};

async function raw<T>(path: string, { method = "GET", body, query, signal }: Options, token?: string | null): Promise<T> {
  if (!isLive()) throw new ApiError("offline", "Live mode is off.", 0);
  let url: URL;
  try {
    url = new URL(apiUrl(path), typeof window === "undefined" ? "http://localhost" : window.location.origin);
  } catch {
    throw new ApiError("network_error", "Can't reach Bidd right now. Check your connection and try again.", 0);
  }
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: payload, signal, cache: "no-store" });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new ApiError("network_error", "Can't reach Bidd right now. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(err?.code ?? "http_error", err?.message ?? `Request failed (${res.status}).`, res.status);
  }
  return data as T;
}

/** Calls the API. Throws ApiError(code, message, status) for `{ error: { code, message } }` responses. */
export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  if (opts.auth === false) return raw<T>(path, opts);
  const token = await accessToken();
  if (!token) throw new ApiError("unauthenticated", "Sign in to continue.", 401);
  try {
    return await raw<T>(path, opts, token);
  } catch (e) {
    if (!(e instanceof ApiError) || e.code !== "invalid_token") throw e;
    if (session) session = { ...session, expiresAt: 0 };
    const fresh = await refresh();
    if (!fresh) throw e;
    return raw<T>(path, opts, fresh.accessToken);
  }
}

/** Runs a live call, or returns null when live mode is off or the call fails (for silent mock fallback). */
export async function tryLive<T>(call: () => Promise<T>): Promise<T | null> {
  if (!isLive()) return null;
  try {
    return await call();
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.warn("[bidd api] falling back to mock:", e);
    return null;
  }
}

// ---------------------------------------------------------------- auth

export const requestCode = (email: string, captchaToken?: string) =>
  apiFetch<RequestCodeResponse>("/api/auth/request-code", { method: "POST", auth: false, body: captchaToken ? { email, captchaToken } : { email } });

export async function verifyCode(email: string, code: string) {
  const res = await apiFetch<VerifyCodeResponse>("/api/auth/verify-code", { method: "POST", auth: false, body: { email, code } });
  setSession(res.session);
  return res;
}

export async function logout() {
  try {
    await apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });
  } finally {
    clearSession();
  }
}

// ---------------------------------------------------------------- account

export const getMe = () => apiFetch<MeResponse>("/api/me");
export const getOrganizations = () => apiFetch<{ organizations: Organization[] }>("/api/organizations").then((r) => r.organizations);
export const onboarding = (body: OnboardingBody) => apiFetch<OnboardingResponse>("/api/onboarding", { method: "POST", body });

// ---------------------------------------------------------------- listings

export const listListings = (query: FeedQuery = {}) => apiFetch<FeedResponse>("/api/listings", { query });
export const getListing = (id: string) => apiFetch<{ listing: ListingDetail }>(`/api/listings/${encodeURIComponent(id)}`).then((r) => r.listing);
export const getMyListings = () => apiFetch<{ listings: ListingSummary[] }>("/api/me/listings").then((r) => r.listings);
export const createListing = (body: CreateListingBody) =>
  apiFetch<{ listing: ListingDetail }>("/api/listings", { method: "POST", body }).then((r) => r.listing);
export const updateListing = (id: string, body: UpdateListingBody) =>
  apiFetch<{ listing: ListingDetail }>(`/api/listings/${encodeURIComponent(id)}`, { method: "PATCH", body }).then((r) => r.listing);
export const publishListing = (id: string) => updateListing(id, { status: "active" });

/** One photo per request, multipart field "photo". The browser sets the multipart Content-Type. */
export function uploadListingPhoto(id: string, file: Blob, filename = "photo.jpg") {
  const form = new FormData();
  form.append("photo", file, file instanceof File ? file.name : filename);
  return apiFetch<{ photo: ListingPhoto }>(`/api/listings/${encodeURIComponent(id)}/media`, { method: "POST", body: form }).then((r) => r.photo);
}

export const deleteListingPhoto = (id: string, photoId: string) =>
  apiFetch<{ ok: true }>(`/api/listings/${encodeURIComponent(id)}/media/${encodeURIComponent(photoId)}`, { method: "DELETE" });

// ---------------------------------------------------------------- orders and the meetup QR

export const createOrder = (listingId: string) => apiFetch<{ order: Order }>("/api/checkout", { method: "POST", body: { listingId } }).then((r) => r.order);
export const getOrders = () => apiFetch<{ orders: Order[] }>("/api/orders").then((r) => r.orders);
export const cancelOrder = (id: string) => apiFetch<{ ok: true }>(`/api/orders/${encodeURIComponent(id)}/cancel`, { method: "POST" });
export const handoffToken = (orderId: string) =>
  apiFetch<HandoffTokenResponse>(`/api/orders/${encodeURIComponent(orderId)}/handoff-token`, { method: "POST" });
export const confirmHandoff = (token: string) => apiFetch<ConfirmHandoffResponse>("/api/handoffs/confirm", { method: "POST", body: { token: token.trim() } });

// ---------------------------------------------------------------- Closet Cup

export const getCup = () => apiFetch<CupResponse>("/api/cup");
