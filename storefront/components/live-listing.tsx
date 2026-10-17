"use client";
// Live listing page body (/l/[id]): app/item/[id]/page.tsx's layout for a real listing from the API.
// GET /api/listings/:id and GET /api/listings/:id/bids after mount (photo URLs are signed for ~10 minutes, so nothing is
// cached or server-rendered). An auction that's open, or ended with bids, shows LiveBid in live mode; otherwise Buy goes
// through the live checkout (POST /api/checkout) with the pilot's payment notice and no mock fallback.
// Signed out (or a 401) shows the sign-in state; 404 (missing, removed, another campus) shows not-found.
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiFetch, errorMessage, getListing, hasSession, isLive, onSessionChange, type ListingDetail } from "@/lib/api";
import { buyerFee, date, initials, money } from "@/lib/format";
import { withLab, type Lab } from "@/lib/lab";
import { CheckoutButton } from "./checkout";
import { EmptyState } from "./empty-state";
import { LiveBid, type Auction, type Bid } from "./live-bid";
import { conditionText, sizeText, tagText } from "./live-feed";
import { SaveHeart } from "./save-heart";
import { Arrow, Check, Hanger, Pin } from "./icons";

type BidsView = { auction: Auction; bids: Bid[] };
type State =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "not-found" }
  | { kind: "error"; message: string }
  | { kind: "ready"; listing: ListingDetail; bids: BidsView | null };

const RETRY_MS = 60_000;

async function load(id: string): Promise<State> {
  // Mock builds have no live listings to show.
  if (!isLive()) return { kind: "not-found" };
  if (!hasSession()) return { kind: "signed-out" };
  try {
    const [listing, bids] = await Promise.all([
      getListing(id),
      // 400 not_an_auction (fixed price), 404 or any failure: no auction box.
      apiFetch<BidsView>(`/api/listings/${encodeURIComponent(id)}/bids`).catch(() => null),
    ]);
    return { kind: "ready", listing, bids: bids?.auction ? bids : null };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401 || e.code === "campus_mismatch" || e.code === "email_not_verified") return { kind: "signed-out" };
      if (e.status === 404) return { kind: "not-found" };
    }
    return { kind: "error", message: errorMessage(e, "Couldn't load this listing. Try again.") };
  }
}

