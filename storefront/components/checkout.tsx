"use client";
// Buy → checkout sheet: price, buyer fee (5% + $0.50, display only), an Exchange Spot, and the pilot's
// payment notice. Confirm reserves the piece (live: POST /api/checkout; otherwise a mock order) and
// opens the one-time QR at /orders/[id]. `liveOnly` (a real listing from the API, /l/[id]) never falls back to a mock
// order: a failed live checkout says why instead.
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import { withLab, type Lab } from "@/lib/lab";
import { Alert, Check, Close, Pin } from "./icons";
import { LiveError, PAYMENT_NOTICE, exchangeSpots, isLive, livePost, mockOrderId, type CheckoutResponse } from "./checkout-live";

type Item = { id: string; title: string; size: string; condition: string; photo: string; color: string; priceCents: number; feeCents: number };

export function CheckoutButton({
  item,
  lab,
  campusSlug,
  campusName,
  liveOnly = false,
}: {
  item: Item;
  lab: Lab;
  campusSlug: string | null;
  campusName: string | null;
  liveOnly?: boolean;
}) {
  const router = useRouter();
  const spots = exchangeSpots(campusSlug, campusName);
  const [open, setOpen] = useState(false);
  const [spot, setSpot] = useState(spots[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = item.priceCents + item.feeCents;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && setOpen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy]);

  async function confirm() {
    setBusy(true);
    setError(null);
    let orderId = mockOrderId();
    let live = false;
    if (isLive()) {
      try {
        const { order } = await livePost<CheckoutResponse>("/api/checkout", { listingId: item.id });
        orderId = order.id;
        live = true;
      } catch (e) {
        // A real "someone got there first" is worth saying; anything else falls back to the mock order.
        if (e instanceof LiveError && e.status === 409) {
          setError(e.code === "cannot_buy_own_listing" ? "This one's in your closet." : "Someone already claimed this item.");
          setBusy(false);
          return;
        }
        // A real listing has no mock stand-in: show the API's sentence (or a network one) and let them retry.
        if (liveOnly) {
          setError(e instanceof LiveError && e.status > 0 ? e.message : "Couldn't reach Bidd. Check your connection and try again.");
          setBusy(false);
          return;
        }
      }
    }
    if (liveOnly && !live) {
      setError("Couldn't reserve it. Try again.");
      setBusy(false);
      return;
    }
    router.push(withLab(`/orders/${orderId}`, lab, { listing: item.id, spot, live: live ? "1" : null }));
  }

  return (
    <>
      <button type="button" className="pill pill-ink" onClick={() => setOpen(true)}>
        Buy
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink/45 md:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-title"
          onClick={(e) => e.target === e.currentTarget && !busy && setOpen(false)}
        >
          <div className="sheet max-h-[92dvh] w-full overflow-y-auto rounded-t-[4px] bg-paper pb-[max(28px,env(safe-area-inset-bottom))] md:max-w-[520px] md:rounded-[4px] md:pb-7">
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-[var(--gray-200)] md:hidden" />
            <div className="px-5 pt-5 md:px-7 md:pt-7">
              <div className="flex items-start justify-between gap-4">
                <h2 id="checkout-title" className="display text-[clamp(2rem,5vw,2.5rem)] leading-none">
                  Meet. Pay. Done.
                </h2>
                <button type="button" className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-ink" aria-label="Close checkout" onClick={() => !busy && setOpen(false)}>
                  <Close width={18} height={18} />
                </button>
              </div>

              <div className="mt-5 flex items-center gap-4">
                <div className="photo relative size-16 shrink-0 overflow-hidden rounded-[4px]" style={{ backgroundColor: item.color }}>
                  {/* Live photos are short-lived signed URLs from another host: served as-is, not through the optimizer. */}
                  {item.photo && <Image src={item.photo} alt="" fill sizes="64px" unoptimized={/^https?:\/\//.test(item.photo)} className="object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold">{item.title}</p>
                  <p className="muted text-[14px]">
                    Size {item.size} • {item.condition[0].toUpperCase() + item.condition.slice(1)}
                  </p>
                </div>
              </div>

              <dl className="num mt-5 grid gap-2 border-t-2 border-ink pt-4 text-[15px]">
                <div className="flex justify-between">
                  <dt className="muted">Item</dt>
                  <dd>{money(item.priceCents, true)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="muted">{item.feeCents ? "Buyer fee (5% + $0.50)" : "Buyer fee"}</dt>
                  <dd>{item.feeCents ? money(item.feeCents, true) : "Free on drops"}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-[var(--gray-200)] pt-3">
                  <dt className="font-semibold">You pay at the meetup</dt>
                  <dd className="display text-[28px] leading-none">{money(total, true)}</dd>
                </div>
              </dl>

              <fieldset className="mt-6">
                <legend className="text-[15px] font-semibold">Pick an Exchange Spot</legend>
                <div className="mt-2 grid gap-2">
                  {spots.map((s) => {
                    const on = s.id === spot;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setSpot(s.id)}
                        className={`flex items-center gap-3 rounded-[4px] p-3.5 text-left transition-colors ${on ? "border-2 border-ink" : "border-2 border-[var(--gray-200)] hover:border-ink"}`}
                      >
                        <span className={`grid size-9 shrink-0 place-items-center rounded-full ${on ? "field" : "bg-[var(--gray-100)]"}`}>
                          {on ? <Check width={18} height={18} strokeWidth={3} /> : <Pin width={18} height={18} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold">{s.name}</span>
                          <span className="muted block text-[13.5px]">{s.note}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <p className="mt-5 flex gap-2.5 rounded-[4px] bg-[var(--gray-50)] p-3.5 text-[14.5px] font-semibold">
                <Alert width={20} height={20} className="mt-px shrink-0" />
                {PAYMENT_NOTICE}
              </p>

              <button type="button" className="pill pill-ink mt-5 w-full" disabled={busy} onClick={confirm}>
                {busy ? "Reserving…" : `Confirm meetup · ${money(total, true)}`}
              </button>
              <p className="muted mt-3 text-center text-[13.5px]">You&apos;ll get a one-time QR. The seller scans it at the meetup.</p>
              <p className="mt-2 flex min-h-5 items-center justify-center gap-2 text-[14px] font-semibold" role="status">
                {error && (
                  <>
                    <Alert width={18} height={18} /> {error}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
