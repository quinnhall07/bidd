"use client";
// Live ascending bidding for member resale listings (open bids, anyone can see the high bid).
// Drops use sealed bids instead (components/sealed-bid.tsx): one hidden bid each, no high bid to watch.
// Live mode: NEXT_PUBLIC_BIDD_API_URL is set and a session exists -> GET/POST /api/listings/:id/bids (shared bid contract).
// Any error on the first GET falls back to a deterministic mock auction with simulated rival bidders.
// Server pages choose bid vs buy with isAuctionListing() from lib/auction (a client file's functions can't run on the server).
import { useCallback, useEffect, useRef, useState } from "react";
import { accessToken, hasSession } from "@/lib/api";
import { hash, minNextCents, mockHours } from "@/lib/auction";
import { formatLeft } from "./countdown";
import { Alert, Check, Lock } from "./icons";

// ---------------------------------------------------------------- contract types

export type Auction = {
  listingId: string;
  startCents: number;
  highCents: number | null;
  bidCount: number;
  minNextCents: number;
  endsAt: string;
  leading: boolean;
  ended: boolean;
};
export type Bid = { amountCents: number; at: string; bidder: string };

const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

/** Card badge for auction listings: "Bidding · 3h left". Static text, so it renders the same on server and client. */
export function BidBadge({ listingId, className = "" }: { listingId: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[12px] font-bold tracking-[0.04em] text-paper ${className}`}>
      <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--campus-line,var(--paper))] motion-reduce:animate-none" aria-hidden="true" />
      Bidding · {mockHours(listingId)}h left
    </span>
  );
}

// ---------------------------------------------------------------- mock auction

type MockBid = { amountCents: number; at: number; who: string }; // who: "me" or a rival key
type Mock = { startCents: number; endsAt: number; bids: MockBid[] }; // bids newest first

// seed: campus + listing (bid history); listingId: hours left, so the countdown agrees with <BidBadge/>.
// Unsigned shifts (>>>) only: hash() can exceed 2^31, and a signed shift would go negative and break the modulos.
function seedMock(seed: string, listingId: string, priceCents: number, now: number): Mock {
  const h = hash(seed);
  const startCents = Math.max(100, Math.round((priceCents * 0.6) / 100) * 100);
  const n = 2 + (h % 4);
  const pool = Math.min(n, 3);
  const bids: MockBid[] = [];
  let high: number | null = null;
  for (let i = 0; i < n; i++) {
    const amount: number = minNextCents(startCents, high) + ((h >>> (i * 3)) % 3) * 100;
    high = amount;
    let r = (h >>> (i * 2)) % pool;
    if (bids[0]?.who === `r${1 + r}`) r = (r + 1) % pool; // nobody outbids themselves
    bids.unshift({ amountCents: amount, at: now - (n - i) * (4 + ((h >>> i) % 9)) * 60_000, who: `r${1 + r}` });
  }
  // Under 30 minutes off the badge's whole hours, so "3h left" and the clock agree.
  const endsAt = now + mockHours(listingId) * 3_600_000 - (7 + (h % 22)) * 60_000;
  return { startCents, endsAt, bids };
}

function mockView(id: string, m: Mock, now: number): { auction: Auction; bids: Bid[] } {
  const order: string[] = [];
  [...m.bids].reverse().forEach((b) => b.who !== "me" && !order.includes(b.who) && order.push(b.who));
  const high = m.bids[0]?.amountCents ?? null;
  return {
    auction: {
      listingId: id,
      startCents: m.startCents,
      highCents: high,
      bidCount: m.bids.length,
      minNextCents: minNextCents(m.startCents, high),
      endsAt: new Date(m.endsAt).toISOString(),
      leading: m.bids[0]?.who === "me",
      ended: now >= m.endsAt,
    },
    bids: m.bids.slice(0, 20).map((b) => ({ amountCents: b.amountCents, at: new Date(b.at).toISOString(), bidder: b.who === "me" ? "You" : `Bidder ${order.indexOf(b.who) + 1}` })),
  };
}

const ANTI_SNIPE_MS = 2 * 60_000;
// Event-time helpers live outside the component so the purity lint knows they never run during render.
const clockMs = () => Date.now();
const rivalDelayMs = () => 6000 + Math.random() * 6000;

// ---------------------------------------------------------------- live API (shared bid contract)

const API = (process.env.NEXT_PUBLIC_BIDD_API_URL ?? "").trim().replace(/\/+$/, "");

class BidError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function bidApi(path: string, init?: { method: "POST"; body: unknown }): Promise<{ auction: Auction; bids: Bid[] }> {
  const token = await accessToken();
  if (!token) throw new BidError("unauthorized", "Sign in to bid.");
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: { authorization: `Bearer ${token}`, ...(init ? { "content-type": "application/json" } : {}) },
    body: init ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.auction) throw new BidError(json?.error?.code ?? "network", json?.error?.message ?? "Couldn't reach bidding. Try again.");
  return { auction: json.auction, bids: Array.isArray(json.bids) ? json.bids : [] };
}

// ---------------------------------------------------------------- component

const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return s < 45 ? "just now" : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`;
};

export function LiveBid({ listingId, priceCents, title, campusSlug }: { listingId: string; priceCents: number; title: string; campusSlug?: string }) {
  const seedKey = `${campusSlug ?? "ua"}:${listingId}`;
  const [mode, setMode] = useState<"loading" | "live" | "mock">("loading");
  const [view, setView] = useState<{ auction: Auction; bids: Bid[] } | null>(null);
  const [now, setNow] = useState(0);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<"leading" | "outbid" | null>(null);
  const [extended, setExtended] = useState(false);
  const mock = useRef<Mock | null>(null);
  const rivals = useRef({ counters: 0, ambient: 0, next: 0 });
  const iBid = useRef(false);
  const wasLeading = useRef(false);

  const apply = useCallback((v: { auction: Auction; bids: Bid[] }) => {
    setView(v);
    if (iBid.current) {
      if (v.auction.leading && !wasLeading.current) setFlash("leading");
      if (!v.auction.leading && wasLeading.current) setFlash("outbid");
    }
    wasLeading.current = v.auction.leading;
    if (v.bids.some((b) => b.bidder === "You")) iBid.current = true;
  }, []);

  // Mount: try live, fall back to mock. Times are computed here, after hydration.
  useEffect(() => {
    let alive = true;
    const t0 = Date.now();
    // A new listing in the same instance (client navigation) starts clean.
    iBid.current = false;
    wasLeading.current = false;
    rivals.current = { counters: 0, ambient: 0, next: 0 };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(t0);
    setError(null);
    setExtended(false);
    setValue("");
    setFlash(null);
    const fallBack = () => {
      if (!alive) return;
      mock.current = seedMock(seedKey, listingId, priceCents, t0);
      rivals.current.next = t0 + 6000 + Math.random() * 6000;
      setMode("mock");
      apply(mockView(listingId, mock.current, t0));
    };
    if (API && hasSession())
      bidApi(`/api/listings/${encodeURIComponent(listingId)}/bids`)
        .then((v) => {
          if (!alive) return;
          setMode("live");
          apply(v);
        })
        .catch(fallBack);
    else fallBack();
    return () => {
      alive = false;
    };
  }, [listingId, priceCents, seedKey, apply]);

  // Clock + rivals (mock) + polling (live).
  useEffect(() => {
    if (mode === "loading") return;
    let lastPoll = Date.now();
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (mode === "live" && n - lastPoll > 5000) {
        lastPoll = n;
        bidApi(`/api/listings/${encodeURIComponent(listingId)}/bids`).then(apply).catch(() => {});
      }
      const m = mock.current;
      const r = rivals.current;
      if (mode !== "mock" || !m || n < r.next || n >= m.endsAt) return;
      r.next = n + 6000 + Math.random() * 6000;
      const leading = m.bids[0]?.who === "me";
      // Rivals answer your first few bids, and now and then bid before you've joined.
      const go = leading ? r.counters < 3 && Math.random() < 0.8 : !iBid.current && r.ambient < 2 && Math.random() < 0.45;
      if (!go) return;
      if (leading) r.counters++;
      else r.ambient++;
      const high = m.bids[0]?.amountCents ?? null;
      const amount = minNextCents(m.startCents, high) + (Math.random() < 0.3 ? 500 : 0);
      const pool = ["r1", "r2", "r3", "r4"].filter((p) => p !== m.bids[0]?.who); // nobody outbids themselves
      const who = pool[Math.floor(Math.random() * pool.length)];
      if (m.endsAt - n < ANTI_SNIPE_MS) m.endsAt = n + ANTI_SNIPE_MS;
      m.bids.unshift({ amountCents: amount, at: n, who });
      apply(mockView(listingId, m, n));
    }, 1000);
    return () => clearInterval(t);
  }, [mode, listingId, apply]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2400);
    return () => clearTimeout(t);
  }, [flash]);

  const place = async (cents: number) => {
    if (!view || busy) return;
    const a = view.auction;
    if (a.ended) return setError("Bidding has ended.");
    if (!Number.isFinite(cents) || cents < a.minNextCents) return setError(`Bid ${dollars(a.minNextCents)} or more.`);
    setError(null);
    iBid.current = true;
    const before = Date.parse(a.endsAt);
    if (mode === "live") {
      setBusy(true);
      try {
        const v = await bidApi(`/api/listings/${encodeURIComponent(listingId)}/bids`, { method: "POST", body: { amountCents: cents } });
        setExtended(Date.parse(v.auction.endsAt) > before);
        apply(v);
        setValue("");
      } catch (e) {
        setError(e instanceof BidError ? e.message : "Couldn't place that bid. Try again.");
        // Someone got in first or the clock ran out: refresh the minimum and the clock.
        if (e instanceof BidError && (e.code === "bid_too_low" || e.code === "auction_ended" || e.code === "not_an_auction"))
          bidApi(`/api/listings/${encodeURIComponent(listingId)}/bids`).then(apply).catch(() => {});
      } finally {
        setBusy(false);
      }
      return;
    }
    const m = mock.current!;
    const n = clockMs();
    if (m.endsAt - n < ANTI_SNIPE_MS) {
      m.endsAt = n + ANTI_SNIPE_MS;
      setExtended(true);
    }
    m.bids.unshift({ amountCents: cents, at: n, who: "me" });
    rivals.current.next = n + rivalDelayMs();
    apply(mockView(listingId, m, n));
    setValue("");
  };

  // Before mount: same shape, no times (nothing time-based renders on the server).
  const seeded = mode === "loading" ? mockView(listingId, seedMock(seedKey, listingId, priceCents, 0), 0) : null;
  const v = view ?? seeded!;
  const a = v.auction;
  const left = now ? Date.parse(a.endsAt) - now : null;
  const ended = a.ended || (left != null && left <= 0);
  const closing = left != null && left > 0 && left < 10 * 60_000;
  const chips = [a.minNextCents, a.minNextCents + 500, a.minNextCents + 1000];
  // Leading also counts: in live mode your bid can scroll out of the latest 20.
  const youBid = a.leading || v.bids.some((b) => b.bidder === "You");

  return (
    <section aria-label={`Live bidding on ${title}`} className="rounded-[4px] border-2 border-current p-[clamp(20px,2.4vw,32px)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="stamp">
          <span className="stamp-dot animate-pulse motion-reduce:animate-none" /> Live bidding
        </span>
        <p className={`text-[14px] font-semibold ${closing ? "" : "muted"}`}>
          {ended ? "Bidding closed" : left == null ? "Ends in --:--:--" : <>Ends in <span className="num" role="timer">{formatLeft(left)}</span></>}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <p className="muted text-[14px] font-semibold">{a.highCents == null ? "Starting bid" : ended ? "Winning bid" : "Current high bid"}</p>
          <p key={a.highCents ?? 0} className="display num mt-1 animate-[rise-in_0.45s_var(--ease-out-expo)] text-[clamp(3rem,6vw,4.5rem)] motion-reduce:animate-none">
            {dollars(a.highCents ?? a.startCents)}
          </p>
        </div>
        <p className="num pb-2 text-[15px] font-semibold">
          {a.bidCount} {a.bidCount === 1 ? "bid" : "bids"} · started at {dollars(a.startCents)}
        </p>
      </div>

      {youBid && !ended && (
        <div
          key={`${a.leading}-${a.bidCount}`}
          role="status"
          className={`mt-5 flex items-center gap-2 rounded-[4px] p-4 text-[16px] font-bold ${a.leading ? "field" : "bg-ink text-paper"} ${flash ? "animate-[rise-in_0.4s_var(--ease-out-expo)] motion-reduce:animate-none" : ""}`}
        >
          {a.leading ? <Check width={20} height={20} strokeWidth={3} /> : <Alert width={20} height={20} />}
          {a.leading ? "You're the high bidder." : `You've been outbid. Bid ${dollars(a.minNextCents)} to retake the lead.`}
        </div>
      )}
      {ended && youBid && (
        <p role="status" className={`mt-5 rounded-[4px] p-4 text-[16px] font-bold ${a.leading ? "field" : "bg-ink text-paper"}`}>
          {a.leading ? `You won at ${dollars(a.highCents!)}. We'll set up the handoff.` : "Someone outbid you at the close. You weren't charged."}
        </p>
      )}

      {!ended && (
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            place(Math.round(Number(value) * 100));
          }}
        >
          <p className="text-[14px] font-semibold">Quick bid</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {chips.map((c, i) => (
              <button key={i} type="button" className="chip num" disabled={busy || mode === "loading"} onClick={() => place(c)}>
                {dollars(c)}
                {i > 0 && <span className="muted text-[12px]">+{i === 1 ? "$5" : "$10"}</span>}
              </button>
            ))}
          </div>
          <label htmlFor={`bid-${listingId}`} className="mt-5 block text-[14px] font-semibold">
            Or enter your bid ({dollars(a.minNextCents)} or more)
          </label>
          <div className="mt-2 flex flex-wrap gap-3">
            <div className="flex h-[52px] items-center rounded-full border-2 border-current px-5">
              <span className="display text-[28px]">$</span>
              <input
                id={`bid-${listingId}`}
                inputMode="numeric"
                placeholder={String(Math.round(a.minNextCents / 100))}
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
                className="display num w-24 bg-transparent pl-1 text-[28px] text-current outline-none placeholder:opacity-35"
                aria-describedby={`bid-help-${listingId}`}
              />
            </div>
            <button type="submit" className="pill pill-ink" disabled={busy || mode === "loading" || !value}>
              {busy ? "Placing bid…" : "Place bid"}
            </button>
          </div>
          <p id={`bid-help-${listingId}`} className="mt-3 flex min-h-6 items-center gap-2 text-[15px] font-semibold" role="status">
            {error ? (
              <>
                <Alert width={20} height={20} /> {error}
              </>
            ) : extended ? (
              "Late bid: the clock moved to 2 minutes so everyone gets a fair last look."
            ) : null}
          </p>
        </form>
      )}

      <div className="mt-6 border-t border-[color-mix(in_srgb,currentColor_20%,transparent)] pt-4">
        <p className="text-[14px] font-semibold">Bid history</p>
        {v.bids.length === 0 ? (
          <p className="muted mt-2 text-[15px]">No bids yet. Be the first.</p>
        ) : (
          <ol className="mt-2 grid gap-1">
            {v.bids.slice(0, 8).map((b, i) => (
              <li
                key={`${b.at}-${b.amountCents}`}
                className={`flex items-baseline justify-between gap-4 py-1 text-[15px] ${i === 0 ? "font-bold" : "muted font-semibold"} ${i === 0 && now ? "animate-[rise-in_0.4s_var(--ease-out-expo)] motion-reduce:animate-none" : ""}`}
              >
                <span>
                  {b.bidder}
                  {now ? <span className="muted ml-2 text-[13px] font-semibold">{ago(b.at, now)}</span> : null}
                </span>
                <span className="num">{dollars(b.amountCents)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <ul className="muted mt-5 grid gap-1.5 text-[13px] font-semibold">
        <li className="flex gap-2">
          <Lock width={14} height={14} className="mt-0.5 shrink-0" /> Bidders stay anonymous. You see &ldquo;Bidder 2&rdquo;, never a name.
        </li>
        <li className="flex gap-2">
          <Check width={14} height={14} className="mt-0.5 shrink-0" /> No sniping: a bid in the last 2 minutes resets the clock to 2 minutes.
        </li>
        <li className="flex gap-2">
          <Check width={14} height={14} className="mt-0.5 shrink-0" /> Bids are binding. You&apos;re only charged if you win, plus a small buyer fee (5% + $0.50). Sellers pay 0%.
        </li>
      </ul>
    </section>
  );
}
