// Drop page: every phase (upcoming, live, low stock, sold out, ended) on one campus field,
// for both pre-order drops and sealed-bid drops. The collab lockup names every party.
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCampus, getDrop } from "@/lib/data";
import { auctionResult, dropPhase, dropStock, raisedCents, withLab, withPhase } from "@/lib/lab";
import { date, dateTime, money } from "@/lib/format";
import { chapterName, setup } from "@/lib/page";
import { Shell } from "@/components/shell";
import { ListingGrid } from "@/components/listing";
import { DropClock, phaseLabel } from "@/components/drops";
import { DropBuy } from "@/components/drop-buy";
import { SealedBid, SealedBidCount } from "@/components/sealed-bid";
import { CollabLockup } from "@/components/collab";

const ALIAS: Record<string, string> = { demo: "bid-day", auction: "one-of-one" };

export default async function DropPage({ params, searchParams }: PageProps<"/drop/[id]">) {
  const { id } = await params;
  const { lab, campuses, campus, cid, now } = await setup(searchParams);
  const data = await getDrop(cid, ALIAS[id] ?? id);
  if (!data) notFound();
  const home = (await getCampus(cid))!;
  const drop = withPhase(data.drop, lab.drop, now);
  const { chapter, items } = data;
  const phase = dropPhase(drop, now);
  const { left, total } = dropStock(drop);
  const claimed = total - left;
  const name = chapterName(chapter, lab);
  const ended = phase === "ended";
  const others = items.slice(1);
  const auction = drop.auction;
  // Mock: the viewer's bid. Winning and losing bids sit either side of the clearing price.
  const preview = auction ? auctionResult(drop, lab.rule, 0) : null;
  const myBid = auction ? (lab.bid === "lost" ? Math.max(auction.min_bid_cents, preview!.clearing - 1200) : lab.bid === "won" ? preview!.clearing + 1800 : 8400) : 0;
  const result = auction ? auctionResult(drop, lab.rule, myBid) : null;

  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav="drop">
      <section className={ended ? "bg-ink text-paper" : "field"} data-ground={ended ? "dark" : undefined}>
        <div className="column grid gap-10 py-10 md:grid-cols-12 md:gap-12 md:py-14">
          <div className="media relative aspect-square overflow-hidden bg-black/10 md:col-span-6 md:self-start">
            <Image src={drop.photo_url} alt={drop.description} fill priority sizes="(min-width: 760px) 50vw, 100vw" className={`object-cover ${ended ? "grayscale-[70%]" : ""}`} />
            {auction && !ended && <span className="display absolute top-0 left-0 bg-ink px-4 pt-2 pb-1.5 text-[28px] text-paper">Sealed-bid drop</span>}
            {(phase === "soldout" || ended) && <span className="display absolute bottom-0 left-0 bg-ink px-4 pt-2 pb-1.5 text-[32px] text-paper">{ended ? (auction ? "Closed" : "Ended") : "Sold out"}</span>}
          </div>

          <div className="flex flex-col md:col-span-6">
            <span className="stamp w-fit">
              <span className="stamp-dot" /> {phaseLabel(drop, phase)}
            </span>
            <div className="mt-6">
              <CollabLockup drop={drop} chapter={chapter} campus={home} lab={lab} tone={ended ? "dark" : "field"} size={38} />
            </div>
            <h1 className="display jersey mt-7 text-[clamp(3.5rem,7.5vw,7rem)]">{drop.name}</h1>
            <p className={`${ended ? "muted" : "field-soft"} mt-4 max-w-[48ch] text-[17px] leading-relaxed`}>{drop.description}</p>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <DropClock drop={drop} phase={phase} now={now} big />
              <div className="text-right">
                {auction && <p className={`${ended ? "muted" : "field-soft"} text-[14px] font-semibold`}>{ended ? "Winning bids from" : "Bids from"}</p>}
                <p className="display num pb-1 text-[clamp(2.25rem,3.6vw,3.25rem)]">{money(auction && ended ? result!.clearing : drop.price_cents)}</p>
              </div>
            </div>

            {auction ? (
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-[color-mix(in_srgb,currentColor_25%,transparent)] pt-4 text-[15px] font-semibold">
                <p className="num">{auction.pieces} numbered pieces</p>
                {phase !== "upcoming" && (
                  <p>
                    <SealedBidCount dropId={drop.id} base={auction.bid_count} live={!ended} />
                  </p>
                )}
                <p>{lab.rule === "uniform" ? "Winners all pay the same price" : "Winners pay what they bid"}</p>
                <p className={`${ended ? "muted" : "field-soft"} basis-full text-[14px]`}>
                  <b className={ended ? "text-paper" : ""}>Sealed bid, not live bidding.</b> One hidden bid each, raisable until close. There&apos;s no high bid to watch; live, open bidding is for member resale listings.
                </p>
              </div>
            ) : (
              /* Stock meter: how much of the run is claimed. */
              <div className="mt-6">
                <div className="flex items-baseline justify-between text-[15px] font-semibold">
                  <p className="num">
                    {phase === "upcoming" ? `${total} pieces in this run` : phase === "low" ? `Only ${left} left` : ended || phase === "soldout" ? `${claimed} of ${total} claimed` : `${left} of ${total} left`}
                  </p>
                  {phase !== "upcoming" && <p className="num">{Math.round((claimed / total) * 100)}% claimed</p>}
                </div>
                <div className="mt-2 h-2.5 bg-[color-mix(in_srgb,currentColor_22%,transparent)]">
                  <div className="cup-bar h-full bg-current" style={{ width: `${phase === "upcoming" ? 0 : (claimed / total) * 100}%` }} />
                </div>
              </div>
            )}

            <div className="mt-8">
              {auction ? (
                <SealedBid
                  key={`${phase}-${lab.bid}-${lab.rule}`}
                  dropId={drop.id}
                  phase={phase}
                  pieces={auction.pieces}
                  minCents={auction.min_bid_cents}
                  bidCount={auction.bid_count}
                  rule={lab.rule}
                  state={lab.bid}
                  myBidCents={myBid}
                  result={result!}
                  chapter={name}
                  closetHref={withLab(`/c/${chapter.slug}`, lab)}
                />
              ) : ended ? (
                <div>
                  <p className="text-[17px] leading-relaxed">
                    This drop closed {date(drop.ends_at)}. {claimed} pieces went to {name} members, and {drop.philanthropy_pct}% of the profit,{" "}
                    <b>{money(raisedCents(drop))}</b>, went to {chapter.philanthropy}.
                  </p>
                  <div className="mt-6">
                    <DropBuy sizes={drop.sizes} phase={phase} price={money(drop.price_cents)} grid={false} chapter={name} closetHref={withLab(`/c/${chapter.slug}`, lab)} />
                  </div>
                </div>
              ) : (
                <DropBuy key={`${phase}-${lab.v}`} sizes={drop.sizes} phase={phase} price={money(drop.price_cents)} grid={lab.v === "b"} chapter={name} closetHref={withLab(`/c/${chapter.slug}`, lab)} />
              )}
            </div>

            {!ended && (
              <p className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border-[1.5px] border-current px-4 py-2 text-[14px] font-semibold">
                {lab.v === "b" && raisedCents(drop) > 0 && !auction ? `${money(raisedCents(drop))} raised for ${chapter.philanthropy}` : `${drop.philanthropy_pct}% → ${chapter.philanthropy}`}
              </p>
            )}
          </div>
        </div>
        <div className="tape" aria-hidden="true" />
      </section>

      <div className="column pb-24">
        <dl className="grid gap-px border-t-2 border-ink pt-0 md:grid-cols-4">
          {[
            ["Window", `${dateTime(drop.starts_at)} – ${dateTime(drop.ends_at)}`],
            [drop.company.role === "brand" ? "Brand partner" : "Licensed vendor", drop.company.role === "brand" ? `${drop.company.name} (demo)` : drop.licensed_vendor],
            ["Handoff", "Exchange Spot (free) or your MSC"],
            ["Giving", `${drop.philanthropy_pct}% of profit to ${chapter.philanthropy}`],
          ].map(([k, v]) => (
            <div key={k} className="border-b border-[var(--gray-100)] py-5 md:border-b-0 md:pr-6">
              <dt className="muted text-[13px] font-semibold">{k}</dt>
              <dd className="mt-1 text-[15px] font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        {others.length > 0 && (
          <section className="pt-12">
            <div className="flex flex-wrap items-end justify-between gap-4 border-t-2 border-ink pt-6">
              <h2 className="display text-[clamp(2.25rem,4vw,3.25rem)]">Also in this drop.</h2>
              <p className="muted text-[15px]">Same window, same pickup.</p>
            </div>
            <div className="pt-6">
              <ListingGrid listings={others} lab={lab} />
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}
