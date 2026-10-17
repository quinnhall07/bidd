"use client";
// The piece and the price on /orders/[id] for an order from the live checkout (?live=1), where the mock data has no
// listing: GET /api/orders for the amounts and status, GET /api/listings/:id for the photo and size.
// Renders nothing until loaded, for mock orders, when signed out, or when a call fails.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getListing, getOrders, hasSession, isLive, type ListingDetail, type Order } from "@/lib/api";
import { money } from "@/lib/format";
import { withLab, type Lab } from "@/lib/lab";
import { sizeText } from "./live-feed";

export function LiveOrderSummary({ orderId, lab }: { orderId: string; lab: Lab }) {
  const [data, setData] = useState<{ order: Order; listing: ListingDetail | null } | null>(null);

  useEffect(() => {
    if (!isLive() || !hasSession() || orderId.startsWith("m-")) return;
    let alive = true;
    getOrders()
      .then(async (orders) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order) return;
        const listing = order.listing ? await getListing(order.listing.id).catch(() => null) : null;
        if (alive) setData({ order, listing });
      })
      .catch(() => {
        /* signed out, offline or API down: the page still shows the QR and the meetup */
      });
    return () => {
      alive = false;
    };
  }, [orderId]);

  if (!data) return null;
  const { order: o, listing: l } = data;

  return (
    <>
      {o.listing && (
        <Link
          href={withLab(`/l/${encodeURIComponent(o.listing.id)}`, lab)}
          className="mt-8 flex items-center gap-4 rounded-[4px] border border-[var(--gray-100)] p-4 transition-colors hover:bg-[var(--gray-50)]"
        >
          <span className="photo relative size-20 shrink-0 overflow-hidden rounded-[4px] bg-[var(--gray-50)]">
            {l?.coverUrl && <Image src={l.coverUrl} alt="" fill unoptimized sizes="80px" className="object-cover" />}
          </span>
          <span className="min-w-0">
            <span className="label muted block">{l?.brand?.trim() || "Campus resale"}</span>
            <span className="mt-1 block truncate text-[16px] font-semibold">{o.listing.title}</span>
            {l && <span className="muted block text-[14px]">Size {sizeText(l.size)}</span>}
          </span>
        </Link>
      )}

      <dl className="num mt-6 grid gap-2 text-[15px]">
        <div className="flex justify-between">
          <dt className="muted">Item</dt>
          <dd>{money(o.priceCents, true)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="muted">Buyer fee (5% + $0.50)</dt>
          <dd>{money(o.buyerFeeCents, true)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t-2 border-ink pt-3">
          <dt className="font-semibold">Pay at the meetup</dt>
          <dd className="display text-[32px] leading-none">{money(o.totalCents, true)}</dd>
        </div>
      </dl>

      {o.status !== "pending_meetup" && (
        <p className="mt-4 text-[15px] font-semibold" role="status">
          {o.status === "completed" ? "Handed off. This sale is complete." : "This order was cancelled. The piece is back on the feed."}
        </p>
      )}
    </>
  );
}
