"use client";
// /store/[handle]'s header. The saved store lives in localStorage, so the server renders the campus demo closet's store
// and the client swaps in the saved one after hydration (useSyncExternalStore: no storage read during the server pass).
import Link from "next/link";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { Plus } from "./icons";
import { STORE_KEY, StoreHeader, type Store } from "./store-header";

const subscribe = (fn: () => void) => {
  window.addEventListener("storage", fn);
  return () => window.removeEventListener("storage", fn);
};
const snapshot = () => {
  try {
    return localStorage.getItem(STORE_KEY) ?? "";
  } catch {
    return "";
  }
};
const serverSnapshot = () => null;

export function StoreView({
  handle,
  fallback,
  domain,
  sold,
  followers,
  sellHref,
  children,
}: {
  handle: string;
  fallback: Store;
  domain: string | null;
  sold: number;
  followers: number;
  sellHref: string;
  children: ReactNode;
}) {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const saved = useMemo(() => {
    if (!raw) return null;
    try {
      return (JSON.parse(raw) as Record<string, Store>)[handle] ?? null;
    } catch {
      return null;
    }
  }, [raw, handle]);
  const store = saved ?? fallback;
  const fresh = Boolean(saved);

  return (
    <>
      <StoreHeader
        store={store}
        domain={domain}
        sold={sold}
        followers={followers}
        actions={
          <>
            <Link href={sellHref} className="pill pill-ink">
              <Plus width={18} height={18} /> List a piece
            </Link>
            <button type="button" className="pill pill-line">
              Share store
            </button>
          </>
        }
      />
      <div className="column pt-10 pb-24">
        {fresh && (
          <div data-ground="dark" className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-[4px] bg-ink px-5 py-4 text-paper" style={{ animation: "rise-in 0.5s var(--ease-out-expo) both" }}>
            <p className="text-[15px]">
              <span className="font-semibold">Your store is open.</span> <span className="muted">Pieces you list show here, and on {store.campus}&apos;s rack.</span>
            </p>
            <span className="h-2 w-16 rounded-full" style={{ backgroundColor: store.accent }} aria-hidden="true" />
          </div>
        )}
        {children}
      </div>
    </>
  );
}
