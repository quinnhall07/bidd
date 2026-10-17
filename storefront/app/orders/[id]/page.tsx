// Order page: the reserved piece, where to meet, the pilot's payment notice, and the buyer's one-time
// handoff QR. The seller's scan completes the order and puts Cup points on the seller's chapter.
import Image from "next/image";
import Link from "next/link";
import { getListing } from "@/lib/data";
import { withLab } from "@/lib/lab";
import { buyerFee, money } from "@/lib/format";
import { chapterName, one, setup } from "@/lib/page";
import { Shell } from "@/components/shell";
import { HandoffPanel } from "@/components/handoff";
import { PAYMENT_NOTICE, exchangeSpots, findSpot } from "@/components/checkout-live";
import { Alert, Pin } from "@/components/icons";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { params: q, lab, campuses, campus, cid } = await setup(searchParams);
  const listingId = one(q.listing);
  const data = listingId ? await getListing(cid, listingId) : null;
  const l = data?.listing ?? null;
  const spot = findSpot(exchangeSpots(campus?.slug, campus?.name), one(q.spot));
  const fee = l && !l.drop_id ? buyerFee(l.price_cents) : 0;
  const chapter = data?.chapter ? chapterName(data.chapter, lab) : campus ? `${campus.name}'s chapters` : "the seller's chapter";
  const shortId = id.replace(/^m-/, "").slice(-6).toUpperCase();

  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav="item">
      <div className="column pt-8 md:pt-12">
        <p className="label muted">Order #{shortId}</p>
        <h1 className="display mt-2 text-[clamp(3rem,7vw,5.5rem)] leading-[0.9]">Meet up.</h1>
      </div>

      <div className="column grid gap-10 pt-8 pb-24 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-7">
          <HandoffPanel
            orderId={id}
            live={one(q.live) === "1"}
            spot={spot.name}
            chapter={chapter}
            cupHref={withLab("/cup", lab)}
            shopHref={withLab("/", lab)}
          />
        </div>

        <aside className="md:col-span-5">
          <div className="border-t-2 border-ink pt-6">
            <p className="text-[15px] font-semibold">Exchange Spot</p>
            <p className="mt-2 flex items-center gap-2 text-[clamp(1.25rem,2vw,1.5rem)] font-semibold">
              <Pin width={22} height={22} /> {spot.name}
            </p>
            <p className="muted mt-1 text-[15px]">{spot.note}. Agree on a time with the seller, then show the QR.</p>
          </div>

          {l && (
            <Link href={withLab(`/item/${l.id}`, lab)} className="mt-8 flex items-center gap-4 rounded-[4px] border border-[var(--gray-100)] p-4 transition-colors hover:bg-[var(--gray-50)]">
              <span className="photo relative size-20 shrink-0 overflow-hidden rounded-[4px]" style={{ backgroundColor: l.dominant_color }}>
                <Image src={l.photo_urls[0]} alt="" fill sizes="80px" className="object-cover" />
              </span>
              <span className="min-w-0">
                <span className="label muted block">{l.brand && l.brand !== "Other" ? `${l.brand} • ${l.category}` : l.category}</span>
                <span className="mt-1 block truncate text-[16px] font-semibold">{l.title}</span>
                <span className="muted block text-[14px]">Size {l.size}</span>
              </span>
            </Link>
          )}

          {l && (
            <dl className="num mt-6 grid gap-2 text-[15px]">
              <div className="flex justify-between">
                <dt className="muted">Item</dt>
                <dd>{money(l.price_cents, true)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="muted">{fee ? "Buyer fee (5% + $0.50)" : "Buyer fee"}</dt>
                <dd>{fee ? money(fee, true) : "Free on drops"}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t-2 border-ink pt-3">
                <dt className="font-semibold">Pay at the meetup</dt>
                <dd className="display text-[32px] leading-none">{money(l.price_cents + fee, true)}</dd>
              </div>
            </dl>
          )}

          <p className="mt-6 flex gap-2.5 rounded-[4px] bg-[var(--gray-50)] p-4 text-[15px] font-semibold">
            <Alert width={20} height={20} className="mt-px shrink-0" />
            {PAYMENT_NOTICE}
          </p>
          <p className="muted mt-4 text-[14px]">Every QR handoff puts points on the seller&apos;s chapter in the Closet Cup.</p>
        </aside>
      </div>
    </Shell>
  );
}
