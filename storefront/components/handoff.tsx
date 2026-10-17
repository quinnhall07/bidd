"use client";
// The buyer's side of the meetup: a one-time QR (15 minutes, refreshable), and a demo stand-in for the
// seller's scan. Live: POST /api/orders/:id/handoff-token and /api/handoffs/confirm. Otherwise, or when a
// live call fails, the code is minted locally so the demo never breaks.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Arrow, Check, Pin, Trophy } from "./icons";
import { HandoffQr } from "./handoff-qr";
import { HANDOFF_POINTS, isLive, isMockOrder, livePost, mockHandoff, type HandoffTokenResponse } from "./checkout-live";

const pad = (n: number) => String(n).padStart(2, "0");
const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

type Props = { orderId: string; live: boolean; spot: string; chapter: string; cupHref: string; shopHref: string };

export function HandoffPanel({ orderId, live, spot, chapter, cupHref, shopHref }: Props) {
  const apiOn = live && isLive() && !isMockOrder(orderId);
  const [code, setCode] = useState<HandoffTokenResponse | null>(null);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  // Each request gets a number; only the newest one may set the code (a new code revokes older ones,
  // and React's dev double-mount fires two requests that can land out of order).
  const latest = useRef(0);
  const alive = useRef(true);

  const issue = useCallback(async () => {
    const ticket = ++latest.current;
    let next: HandoffTokenResponse | null = null;
    if (apiOn) {
      try {
        next = await livePost<HandoffTokenResponse>(`/api/orders/${encodeURIComponent(orderId)}/handoff-token`);
      } catch {
        next = null;
      }
    }
    if (!alive.current || ticket !== latest.current) return;
    setCode(next ?? mockHandoff());
    setNow(Date.now());
  }, [orderId, apiOn]);

  useEffect(() => {
    alive.current = true;
    // Mint the code after hydration: it's random and single-use, so it never renders on the server.
    void issue();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, [issue]);

  const left = code ? Date.parse(code.expiresAt) - now : 0;
  const expired = Boolean(code) && left <= 0;

  async function sellerScan() {
    if (!code || expired) return;
    setBusy(true);
    if (apiOn) {
      try {
        await livePost("/api/handoffs/confirm", { token: code.qrPayload });
      } catch {
        // Live: only the seller's account can confirm, so never show a sale that didn't happen.
        if (!alive.current) return;
        setBusy(false);
        setScanError("Only the seller can confirm. Have them scan this code from their own Bidd account.");
        return;
      }
    } else {
      await new Promise((r) => setTimeout(r, 650));
    }
    if (!alive.current) return;
    setBusy(false);
    setConfirmed(true);
  }

  if (confirmed)
    return (
      <div className="field rounded-[4px] p-6 md:p-10" role="status">
        <span className="grid size-16 place-items-center rounded-full bg-[var(--campus-ink)] text-[var(--campus)]">
          <Check width={32} height={32} strokeWidth={3} />
        </span>
        <h2 className="display mt-6 text-[clamp(2.75rem,6vw,4.5rem)] leading-[0.9]">Handed off.</h2>
        <p className="mt-4 text-[clamp(1.05rem,1.6vw,1.25rem)] font-semibold">
          Handoff confirmed · +{HANDOFF_POINTS} points to {chapter} in the Closet Cup
        </p>
        <p className="field-soft mt-2 text-[15px]">The piece is marked sold. Enjoy it.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={cupHref} className="pill pill-flip">
            <Trophy width={18} height={18} /> See the Closet Cup
          </Link>
          <Link href={shopHref} className="pill pill-field">
            Keep shopping <Arrow width={18} height={18} />
          </Link>
        </div>
      </div>
    );

  return (
    <div className="rounded-[4px] border-2 border-ink p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-semibold">Show this to the seller</p>
        <span className="stamp text-ink">
          <span className="stamp-dot" /> Pending meetup
        </span>
      </div>

      <div className="relative mx-auto mt-5 aspect-square w-full max-w-[340px]">
        {code ? (
          <HandoffQr payload={code.qrPayload} dim={expired} className="size-full rounded-[4px]" />
        ) : (
          <div className="skeleton size-full rounded-[4px]" aria-label="Making your code" />
        )}
        {expired && (
          <div className="absolute inset-0 grid place-items-center">
            <button type="button" className="pill pill-ink" onClick={() => void issue()}>
              Refresh code
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label muted">{expired ? "Code expired" : "Expires in"}</p>
          <p className="display num text-[40px] leading-none" role="timer" aria-live="off">
            {code ? mmss(left) : "15:00"}
          </p>
        </div>
        <button type="button" className="pill pill-line pill-sm" disabled={!code} onClick={() => void issue()}>
          Refresh code
        </button>
      </div>
      <p className="muted mt-3 flex items-center gap-1.5 text-[14px]">
        <Pin width={16} height={16} /> {spot} · One use only. A new code cancels the old one.
      </p>
      {code && (
        <p className="mt-1 truncate font-mono text-[12px] text-[var(--gray-400,var(--gray-600))]" title={code.qrPayload}>
          {code.qrPayload}
        </p>
      )}

      <div className="mt-6 border-t-2 border-ink pt-5">
        <button type="button" className="pill pill-ink w-full" disabled={!code || expired || busy} onClick={sellerScan}>
          {busy ? "Confirming…" : "Seller: scan to confirm"}
        </button>
        {scanError ? (
          <p className="mt-2 text-center text-[13px] font-semibold" role="alert">
            {scanError}
          </p>
        ) : (
          <p className="muted mt-2 text-center text-[13px]">Demo: stands in for the seller&apos;s camera.</p>
        )}
      </div>
    </div>
  );
}