export function LiveListing({ id, lab, campusSlug, campusName }: { id: string; lab: Lab; campusSlug: string | null; campusName: string | null }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [nonce, setNonce] = useState(0);
  const [active, setActive] = useState(0);
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const loadedAt = useRef(0);

  useEffect(() => {
    let alive = true;
    loadedAt.current = Date.now();
    load(id).then((s) => {
      if (alive) setState(s);
    });
    const off = onSessionChange((s) => {
      if (!s && alive) setState({ kind: "signed-out" });
    });
    return () => {
      alive = false;
      off();
    };
  }, [id, nonce]);

  const retry = () => {
    setState({ kind: "loading" });
    setNonce((n) => n + 1);
  };
  // A photo that won't load has most likely expired: fetch the listing again for fresh URLs, at most once a minute.
  const onPhotoError = useCallback((url: string) => {
    setBrokenUrl(url);
    if (Date.now() - loadedAt.current > RETRY_MS) setNonce((n) => n + 1);
  }, []);

  const feed = withLab("/", lab);

  if (state.kind === "loading") return <Skeleton />;

  if (state.kind !== "ready")
    return (
      <div className="column pt-8 pb-24 md:pt-12">
        {state.kind === "signed-out" ? (
          <EmptyState
            size="s"
            title="Sign in to see it."
            body={<>Sign in with your school email to see this listing. Listings on Bidd stay on their own campus.</>}
            actions={
              <>
                <Link href={withLab("/login", lab)} className="pill pill-ink">
                  Sign in <Arrow width={18} height={18} />
                </Link>
                <Link href={feed} className="pill pill-line">
                  Back to the feed
                </Link>
              </>
            }
          />
        ) : state.kind === "not-found" ? (
          <EmptyState
            size="s"
            title="Not on the rack."
            body={<>This listing doesn&apos;t exist anymore, was taken down, or belongs to another campus.</>}
            actions={
              <>
                <Link href={feed} className="pill pill-ink">
                  Back to the feed
                </Link>
                <Link href={withLab("/sell", lab)} className="pill pill-line">
                  Sell a piece
                </Link>
              </>
            }
          />
        ) : (
          <EmptyState
            size="s"
            title="Couldn't load it."
            body={state.message}
            actions={
              <>
                <button type="button" className="pill pill-ink" onClick={retry}>
                  Try again
                </button>
                <Link href={feed} className="pill pill-line">
                  Back to the feed
                </Link>
              </>
            }
          />
        )}
      </div>
    );

  const l = state.listing;
  const photos = [...l.photos].filter((p) => p.url).sort((a, b) => a.position - b.position);
  const shown = Math.min(active, Math.max(0, photos.length - 1));
  const main = photos[shown]?.url ?? l.coverUrl;
  const sold = l.status === "sold";
  const reserved = l.status === "reserved";
  const fee = buyerFee(l.priceCents);
  // Ended with no bids = a normal fixed-price listing again (BACKEND_BRIEF 10).
  const auction = state.bids && !(state.bids.auction.ended && state.bids.auction.bidCount === 0) && l.status === "active" ? state.bids : null;
  const seller = l.seller.displayName?.trim() || null;

  return (
    <div className="column grid gap-10 pt-8 pb-16 md:grid-cols-12 md:gap-12 md:pt-12">
      <div className="md:col-span-7">
        <div className="photo relative overflow-hidden bg-[var(--gray-50)]">
          {main && brokenUrl !== main ? (
            <Image
              src={main}
              alt={l.title}
              fill
              unoptimized
              priority
              sizes="(min-width: 760px) 58vw, 100vw"
              onError={() => onPhotoError(main)}
              className={`object-cover ${sold ? "grayscale-[60%]" : ""}`}
            />
          ) : (
            <span className="absolute bottom-3 left-3 text-[12px] text-[var(--gray-600)]">{main ? "Photo didn't load" : "No photo yet"}</span>
          )}
          {(sold || reserved) && <span className="display absolute bottom-0 left-0 bg-ink px-4 pt-2 pb-1.5 text-[36px] text-paper">{sold ? "Sold" : "Reserved"}</span>}
        </div>
        {photos.length > 1 && (
          <ul className="mt-2 grid grid-cols-6 gap-2" aria-label="Photos">
            {photos.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-label={`Photo ${i + 1} of ${photos.length}`}
                  aria-pressed={i === shown}
                  onClick={() => setActive(i)}
                  className={`photo relative block w-full overflow-hidden bg-[var(--gray-50)] transition-opacity ${i === shown ? "outline-2 outline-offset-2 outline-ink" : "opacity-70 hover:opacity-100"}`}
                >
                  {brokenUrl !== p.url && <Image src={p.url!} alt="" fill unoptimized sizes="96px" onError={() => onPhotoError(p.url!)} className="object-cover" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="md:col-span-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="label muted">{l.brand?.trim() || "Campus resale"}</p>
          {l.isOwner && (
            <span className="stamp">
              <span className="stamp-dot" /> Your listing
            </span>
          )}
        </div>
        <h1 className="mt-3 text-[clamp(1.5rem,2.2vw,2rem)] leading-tight font-semibold">{l.title}</h1>
        <p className="muted mt-2 text-[16px]">
          Size {sizeText(l.size)} • {conditionText(l.condition)}
          {l.condition === "new_with_tags" ? "" : " condition"}
        </p>
        {l.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {l.tags.map((t) => (
              <span key={t} className="chip chip-quiet">
                {tagText(t)}
              </span>
            ))}
          </div>
        )}

        <div className="mt-8 border-t-2 border-ink pt-6">
          {!auction && <p className="display num text-[clamp(2.5rem,4vw,3.5rem)]">{lab.v === "b" ? money(l.priceCents + fee, true) : money(l.priceCents)}</p>}
          {auction ? (
            <>
              {l.isOwner && <p className="muted mb-4 text-[15px] font-semibold">Bids from your campus land here as they come in.</p>}
              <LiveBid key={l.id} listingId={l.id} priceCents={l.priceCents} title={l.title} campusSlug={campusSlug ?? undefined} initial={auction} />
            </>
          ) : sold || reserved ? (
            <div className="mt-5">
              <button className="pill w-full" disabled>
                {sold ? "Sold" : "Reserved"}
              </button>
              <p className="muted mt-3 text-[15px]">
                {sold ? "This one found a new closet." : "Someone is meeting the seller for this one. If the meetup falls through, it comes back on the feed."}
              </p>
            </div>
          ) : l.status === "draft" ? (
            <div className="mt-5">
              <button className="pill w-full" disabled>
                Draft
              </button>
              <p className="muted mt-3 text-[15px]">Only you can see drafts. Publish it from Sell to put it on the feed.</p>
            </div>
          ) : l.isOwner ? (
            <div className="mt-5">
              <p className="flex items-center gap-2.5 rounded-[4px] bg-[var(--gray-50)] p-3.5 text-[15px] font-semibold">
                <Check width={20} height={20} strokeWidth={2.5} className="shrink-0" /> It&apos;s on the rack. Classmates can buy it now.
              </p>
              <p className="muted mt-3 text-[14px]">When someone buys, you meet on campus and scan their one-time QR to finish the sale.</p>
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
                <CheckoutButton
                  liveOnly
                  lab={lab}
                  campusSlug={campusSlug}
                  campusName={campusName}
                  item={{
                    id: l.id,
                    title: l.title,
                    size: sizeText(l.size),
                    condition: conditionText(l.condition),
                    photo: main ?? "",
                    color: "var(--gray-50)",
                    priceCents: l.priceCents,
                    feeCents: fee,
                  }}
                />
                <SaveHeart className="size-12! border-2 border-ink" />
              </div>
              <p className="muted num mt-3 text-[14px]">
                {lab.v === "b" ? `Includes the ${money(fee, true)} buyer fee. Sellers pay 0%.` : `+${money(fee, true)} buyer fee · You pay ${money(l.priceCents + fee, true)}. Sellers pay 0%.`}
              </p>
            </>
          )}
        </div>

        <div className="mt-8 grid gap-px">
          <p className="text-[15px] font-semibold">Get it</p>
          <div className="mt-2 rounded-[4px] border-2 border-ink p-4">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <Pin width={18} height={18} /> Exchange Spot
            </p>
            <p className="muted mt-1 text-[14px]">Free. Meet on campus, scan the QR, done.</p>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4 rounded-[4px] border border-[var(--gray-100)] p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-[15px] font-bold text-paper">
            {seller ? initials(seller) : <Hanger width={20} height={20} />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[16px] font-semibold">
              {seller ?? "A classmate"}
              {l.isOwner && <span className="muted font-normal"> · you</span>}
            </span>
            <span className="muted flex items-center gap-1.5 text-[14px]">
              <Check width={15} height={15} strokeWidth={2.5} className="shrink-0 text-[var(--campus-line)]" /> School email verified
              {l.publishedAt ? ` · Listed ${date(l.publishedAt)}` : ""}
            </span>
          </span>
        </div>

        {l.description && <p className="mt-8 max-w-[60ch] text-[16px] leading-relaxed whitespace-pre-line">{l.description}</p>}
      </div>
    </div>
  );
}

/** Loading: the listing page's shape. */
function Skeleton() {
  return (
    <div className="column grid gap-10 pt-8 pb-16 md:grid-cols-12 md:gap-12 md:pt-12" aria-busy="true" aria-label="Loading listing">
      <div className="photo skeleton md:col-span-7" />
      <div className="md:col-span-5">
        <div className="skeleton h-3.5 w-[34%] rounded-[2px]" />
        <div className="skeleton mt-4 h-8 w-[82%] rounded-[2px]" />
        <div className="skeleton mt-3 h-4 w-[48%] rounded-[2px]" />
        <div className="mt-8 border-t-2 border-ink pt-6">
          <div className="skeleton h-12 w-[38%] rounded-[2px]" />
          <div className="skeleton mt-5 h-12 w-full rounded-full" />
        </div>
        <div className="skeleton mt-8 h-[72px] w-full rounded-[4px]" />
      </div>
    </div>
  );
}
