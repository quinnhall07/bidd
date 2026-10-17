// Demo route: live ascending bidding on a resale listing (components/live-bid.tsx), next to the auction-listing
// badge. Uses the campus feed (?school=<slug>); ?id=<listingId> picks a listing. Mock bidding unless the live API is on.
import Image from "next/image";
import Link from "next/link";
import { getFeed } from "@/lib/data";
import { money } from "@/lib/format";
import { one, setup } from "@/lib/page";
import { withLab } from "@/lib/lab";
import { Shell } from "@/components/shell";
import { BidBadge, LiveBid } from "@/components/live-bid";
import { isAuctionListing } from "@/lib/auction";

export default async function BidDemoPage({ searchParams }: PageProps<"/bid-demo">) {
  const { params, lab, campuses, campus, cid } = await setup(searchParams);
  const feed = (await getFeed(cid)).filter((l) => l.status === "active" && !l.drop_id);
  const want = one(params.id);
  const listing = feed.find((l) => l.id === want) ?? feed.find((l) => isAuctionListing(l.id)) ?? feed[0];
  const auctions = feed.filter((l) => isAuctionListing(l.id)).slice(0, 4);

  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav="item">
      <div className="column py-10 md:py-14">
        <span className="stamp">
          <span className="stamp-dot" /> Resale · live bidding
        </span>
        {!listing ? (
          <p className="mt-6 text-[17px]">No active resale listings on this campus yet.</p>
        ) : (
          <div className="mt-6 grid gap-10 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-6">
              <div className="media relative aspect-square overflow-hidden bg-[var(--gray-50)]">
                {listing.photo_urls[0] && <Image src={listing.photo_urls[0]} alt={listing.title} fill priority sizes="(min-width: 760px) 50vw, 100vw" className="object-cover" />}
                <BidBadge listingId={listing.id} className="absolute top-3 left-3" />
              </div>
              <h1 className="display mt-6 text-[clamp(2.5rem,5vw,4rem)]">{listing.title}</h1>
              <p className="muted mt-2 text-[15px] font-semibold">
                {listing.brand} · Size {listing.size} · {listing.condition} · Buy-now value {money(listing.price_cents)}
              </p>
            </div>
            <div className="md:col-span-6">
              <LiveBid key={listing.id} listingId={listing.id} priceCents={listing.price_cents} title={listing.title} campusSlug={cid} />
            </div>
          </div>
        )}
        {auctions.length > 1 && (
          <section className="mt-14 border-t-2 border-ink pt-6">
            <h2 className="display text-[clamp(2rem,3.5vw,3rem)]">More live auctions.</h2>
            <ul className="mt-5 flex flex-wrap gap-3">
              {auctions.map((l) => (
                <li key={l.id}>
                  <Link href={withLab("/bid-demo", lab, { id: l.id })} className="chip" aria-current={l.id === listing?.id ? "true" : undefined}>
                    {l.title} <BidBadge listingId={l.id} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Shell>
  );
}
