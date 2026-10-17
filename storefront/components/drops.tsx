// Drop surfaces outside the drop page: the Home banner (v=a), the drop-first hero (v=c),
// the slim strip under a chapter header (v=b), the drop cards and the Home drops row.
import Image from "next/image";
import Link from "next/link";
import { dropPhase, dropStock, withLab, type Lab } from "@/lib/lab";
import { date, dateTime, money } from "@/lib/format";
import { chapterName } from "@/lib/page";
import type { Campus, Chapter, Drop, DropPhase } from "@/lib/types";
import { Countdown } from "./countdown";
import { CollabLockup, collabLine } from "./collab";
import { Arrow } from "./icons";

export const PHASE_LABEL: Record<DropPhase, string> = {
  upcoming: "Opens soon",
  live: "Live now",
  low: "Almost gone",
  soldout: "Sold out",
  ended: "Ended",
};

const phaseLabel = (drop: Drop, phase: DropPhase) =>
  drop.kind === "auction" ? (phase === "upcoming" ? "Bidding opens soon" : phase === "ended" ? "Bidding closed" : "Sealed bids open") : PHASE_LABEL[phase];

/** The clock line for any phase: what it counts toward, or what happened. */
export function DropClock({ drop, phase, now, big }: { drop: Drop; phase: DropPhase; now: number; big?: boolean }) {
  const clock = big ? "display text-[clamp(3rem,6vw,5.5rem)]" : "display text-[clamp(2rem,3.4vw,3rem)]";
  const auction = drop.kind === "auction";
  if (phase === "upcoming")
    return (
      <div>
        <p className="field-soft text-[14px] font-semibold">{auction ? "Bidding opens in" : "Opens in"}</p>
        <Countdown to={drop.starts_at} serverNow={now} className={`${clock} jersey block`} />
      </div>
    );
  if (phase === "ended")
    return (
      <div>
        <p className="field-soft text-[14px] font-semibold">Closed {date(drop.ends_at)}</p>
        <p className={`${clock} jersey`}>{auction ? "Closed" : "Ended"}</p>
      </div>
    );
  return (
    <div>
      <p className="field-soft text-[14px] font-semibold">{auction ? "Bids close in" : phase === "soldout" ? "Window closes in" : "Closes in"}</p>
      <Countdown to={drop.ends_at} serverNow={now} className={`${clock} jersey block`} />
    </div>
  );
}

export function stockLine(drop: Drop, phase: DropPhase) {
  if (drop.auction) {
    const a = drop.auction;
    if (phase === "upcoming") return `${a.pieces} pieces · bids from ${money(a.min_bid_cents)}`;
    return `${a.pieces} pieces · ${a.bid_count} sealed bids`;
  }
  const { left, total } = dropStock(drop);
  if (phase === "upcoming") return `${total} pieces · ${money(drop.price_cents)}`;
  if (phase === "soldout" || phase === "ended") return `${total - left} of ${total} claimed`;
  return `${left} of ${total} left`;
}

const ctaFor = (drop: Drop, phase: DropPhase) =>
  phase === "upcoming" ? "Remind me" : phase === "ended" || phase === "soldout" ? "See the drop" : drop.kind === "auction" ? "Place a sealed bid" : "Pre-order";

export function DropBanner({ drop, chapter, campus, lab, now }: { drop: Drop; chapter: Chapter; campus: Campus; lab: Lab; now: number }) {
  const phase = dropPhase(drop, now);
  return (
    <section aria-label="Featured drop">
      <Link href={withLab(`/drop/${drop.slug}`, lab)} className="field group grid overflow-hidden rounded-[4px] md:grid-cols-12">
        <div className="flex flex-col justify-between gap-8 p-[clamp(20px,2.4vw,32px)] md:col-span-7 md:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="stamp">
              <span className="stamp-dot" />
              {phaseLabel(drop, phase)}
            </span>
            <span className="field-soft text-[14px] font-semibold">{collabLine(drop, chapter, campus, lab)}</span>
          </div>
          <h2 className="display jersey text-[clamp(3rem,7vw,6rem)]">{drop.name}</h2>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <DropClock drop={drop} phase={phase} now={now} />
            <div className="flex flex-col items-start gap-3 md:items-end">
              <p className="num text-[15px] font-semibold">{stockLine(drop, phase)}</p>
              <span className="pill pill-flip">
                {ctaFor(drop, phase)} <Arrow width={18} height={18} />
              </span>
            </div>
          </div>
        </div>
        <div className="media relative aspect-[4/3] overflow-hidden md:col-span-5 md:aspect-auto">
          <Image src={drop.banner_url} alt="" fill sizes="(min-width: 760px) 42vw, 100vw" className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]" priority />
        </div>
      </Link>
      <div className="tape" aria-hidden="true" />
    </section>
  );
}

