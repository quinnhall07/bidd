// Depop's card, as-is: photo, then brand / size / price, left-aligned, heart top-right on the photo.
import Image from "next/image";
import Link from "next/link";
import { withLab, type Lab } from "@/lib/lab";
import { buyerFee, money } from "@/lib/format";
import type { Listing } from "@/lib/types";
import { isAuctionListing } from "@/lib/auction";
import { SaveHeart } from "./save-heart";
import { BidBadge } from "./live-bid";

const brandLine = (l: Listing) => (l.brand && l.brand !== "Other" ? l.brand : l.category[0].toUpperCase() + l.category.slice(1));

export function ListingCard({ listing: l, lab, priority }: { listing: Listing; lab: Lab; priority?: boolean }) {
  const sold = l.status === "sold";
  const allIn = lab.v === "b";
  return (
    <div className="group relative">
      <Link href={withLab(`/item/${l.id}`, lab)} className="block" aria-label={`${l.title}, ${money(l.price_cents)}${sold ? ", sold" : ""}`}>
        <div className="photo relative overflow-hidden" style={{ backgroundColor: l.dominant_color ?? "var(--gray-50)" }}>
          <Image
            src={l.photo_urls[0]}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 260px, (min-width: 1024px) 25vw, (min-width: 760px) 33vw, 50vw"
            className={`object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03] ${sold ? "grayscale-[60%]" : ""}`}
          />
          {!sold && !l.drop_id && isAuctionListing(l.id) && <BidBadge listingId={l.id} className="absolute bottom-2 left-2" />}
          {sold && (
            <>
              <span className="absolute inset-0 bg-paper/40" />
              <span className="display absolute bottom-0 left-0 bg-ink px-3 pt-1.5 pb-1 text-[22px] text-paper">Sold</span>
            </>
          )}
        </div>
        <div className="mt-2.5 grid gap-0.5 text-[14px] leading-snug">
          <p className="truncate font-semibold">{brandLine(l)}</p>
          <p className="muted truncate">{l.size}</p>
          <p className="num font-bold">
            {allIn ? money(l.price_cents + buyerFee(l.price_cents), true) : money(l.price_cents)}
            {allIn && <span className="muted ml-1.5 text-[12px] font-semibold">all-in</span>}
          </p>
        </div>
      </Link>
      {!sold && <SaveHeart className="absolute top-2 right-2" />}
    </div>
  );
}

export function ListingGrid({ listings, lab }: { listings: Listing[]; lab: Lab }) {
  return (
    <ul className="listing-grid grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-3 md:gap-x-4 md:gap-y-9 lg:grid-cols-4 xl:grid-cols-5">
      {listings.map((l, i) => (
        <li key={l.id} className="reveal">
          <ListingCard listing={l} lab={lab} priority={i < 5} />
        </li>
      ))}
    </ul>
  );
}

/** Loading: skeletons in the shape of the real grid. */
export function GridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <ul className="listing-grid grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-3 md:gap-x-4 md:gap-y-9 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true" aria-label="Loading listings">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="photo skeleton" />
          <div className="mt-2.5 grid gap-1.5">
            <div className="skeleton h-3.5 w-[62%] rounded-[2px]" />
            <div className="skeleton h-3.5 w-[28%] rounded-[2px]" />
            <div className="skeleton h-3.5 w-[22%] rounded-[2px]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
