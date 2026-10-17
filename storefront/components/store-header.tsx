// Student store: the shared header (used by /store/new's live preview and /store/[handle]) and the saved-store shape.
// Stores are mock: saved in localStorage under STORE_KEY, read only after mount (see store-view.tsx).
import Link from "next/link";
import type { ReactNode } from "react";
import { initials } from "@/lib/format";
import { Check } from "./icons";

export type Store = { handle: string; name: string; bio: string; accent: string; banner: string; campus: string; owner: string };

export const STORE_KEY = "bidd.stores";
export const HANDLE_RE = /^(?![._])(?!.*[._]$)[a-z0-9._]{3,20}$/;
const RESERVED = new Set(["new", "me", "bidd", "admin", "store", "stores"]);

export function handleError(h: string, taken: (h: string) => boolean): string | null {
  if (!h) return "Pick a handle.";
  if (h.length < 3) return "At least 3 characters.";
  if (!HANDLE_RE.test(h)) return "Letters, numbers, dots and underscores; no dot or underscore at either end.";
  if (RESERVED.has(h) || taken(h)) return `@${h} is taken.`;
  return null;
}

export const toHandle = (s: string) => s.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._]/g, "").slice(0, 20);

/** Ink or paper on top of an accent, whichever reads. */
export function onAccent(hex: string) {
  const n = Number.parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#0B0B0B" : "#FFFFFF";
}

export function readStores(): Record<string, Store> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Store>) : {};
  } catch {
    return {};
  }
}

export function VerifiedBadge({ domain, tone = "light" }: { domain?: string | null; tone?: "light" | "dark" }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold ${tone === "dark" ? "bg-paper text-ink" : "bg-ink text-paper"}`}>
        <Check width={14} height={14} strokeWidth={3} /> School email verified
      </span>
      {domain && <span className="muted text-[13px]">@{domain}</span>}
    </span>
  );
}

export function StoreHeader({
  store,
  domain,
  sold,
  followers,
  preview,
  actions,
}: {
  store: Pick<Store, "handle" | "name" | "bio" | "accent" | "banner">;
  domain?: string | null;
  sold: number;
  followers: number;
  preview?: boolean;
  actions?: ReactNode;
}) {
  const ink = onAccent(store.accent);
  const name = store.name.trim() || "Your store";
  return (
    <section>
      <div className={`relative overflow-hidden bg-[var(--gray-50)] ${preview ? "aspect-[5/2] rounded-t-[4px]" : "aspect-[5/2] md:aspect-[4/1]"}`}>
        {store.banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.banner} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <span className="absolute inset-x-0 bottom-0 h-2" style={{ backgroundColor: store.accent }} />
        <span className="stamp absolute top-3 left-3 bg-paper">
          <span className="stamp-dot" /> Student store
        </span>
      </div>
      <div className={preview ? "px-5 pb-6" : "column"}>
        <div className={`flex flex-wrap items-end justify-between gap-4 ${preview ? "-mt-10" : "-mt-12 md:-mt-16"}`}>
          <div
            className={`relative grid shrink-0 place-items-center rounded-full border-4 border-paper font-bold ${preview ? "size-20 text-[26px]" : "size-24 text-[32px] md:size-32 md:text-[40px]"}`}
            style={{ backgroundColor: store.accent, color: ink }}
          >
            {initials(name)}
          </div>
          {actions && <div className="flex flex-wrap gap-3 pb-1">{actions}</div>}
        </div>
        <h1 className={`display mt-4 break-words ${preview ? "text-[clamp(2rem,3.4vw,2.75rem)]" : "text-[clamp(2.75rem,5vw,4.5rem)]"}`}>{name}</h1>
        <p className="muted mt-2 text-[15px]">@{store.handle || "handle"}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <VerifiedBadge domain={domain} />
          <p className="num text-[15px]">
            <span className="font-bold">{sold}</span> <span className="muted">sold</span>
            <span className="muted"> · </span>
            <span className="font-bold">{followers}</span> <span className="muted">followers</span>
          </p>
        </div>
        {store.bio.trim() && <p className="mt-4 max-w-[56ch] text-[16px] leading-relaxed">{store.bio}</p>}
      </div>
    </section>
  );
}

export function StoreLink({ href, children, ink }: { href: string; children: ReactNode; ink?: boolean }) {
  return (
    <Link href={href} className={`pill ${ink ? "pill-ink" : "pill-line"}`}>
      {children}
    </Link>
  );
}
