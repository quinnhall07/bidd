"use client";
// Sealed-bid drops: one hidden bid per member, raisable until close. Top N bids win.
// rule=uniform: every winner pays the lowest winning bid. rule=first: each winner pays their own bid.
// Mock: the bid is kept in localStorage per drop (read after mount); the lab's `bid` switch still shows each outcome.
// This is NOT live bidding: there is no visible high bid. Live, open bidding is for resale listings (live-bid.tsx).
import Link from "next/link";
import { useEffect, useState } from "react";
import { buyerFee, money } from "@/lib/format";
import type { DropPhase } from "@/lib/types";
import { Alert, Bell, Check, Lock } from "./icons";

const dollars = (cents: number) => `$${Math.round(cents / 100)}`;

// ---------------------------------------------------------------- persisted bid + shared bid count

const key = (dropId: string) => `bidd:sealed:${dropId}`;
const readBid = (dropId: string) => {
  try {
    const v = Number(window.localStorage.getItem(key(dropId)));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
};
const writeBid = (dropId: string, cents: number) => {
  try {
    window.localStorage.setItem(key(dropId), String(cents));
  } catch {
    /* blocked storage: the bid just won't survive a reload */
  }
};

// One count per drop, shared by every component showing it, so the header and the bid box tick together.
type CountStore = { extra: number; mine: boolean; subs: Set<() => void>; timer: ReturnType<typeof setTimeout> | null };
const stores = new Map<string, CountStore>();
const storeFor = (dropId: string) => {
  let s = stores.get(dropId);
  if (!s) stores.set(dropId, (s = { extra: 0, mine: false, subs: new Set(), timer: null }));
  return s;
};
const emit = (s: CountStore) => s.subs.forEach((f) => f());
const markMine = (dropId: string) => {
  const s = storeFor(dropId);
  if (!s.mine) {
    s.mine = true;
    emit(s);
  }
};

/** Sealed bid count that ticks up while bidding is open (other members bidding) and counts your bid once. */
export function useSealedCount(dropId: string, base: number, live: boolean) {
  const [, force] = useState(0);
  useEffect(() => {
    const s = storeFor(dropId);
    if (readBid(dropId)) s.mine = true;
    const f = () => force((n) => n + 1);
    s.subs.add(f);
    f();
    const tick = () => {
      s.timer = setTimeout(() => {
        if (s.extra < 6 && Math.random() < 0.55) {
          s.extra++;
          emit(s);
        }
        tick();
      }, 8000 + Math.random() * 8000);
    };
    if (live && !s.timer) tick();
    return () => {
      s.subs.delete(f);
      if (s.subs.size === 0 && s.timer) {
        clearTimeout(s.timer);
        s.timer = null;
      }
    };
  }, [dropId, live]);
  const s = stores.get(dropId);
  return base + (s ? s.extra + (s.mine ? 1 : 0) : 0);
}

export function SealedBidCount({ dropId, base, live }: { dropId: string; base: number; live: boolean }) {
  const n = useSealedCount(dropId, base, live);
  return (
    <span key={n} className="num inline-block animate-[rise-in_0.4s_var(--ease-out-expo)] motion-reduce:animate-none">
      {n} sealed bids
    </span>
  );
}

export function SealedBid({
  dropId,
  phase,
  pieces,
  minCents,
  bidCount,
  rule,
  state,
  myBidCents,
  result,
  chapter,
  closetHref,
}: {
  dropId: string;
  phase: DropPhase;
  pieces: number;
  minCents: number;
  bidCount: number;
  rule: "uniform" | "first";
  state: "none" | "placed" | "won" | "lost";
  myBidCents: number;
  result: { clearing: number; top: number; rank: number; pays: number };
  chapter: string;
  closetHref: string;
}) {
  const [placed, setPlaced] = useState<number | null>(state === "placed" ? myBidCents : null);
  const [value, setValue] = useState(String(Math.round(myBidCents / 100)));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminded, setReminded] = useState(false);
  const [justSealed, setJustSealed] = useState(false);
  const open = phase === "live" || phase === "low" || phase === "soldout";
  const count = useSealedCount(dropId, bidCount, open);

  // After mount: restore a bid you placed earlier on this drop (the lab's "placed" state still wins).
  useEffect(() => {
    if (!open || state !== "none") return;
    const saved = readBid(dropId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setPlaced(saved), setValue(String(Math.round(saved / 100)));
  }, [dropId, open, state]);
  const ruleLine =
    rule === "uniform"
      ? `Top ${pieces} bids win, and every winner pays the same price: the lowest winning bid.`
      : `Top ${pieces} bids win, and each winner pays exactly what they bid.`;

  const submit = () => {
    const cents = Math.round(Number(value) * 100);
    if (!Number.isFinite(cents) || cents < minCents) return setError(`Bids start at ${dollars(minCents)}. Enter ${dollars(minCents)} or more.`);
    if (placed && cents <= placed) return setError(`You can only raise a sealed bid. Enter more than ${dollars(placed)}.`);
    setError(null);
    setPlaced(cents);
    setEditing(false);
    setJustSealed(true);
    writeBid(dropId, cents);
    markMine(dropId);
  };

  const rules = (
    <ul className="field-soft mt-5 grid gap-1.5 text-[14px] font-semibold">
      <li className="flex gap-2">
        <Lock width={16} height={16} className="mt-0.5 shrink-0" /> Bids are sealed: nobody sees anyone else&apos;s bid, not even the chapter.
      </li>
      <li className="flex gap-2">
        <Check width={16} height={16} className="mt-0.5 shrink-0" /> {ruleLine}
      </li>
      <li className="flex gap-2">
        <Check width={16} height={16} className="mt-0.5 shrink-0" /> You&apos;re only charged if you win, plus a small buyer fee (5% + $0.50) on the winning bid.
      </li>
    </ul>
  );

  if (phase === "upcoming")
    return (
      <div>
        <p className="text-[17px] font-semibold">
          {pieces} pieces. Bids start at {dollars(minCents)}.
        </p>
        <button type="button" className="pill pill-flip mt-5" onClick={() => setReminded(true)} aria-pressed={reminded}>
          {reminded ? <Check width={18} height={18} strokeWidth={3} /> : <Bell width={18} height={18} />} {reminded ? "We'll remind you when bidding opens" : "Remind me"}
        </button>
        {rules}
      </div>
    );

  if (phase === "ended") {
    const outcome = state === "won" || state === "lost" ? state : null;
    return (
      <div role="status">
        {outcome === "won" ? (
          <div className="rounded-[4px] bg-paper p-5 text-ink">
            <p className="flex items-center gap-2 text-[18px] font-bold">
              <Check width={20} height={20} strokeWidth={3} /> You won piece #{result.rank} of {pieces}.
            </p>
            <p className="muted mt-1 text-[15px]">
              You bid {dollars(myBidCents)} and pay <b className="text-ink">{dollars(result.pays)}</b>
              {rule === "uniform" ? ", the lowest winning bid" : ""}, plus a {money(buyerFee(result.pays), true)} buyer fee. +40 pts for {chapter} in the Fall Cup.
            </p>
          </div>
        ) : outcome === "lost" ? (
          <div className="rounded-[4px] bg-paper p-5 text-ink">
            <p className="flex items-center gap-2 text-[18px] font-bold">
              <Alert width={20} height={20} /> Your {dollars(myBidCents)} bid didn&apos;t make the top {pieces}.
            </p>
            <p className="muted mt-1 text-[15px]">The lowest winning bid was {dollars(result.clearing)}. You weren&apos;t charged.</p>
          </div>
        ) : (
          <p className="text-[17px] leading-relaxed">
            Bidding closed with {count} sealed bids for {pieces} pieces. Winning bids ran from {dollars(result.clearing)} to {dollars(result.top)}.
          </p>
        )}
        <Link href={closetHref} className="pill pill-flip mt-6">
          Shop {chapter}&apos;s closet
        </Link>
      </div>
    );
  }

  return (
    <div>
      {placed && !editing ? (
        <div
          key={placed}
          className={`rounded-[4px] bg-[var(--campus-ink)] p-5 text-[var(--campus)] ${justSealed ? "animate-[rise-in_0.45s_var(--ease-out-expo)] motion-reduce:animate-none" : ""}`}
          role="status"
        >
          {justSealed && (
            <p className="mb-3 flex items-center gap-2 text-[13px] font-bold tracking-[0.06em] uppercase">
              <Check width={16} height={16} strokeWidth={3} /> Bid received
            </p>
          )}
          <p className="flex items-center gap-2 text-[18px] font-bold">
            <Lock width={20} height={20} /> Your sealed bid: <span className="num">{dollars(placed)}</span>
          </p>
          <p className="mt-1 text-[15px] font-semibold opacity-85">Your bid is sealed. Nobody, not even the chapter, can see it.</p>
          <p className="num mt-3 text-[14px] font-semibold opacity-85">
            {count} sealed bids for {pieces} {pieces === 1 ? "piece" : "pieces"} so far. You can raise yours until bidding closes.
          </p>
          <button type="button" className="mt-4 text-[15px] font-bold underline underline-offset-4" onClick={() => setEditing(true)}>
            Raise my bid
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor={`sealed-bid-${dropId}`} className="text-[14px] font-semibold">
            {placed ? `Raise your bid (now ${dollars(placed)})` : `Your sealed bid (${dollars(minCents)} minimum)`}
          </label>
          <div className="mt-2 flex flex-wrap gap-3">
            <div className="flex h-[52px] items-center rounded-full border-2 border-current px-5">
              <span className="display text-[28px]">$</span>
              <input
                id={`sealed-bid-${dropId}`}
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
                className="display num w-24 bg-transparent pl-1 text-[28px] text-current outline-none"
                aria-describedby={`sealed-bid-help-${dropId}`}
              />
            </div>
            <button type="submit" className="pill pill-flip">{placed ? "Raise sealed bid" : "Place sealed bid"}</button>
          </div>
          <p id={`sealed-bid-help-${dropId}`} className="mt-3 flex min-h-6 items-center gap-2 text-[15px] font-semibold" role="status">
            {error && (
              <>
                <Alert width={20} height={20} /> {error}
              </>
            )}
          </p>
        </form>
      )}
      {rules}
    </div>
  );
}
