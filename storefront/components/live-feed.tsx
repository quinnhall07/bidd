"use client";
// Live campus feed on the home page: GET /api/listings (the signed-in student's campus, newest first), drawn as cards in
// the shape of components/listing.tsx's ListingCard and linking to the live listing page, /l/[id].
// Renders nothing until mounted, in mock mode, when signed out, when the API fails, or when the feed is empty.
// Photo URLs are signed for about 10 minutes: fetched on mount (never cached), re-fetched when the tab comes back after
// 9 minutes, and once more when a photo fails to load.
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { hasSession, isLive, listListings, onSessionChange, type ListingCondition, type ListingSize, type ListingSummary, type ListingTag } from "@/lib/api";
import { buyerFee, money, plural } from "@/lib/format";
import { withLab, type Lab } from "@/lib/lab";
import { SaveHeart } from "./save-heart";

// ---------------------------------------------------------------- labels for the API's enums (BACKEND_BRIEF 5.3)

const CONDITION: Record<ListingCondition, string> = { new_with_tags: "New with tags", like_new: "Like new", good: "Good", fair: "Fair" };
const TAG: Record<ListingTag, string> = { rush: "Rush", bid_day: "Bid Day", gameday: "Gameday", formal: "Formal" };

export const sizeText = (s: ListingSize) => (s === "ONE_SIZE" ? "One size" : s);
export const conditionText = (c: ListingCondition) => CONDITION[c] ?? c;
export const tagText = (t: ListingTag) => TAG[t] ?? t;

const FEED_LIMIT = 10;
const STALE_MS = 9 * 60_000;
const RETRY_MS = 60_000;

// ---------------------------------------------------------------- card

/** ListingCard's markup for a live ListingSummary: photo, then brand (or title) / size / price, heart on the photo. */
export function LiveCard({ listing: l, lab, priority, onPhotoError }: { listing: ListingSummary; lab: Lab; priority?: boolean; onPhotoError?: () => void }) {
  // Keyed to the URL, so a re-fetched (freshly signed) cover gets another try.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const showPhoto = Boolean(l.coverUrl) && brokenUrl !== l.coverUrl;
  const allIn = lab.v === "b";
  return (
    <div className="group relative">
      <Link href={withLab(`/l/${encodeURIComponent(l.id)}`, lab)} className="block" aria-label={`${l.title}, ${money(l.priceCents)}`}>
        <div className="photo relative overflow-hidden bg-[var(--gray-50)]">
          {showPhoto ? (
            <Image
              src={l.coverUrl!}
              alt=""
              fill
              unoptimized
              priority={priority}
              sizes="(min-width: 1280px) 260px, (min-width: 1024px) 25vw, (min-width: 760px) 33vw, 50vw"
              onError={() => {
                setBrokenUrl(l.coverUrl);
                onPhotoError?.();
              }}
              className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
            />
          ) : (
            <span className="absolute bottom-2 left-2 text-[12px] text-[var(--gray-600)]">{l.coverUrl ? "Photo didn't load" : "No photo yet"}</span>
          )}
        </div>
        <div className="mt-2.5 grid gap-0.5 text-[14px] leading-snug">
          <p className="truncate font-semibold">{l.brand?.trim() || l.title}</p>
          <p className="muted truncate">{sizeText(l.size)}</p>
          <p className="num font-bold">
            {allIn ? money(l.priceCents + buyerFee(l.priceCents), true) : money(l.priceCents)}
            {allIn && <span className="muted ml-1.5 text-[12px] font-semibold">all-in</span>}
          </p>
        </div>
      </Link>
      <SaveHeart className="absolute top-2 right-2" />
    </div>
  );
}

// ---------------------------------------------------------------- feed row

export function LiveFeed({ lab }: { lab: Lab }) {
  const [feed, setFeed] = useState<{ rows: ListingSummary[]; more: boolean } | null>(null);
  const [nonce, setNonce] = useState(0);
  const fetchedAt = useRef(0);

  useEffect(() => {
    if (!isLive() || !hasSession()) return;
    let alive = true;
    const load = () => {
      fetchedAt.current = Date.now();
      listListings({ limit: FEED_LIMIT })
        .then((r) => {
          if (alive) setFeed({ rows: r.listings, more: Boolean(r.nextCursor) });
        })
        .catch(() => {
          // Signed out (401), campus paused, offline or API down: the row just isn't there.
          if (alive) setFeed(null);
        });
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - fetchedAt.current > STALE_MS) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    const off = onSessionChange((s) => {
      if (!s && alive) setFeed(null);
    });
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      off();
    };
  }, [nonce]);

  // An expired signed URL: fetch the feed again for fresh ones, at most once a minute.
  const onPhotoError = useCallback(() => {
    if (Date.now() - fetchedAt.current > RETRY_MS) setNonce((n) => n + 1);
  }, []);

  if (!feed || feed.rows.length === 0) return null;

  return (
    <section aria-label="Fresh on campus" className="pt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-t-2 border-ink pt-6">
        <div>
          <span className="stamp">
            <span className="stamp-dot animate-pulse motion-reduce:animate-none" /> Live
          </span>
          <h2 className="display mt-4 text-[clamp(2.25rem,4vw,3.5rem)]">Fresh on campus.</h2>
          <p className="muted mt-3 max-w-[48ch] text-[15px] leading-relaxed">Just listed by classmates on your campus. Tap one to buy or bid.</p>
        </div>
        <p className="muted num text-[15px] font-semibold">{feed.more ? `Newest ${feed.rows.length}` : plural(feed.rows.length, "piece")}</p>
      </div>
      <ul className="listing-grid mt-6 grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-3 md:gap-x-4 md:gap-y-9 lg:grid-cols-4 xl:grid-cols-5">
        {feed.rows.map((l, i) => (
          <li key={l.id} className="reveal">
            <LiveCard listing={l} lab={lab} priority={i < 5} onPhotoError={onPhotoError} />
          </li>
        ))}
      </ul>
    </section>
  );
}
