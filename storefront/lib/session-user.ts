// The signed-in student (live mode), for the header and anything else that needs "who and which campus".
// Client-only: useSessionUser() is a hook and signOut() navigates. Reads GET /api/me once a session exists, keeps the
// answer in memory and in sessionStorage (so a reload paints the header without waiting), and is null on the server and
// on the first client render, so it never causes a hydration mismatch. Mock mode (no API URL) is always null.
import { useSyncExternalStore } from "react";
import { ApiError, clearSession, getMe, hasSession, isLive, logout, onSessionChange, type MeResponse } from "./api";

export type SessionUser = {
  user: { displayName: string | null; email: string };
  /** `slug` is the API's campus slug ("ua", "olemiss"), the same slugs the storefront's ?school= uses. */
  campus: { slug: string; name: string; fullName: string };
};

const CACHE_KEY = "bidd.sessionUser";

let current: SessionUser | null = null;
let started = false;
let inflight: Promise<SessionUser | null> | null = null;
const subscribers = new Set<() => void>();

const cache = {
  read(): SessionUser | null {
    try {
      const raw = window.sessionStorage.getItem(CACHE_KEY);
      const v = raw ? (JSON.parse(raw) as SessionUser) : null;
      return v?.user && v?.campus?.slug ? v : null;
    } catch {
      return null;
    }
  },
  write(v: SessionUser | null) {
    try {
      if (v) window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(v));
      else window.sessionStorage.removeItem(CACHE_KEY);
    } catch {
      /* private window or blocked storage: memory only */
    }
  },
};

function set(next: SessionUser | null) {
  current = next;
  cache.write(next);
  subscribers.forEach((s) => s());
}

const fromMe = (me: MeResponse): SessionUser => ({
  user: { displayName: me.user.displayName, email: me.user.email },
  campus: { slug: me.campus.slug, name: me.campus.shortName, fullName: me.campus.name },
});

/** Store a /api/me answer you already have (sign-in, onboarding) so the header doesn't fetch it again. */
export function primeSessionUser(me: MeResponse): SessionUser {
  const v = fromMe(me);
  set(v);
  return v;
}

/** Re-read /api/me (after a display-name change, say). Resolves null when signed out; keeps the last value on a network blip. */
export function refreshSessionUser(): Promise<SessionUser | null> {
  if (!isLive() || !hasSession()) {
    if (current) set(null);
    return Promise.resolve(null);
  }
  inflight ??= getMe()
    .then(primeSessionUser)
    .catch((e) => {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) set(null);
      return current;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  onSessionChange((s) => {
    if (!s) set(null);
    // A token refresh also lands here; only a brand-new session needs /api/me.
    else if (!current) void refreshSessionUser();
  });
  if (!isLive() || !hasSession()) {
    cache.write(null);
    return;
  }
  const cached = cache.read();
  if (cached) set(cached);
  void refreshSessionUser();
}

function subscribe(onChange: () => void) {
  subscribers.add(onChange);
  // Deferred so the first store update never lands inside React's subscribe call.
  queueMicrotask(start);
  return () => void subscribers.delete(onChange);
}

/** The signed-in student and campus, or null (signed out, mock mode, still loading, or the first render). */
export function useSessionUser(): SessionUser | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

/** Ends the session on the API (best effort), forgets it locally, and goes to `to` (default "/") with a full reload. */
export async function signOut(to = "/") {
  try {
    await logout();
  } catch {
    /* offline or already expired: logout() has cleared the local session anyway */
  }
  clearSession();
  set(null);
  window.location.assign(to);
}
