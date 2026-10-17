// Listing page: Depop's product page (photo, BRAND • CATEGORY, size and condition, seller row, price and Buy),
// with Bidd's buyer fee, campus handoff and moment tags.
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListing } from "@/lib/data";
import { withLab } from "@/lib/lab";
import { buyerFee, initials, money } from "@/lib/format";
import { chapterName, setup } from "@/lib/page";
import { Shell } from "@/components/shell";
import { ListingGrid } from "@/components/listing";
import { SaveHeart } from "@/components/save-heart";
import { CheckoutButton } from "@/components/checkout";
import { LiveBid } from "@/components/live-bid";
import { isAuctionListing } from "@/lib/auction";
import { Check, Pin } from "@/components/icons";

const tagSlug = (m: string) => m.toLowerCase().replace(/ /g, "-");

export default async function ItemPage({ params, searchParams }: PageProps<"/item/[id]">) {
  const { id } = await params;
  const { lab, campuses, campus, cid } = await setup(searchParams);
  const data = await getListing(cid, id);
  if (!data) notFound();
  const { listing: l, closet, chapter, more } = data;
  const sold = l.status === "sold";
  const fee = buyerFee(l.price_cents);
  const isDrop = Boolean(l.drop_id);
  const auction = !sold && !isDrop && isAuctionListing(l.id);

  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav="item">
      <div className="column grid gap-10 pt-8 pb-16 md:grid-cols-12 md:gap-12 md:pt-12">
        <div className="photo relative overflow-hidden md:col-span-7" style={{ backgroundColor: l.dominant_color }}>
          <Image src={l.photo_urls[0]} alt={l.title} fill priority sizes="(min-width: 760px) 58vw, 100vw" className={`object-cover ${sold ? "grayscale-[60%]" : ""}`} />
          {sold && <span className="display absolute bottom-0 left-0 bg-ink px-4 pt-2 pb-1.5 text-[36px] text-paper">Sold</span>}
        </div>

        <div className="md:col-span-5">
          <p className="label muted">
            {l.brand && l.brand !== "Other" ? `${l.brand} • ${l.category}` : l.category}
          </p>
          <h1 className="mt-3 text-[clamp(1.5rem,2.2vw,2rem)] leading-tight font-semibold">{l.title}</h1>
          <p className="muted mt-2 text-[16px]">
            Size {l.size} • {l.condition[0].toUpperCase() + l.condition.slice(1)} condition
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {l.tags.map((t) => (
              <Link key={t} href={withLab("/", lab, { tag: tagSlug(t) })} className="chip chip-quiet">
                {t}
              </Link>
            ))}
          </div>

          <div className="mt-8 border-t-2 border-ink pt-6">
            {!auction && <p className="display num text-[clamp(2.5rem,4vw,3.5rem)]">{lab.v === "b" && !isDrop ? money(l.price_cents + fee, true) : money(l.price_cents)}</p>}
            {auction ? (
              <LiveBid key={l.id} listingId={l.id} priceCents={l.price_cents} title={l.title} campusSlug={campus?.slug} />
            ) : sold ? (
              <div className="mt-5">
                <button className="pill w-full" disabled>
                  Sold
                </button>
                <p className="muted mt-3 text-[15px]">This one found a new closet. Similar pieces are below.</p>
              </div>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
                  <CheckoutButton
                    lab={lab}
                    campusSlug={campus?.slug ?? null}
                    campusName={campus?.name ?? null}
                    item={{
                      id: l.id,
                      title: l.title,
                      size: l.size,
                      condition: l.condition,
                      photo: l.photo_urls[0],
                      color: l.dominant_color ?? "var(--gray-100)",
                      priceCents: l.price_cents,
                      feeCents: isDrop ? 0 : fee,
                    }}
                  />
                  <SaveHeart className="size-12! border-2 border-ink" />
                </div>
                <p className="muted num mt-3 text-[14px]">
                  {isDrop
                    ? "No buyer fee on drops."
                    : lab.v === "b"
                      ? `Includes the ${money(fee, true)} buyer fee. Sellers pay 0%.`
                      : `+${money(fee, true)} buyer fee · You pay ${money(l.price_cents + fee, true)}. Sellers pay 0%.`}
                </p>
              </>
            )}
          </div>

          <div className="mt-8 grid gap-px">
            <p className="text-[15px] font-semibold">Get it</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-[4px] border-2 border-ink p-4">
                <p className="flex items-center gap-2 text-[15px] font-semibold">
                  <Pin width={18} height={18} /> Exchange Spot
                </p>
                <p className="muted mt-1 text-[14px]">Free. Meet on campus, scan the QR, done.</p>
              </div>
              <div className="rounded-[4px] border border-[var(--gray-200)] p-4">
                <p className="text-[15px] font-semibold">MSC locker</p>
                <p className="muted mt-1 text-[14px]">Shipped to your Mail Stop Code.</p>
              </div>
            </div>
          </div>

          {closet && (
            <Link href={withLab(`/c/${closet.slug}`, lab)} className="mt-8 flex items-center gap-4 rounded-[4px] border border-[var(--gray-100)] p-4 transition-colors hover:bg-[var(--gray-50)]">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-[15px] font-bold text-paper">{initials(closet.name)}</span>
              <span className="min-w-0">
                <span className="block truncate text-[16px] font-semibold">
                  {closet.type === "chapter" ? `${closet.name} closet` : closet.name}
                  {chapter && closet.type === "personal" && <span className="muted font-normal"> · {chapterName(chapter, lab)}</span>}
                </span>
                <span className="muted flex items-center gap-1.5 text-[14px]">
                  <Check width={15} height={15} strokeWidth={2.5} className="text-[var(--campus-line)]" /> {campus ? `${campus.name} verified` : "Campus verified"} · {closet.sold_count} sold · {closet.active_label}
                </span>
              </span>
            </Link>
          )}

          <p className="mt-8 max-w-[60ch] text-[16px] leading-relaxed">{l.description}</p>
        </div>
      </div>

      {more.length > 0 && (
        <div className="column pb-24">
          <div className="border-t-2 border-ink pt-6">
            <h2 className="display text-[clamp(2.25rem,4vw,3.25rem)]">{sold ? "Similar pieces." : "More from this closet."}</h2>
          </div>
          <div className="pt-6">
            <ListingGrid listings={more.slice(0, 5)} lab={lab} />
          </div>
        </div>
      )}
    </Shell>
  );
}
