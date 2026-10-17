// Every campus (deck slide 08): one grid with every campus's gameday drop, each card in its own colors.
import Image from "next/image";
import Link from "next/link";
import { campusTheme } from "@/lib/brand/campus";
import { dropPhase, withLab, withPhase, type Lab } from "@/lib/lab";
import { date } from "@/lib/format";
import { GAMEDAY_SLUG } from "@/lib/gameday";
import type { Campus, Drop } from "@/lib/types";
import { PHASE_LABEL, stockLine } from "./drops";
import { CampusMark } from "./shell";

export function GamedayGrid({ rows, mine, lab, now }: { rows: { campus: Campus; drop: Drop }[]; mine: string | null; lab: Lab; now: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map(({ campus, drop: raw }) => {
        const drop = withPhase(raw, lab.drop, now);
        const phase = dropPhase(drop, now);
        return (
          <li key={campus.slug}>
            <Link
              href={withLab(`/drop/${GAMEDAY_SLUG}`, lab, { school: campus.slug })}
              style={campusTheme({ primary: campus.primary_color, secondary: campus.secondary_color })}
              className="field group flex h-full flex-col overflow-hidden rounded-[4px]"
            >
              <div className="media relative aspect-square overflow-hidden">
                <Image
                  src={drop.photo_url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                />
                <span className="absolute top-2.5 left-2.5 inline-flex rounded-full bg-paper p-1">
                  <CampusMark campus={campus} lab={lab} size={24} />
                </span>
                {campus.slug === mine && <span className="display absolute top-0 right-0 bg-ink px-2.5 pt-1 pb-0.5 text-[18px] text-paper">Your school</span>}
              </div>
              <div className="tape" aria-hidden="true" />
              <div className="flex flex-1 flex-col gap-1 p-3 md:p-4">
                <p className="display jersey truncate text-[clamp(1.5rem,2.4vw,2rem)]">{campus.name}</p>
                <p className="field-soft text-[13px] font-semibold">
                  {drop.name} · {phase === "upcoming" ? `opens ${date(drop.starts_at)}` : PHASE_LABEL[phase]}
                </p>
                <p className="num text-[13px] font-semibold">{stockLine(drop, phase)}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
