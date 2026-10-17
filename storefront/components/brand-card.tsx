// Brand drop cards for /brands: each card sits on its own campus color, so the grid reads as every campus at once.
// The collab line names the chapter × the brand (× the university when licensed). Partners are demo data.
import Image from "next/image";
import Link from "next/link";
import { campusTheme } from "@/lib/brand/campus";
import { dropPhase, withLab, type Lab } from "@/lib/lab";
import { money } from "@/lib/format";
import type { Campus, Chapter, Drop } from "@/lib/types";
import { CollabLockup, collabLine } from "./collab";
import { phaseLabel, stockLine } from "./drops";
import { Countdown } from "./countdown";
import { Arrow } from "./icons";

export type BrandDropRow = { drop: Drop; chapter: Chapter; campus: Campus };

const hrefFor = (row: BrandDropRow, lab: Lab) => withLab(`/drop/${row.drop.slug}`, { ...lab, school: row.campus.slug });

/** Big card for the viewer's own campus: full lockup, live clock, CTA. */
export function BrandFeature({ row, lab, now }: { row: BrandDropRow; lab: Lab; now: number }) {
  const { drop, chapter, campus } = row;
  const phase = dropPhase(drop, now);
  const auction = drop.kind === "auction";
  return (
    <Link href={hrefFor(row, lab)} className="field group grid overflow-hidden rounded-[4px] md:grid-cols-12" style={campusTheme({ primary: campus.primary_color, secondary: campus.secondary_color })}>
      <div className="media relative aspect-[4/3] overflow-hidden md:col-span-5 md:aspect-auto md:min-h-[320px]">
        <Image src={drop.photo_url} alt="" fill sizes="(min-width: 760px) 40vw, 100vw" className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]" />
        <span className="display absolute top-0 left-0 bg-ink px-3 pt-1.5 pb-1 text-[22px] text-paper">{auction ? "Sealed bid" : "Brand co-drop"}</span>
      </div>
      <div className="flex flex-col justify-between gap-6 p-[clamp(20px,2.4vw,32px)] md:col-span-7">
        <div className="flex flex-col gap-5">
          <span className="stamp w-fit">
            <span className="stamp-dot" /> {phaseLabel(drop, phase)}
          </span>
          <CollabLockup drop={drop} chapter={chapter} campus={campus} lab={lab} size={30} />
        </div>
        <h3 className="display jersey text-[clamp(2.25rem,4vw,3.5rem)]">{drop.name}</h3>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="field-soft text-[14px] font-semibold">{phase === "upcoming" ? "Opens in" : auction ? "Bids close in" : "Closes in"}</p>
            <Countdown to={phase === "upcoming" ? drop.starts_at : drop.ends_at} serverNow={now} className="display jersey block text-[clamp(1.75rem,3vw,2.5rem)]" />
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="num text-[15px] font-semibold">
              {stockLine(drop, phase)} · {auction ? `from ${money(drop.price_cents)}` : money(drop.price_cents)}
            </p>
            <span className="pill pill-flip">
              {phase === "upcoming" ? "Remind me" : auction ? "Place a sealed bid" : "Pre-order"} <Arrow width={18} height={18} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Compact card for the every-campus grid, on that campus's color. */
export function BrandCard({ row, lab, now }: { row: BrandDropRow; lab: Lab; now: number }) {
  const { drop, chapter, campus } = row;
  const phase = dropPhase(drop, now);
  return (
    <Link href={hrefFor(row, lab)} className="field group flex h-full flex-col overflow-hidden rounded-[4px]" style={campusTheme({ primary: campus.primary_color, secondary: campus.secondary_color })}>
      <div className="media relative aspect-[4/3] overflow-hidden">
        <Image src={drop.photo_url} alt="" fill sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 90vw" className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]" />
        <span className="absolute top-3 left-3 rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-bold text-paper">{drop.kind === "auction" ? "Sealed bid" : "Brand co-drop"}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="display text-[26px] leading-none">{campus.name}</p>
        <p className="field-soft mt-1 truncate text-[13px] font-semibold">{collabLine(drop, chapter, campus, lab)}</p>
        <p className="text-[16px] font-semibold">{drop.name}</p>
        <p className="field-soft num mt-auto pt-2 text-[13.5px] font-semibold">
          {phaseLabel(drop, phase)} · {stockLine(drop, phase)}
        </p>
      </div>
    </Link>
  );
}