/**
 * v=c: the drop takes the top of Home, SNKRS-style. It stops at about 80% of the screen so the feed
 * below peeks in, and its bottom edge is a switcher for every other drop on campus.
 */
export function DropHero({
  drop,
  drops,
  chapters,
  campus,
  lab,
  now,
}: {
  drop: Drop;
  drops: Drop[];
  chapters: Chapter[];
  campus: Campus;
  lab: Lab;
  now: number;
}) {
  const phase = dropPhase(drop, now);
  const chapter = chapters.find((c) => c.id === drop.chapter_id)!;
  return (
    <section className="field flex flex-col md:h-[clamp(560px,80svh,900px)] [[data-school=none]_&]:border-t [[data-school=none]_&]:border-[var(--gray-800)]" aria-label="Featured drop">
      <div className="column grid min-h-0 flex-1 gap-8 py-8 md:grid-cols-12 md:gap-10 md:py-10">
        <div className="media relative aspect-[4/3] overflow-hidden md:order-2 md:col-span-5 md:aspect-auto">
          <Image key={drop.id} src={drop.photo_url} alt="" fill sizes="(min-width: 760px) 42vw, 100vw" className="object-cover" priority />
          {drop.kind === "auction" && <span className="display absolute top-0 left-0 bg-ink px-3 pt-1.5 pb-1 text-[22px] text-paper">Sealed bid</span>}
        </div>
        <div className="flex min-h-0 flex-col justify-between gap-6 md:col-span-7">
          <div className="flex flex-col gap-5">
            <span className="stamp w-fit">
              <span className="stamp-dot" />
              {phaseLabel(drop, phase)}
            </span>
            <CollabLockup drop={drop} chapter={chapter} campus={campus} lab={lab} size={34} />
          </div>
          <h2 className="display jersey text-[clamp(3.5rem,8vw,7.5rem)]">{drop.name}</h2>
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
            <DropClock drop={drop} phase={phase} now={now} big />
            <div className="flex flex-col items-start gap-3 md:items-end">
              <p className="num text-[15px] font-semibold">{stockLine(drop, phase)}</p>
              <Link href={withLab(`/drop/${drop.slug}`, lab)} className="pill pill-flip">
                {ctaFor(drop, phase)} <Arrow width={18} height={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
      {drops.length > 1 && (
        <nav aria-label="Switch drop" className="border-t border-[color-mix(in_srgb,var(--campus-ink)_22%,transparent)]">
          <div className="column no-scrollbar flex gap-2 overflow-x-auto py-3">
            {drops.map((d) => {
              const p = dropPhase(d, now);
              const current = d.id === drop.id;
              return (
                <Link
                  key={d.id}
                  href={withLab("/", lab, { feature: d.slug })}
                  scroll={false}
                  aria-current={current}
                  className="flex shrink-0 items-center gap-3 rounded-[4px] py-1.5 pr-4 pl-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--campus-ink)_10%,transparent)] aria-[current=true]:bg-[var(--campus-ink)] aria-[current=true]:text-[var(--campus)]"
                >
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-[2px]">
                    <Image src={d.photo_url} alt="" fill sizes="44px" className={`object-cover ${p === "ended" ? "grayscale" : ""}`} />
                  </span>
                  <span className="grid text-left leading-tight">
                    <span className="text-[14px] font-bold">{d.name}</span>
                    <span className="text-[12.5px] font-semibold opacity-80">{phaseLabel(d, p)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
      <div className="tape" aria-hidden="true" />
    </section>
  );
}

/** v=b: a slim countdown under the chapter closet header. */
export function DropStrip({ drop, lab, now }: { drop: Drop; lab: Lab; now: number }) {
  const phase = dropPhase(drop, now);
  return (
    <Link href={withLab(`/drop/${drop.slug}`, lab)} className="field block">
      <div className="column flex flex-wrap items-center gap-x-6 gap-y-2 py-4">
        <p className="display jersey text-[28px]">{drop.name}</p>
        <p className="text-[15px] font-semibold">
          {phaseLabel(drop, phase)}
          {phase !== "ended" && (
            <>
              {" · "}
              {phase === "upcoming" ? "opens in " : "closes in "}
              <Countdown to={phase === "upcoming" ? drop.starts_at : drop.ends_at} serverNow={now} />
            </>
          )}
        </p>
        <p className="num text-[15px] font-semibold">{stockLine(drop, phase)}</p>
        <span className="ml-auto inline-flex items-center gap-2 text-[15px] font-bold">
          See the drop <Arrow width={18} height={18} />
        </span>
      </div>
    </Link>
  );
}

export function DropCard({ drop, chapter, campus, lab, now }: { drop: Drop; chapter?: Chapter; campus?: Campus; lab: Lab; now: number }) {
  const phase = dropPhase(drop, now);
  const done = phase === "ended" || phase === "soldout";
  return (
    <Link href={withLab(`/drop/${drop.slug}`, lab)} className="group block">
      <div className="media relative aspect-[4/3] overflow-hidden bg-[var(--gray-50)]">
        <Image src={drop.photo_url} alt="" fill sizes="(min-width: 1024px) 30vw, 80vw" className={`object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03] ${done ? "grayscale-[70%]" : ""}`} />
        <span className={`absolute top-3 left-3 rounded-full px-3 py-1.5 text-[12.5px] font-bold ${done ? "bg-ink text-paper" : "field"}`}>{phaseLabel(drop, phase)}</span>
        {drop.kind === "auction" && <span className="absolute top-3 right-3 rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-bold text-paper">Sealed bid</span>}
      </div>
      {chapter && campus && <p className="mt-3 truncate text-[13px] font-semibold text-[var(--gray-600)]">{collabLine(drop, chapter, campus, lab)}</p>}
      <p className={`${chapter ? "mt-0.5" : "mt-3"} text-[17px] font-semibold`}>{drop.name}</p>
      <p className="muted num mt-0.5 text-[14px]">
        {phase === "upcoming" ? `Opens ${dateTime(drop.starts_at)}` : phase === "ended" ? `Closed ${date(drop.ends_at)}` : stockLine(drop, phase)}
        {" · "}
        {drop.kind === "auction" ? `from ${money(drop.price_cents)}` : money(drop.price_cents)}
      </p>
    </Link>
  );
}

const ORDER: Record<DropPhase, number> = { live: 0, low: 0, soldout: 2, upcoming: 1, ended: 3 };

/** Every drop on campus at once: a row that scrolls sideways, live first. */
export function DropRail({ drops, chapters, campus, lab, now, title }: { drops: Drop[]; chapters: Chapter[]; campus: Campus; lab: Lab; now: number; title: string }) {
  const sorted = [...drops].sort((a, b) => ORDER[dropPhase(a, now)] - ORDER[dropPhase(b, now)] || a.starts_at.localeCompare(b.starts_at));
  return (
    <section aria-label="Drops" className="pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-t-2 border-ink pt-6">
        <h2 className="display text-[clamp(2.25rem,4vw,3.5rem)]">{title}</h2>
        <p className="muted text-[15px]">
          {drops.length} drops · scroll for more
        </p>
      </div>
      <ul className="no-scrollbar -mx-[var(--gutter)] mt-6 flex snap-x gap-4 overflow-x-auto px-[var(--gutter)] pb-2">
        {sorted.map((d) => (
          <li key={d.id} className="reveal w-[78vw] shrink-0 snap-start sm:w-[340px] xl:w-[calc((100%-48px)/4)]">
            <DropCard drop={d} chapter={chapters.find((c) => c.id === d.chapter_id)} campus={campus} lab={lab} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export { phaseLabel };
