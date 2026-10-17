// Closet Cup bars: squared at the start, round at the leading end, racing right.
// Client-safe (no data imports), so the live overlay in cup-live.tsx can render it too.
import type { CSSProperties } from "react";
import { campusColors } from "@/lib/brand/campus";
import type { Lab } from "@/lib/lab";
import type { Campus, Chapter, CupRow } from "@/lib/types";

export type Row = CupRow & { chapter: Chapter; campus: Campus };

/** Sustainability estimate: a resold piece averages about 1.1 lb kept out of a landfill. */
export const LBS_PER_ITEM = 1.1;
export const lbsKept = (sales: number) => Math.round(sales * LBS_PER_ITEM);

/** Same rule as lib/page chapterName, inlined so this file stays out of the data module. */
export const nameOf = (chapter: Pick<Chapter, "national_org" | "letters">, lab: Lab) =>
  lab.names === "letters" ? chapter.letters : chapter.national_org;

export function CupBars({
  rows,
  lab,
  mine,
  scope,
  compact,
  impact,
}: {
  rows: Row[];
  lab: Lab;
  mine?: string | null;
  scope: "campus" | "sec";
  compact?: boolean;
  impact?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.points));
  return (
    <ol className={compact ? "grid gap-x-10 gap-y-4 md:grid-cols-2" : "grid gap-5"}>
      {rows.map((r, i) => {
        const own = scope === "campus" ? r.chapter_id === mine : r.campus_id === lab.school;
        // SEC view: every bar wears its own campus.
        const colors = campusColors(r.campus.primary_color, r.campus.secondary_color);
        const style = scope === "sec" ? ({ "--bar": colors.campus, "--bar-2": colors.campus2 } as CSSProperties) : undefined;
        const last = Math.round(r.points * (0.55 + ((r.sales_count * 7) % 40) / 100));
        return (
          <li key={r.chapter_id} className="grid grid-cols-[2rem_1fr] items-center gap-x-3" style={style}>
            <span className="num muted text-[14px] font-semibold">{i + 1}</span>
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <p className={`truncate text-[15px] ${own ? "font-bold" : "font-semibold"}`}>
                  {scope === "sec" ? r.campus.name : nameOf(r.chapter, lab)}
                  {own && <span className="muted ml-2 text-[13px] font-semibold">{scope === "sec" ? "Your campus" : "Your chapter"}</span>}
                </p>
                <p className={`display num shrink-0 ${compact ? "text-[24px]" : "text-[32px]"}`}>{r.points.toLocaleString("en-US")}</p>
              </div>
              <div className={`mt-1.5 bg-[var(--gray-50)] ${compact ? "h-3" : "h-7"}`}>
                <div className="cup-bar h-full" style={{ width: `${Math.max(r.points ? 2 : 0, (r.points / max) * 100)}%`, background: scope === "sec" ? "var(--bar)" : own ? "var(--campus)" : "var(--ink)" }} />
              </div>
              <div className="series-2 mt-1 h-1.5">
                <div className="cup-bar h-full" style={{ width: `${(last / max) * 100}%`, background: scope === "sec" ? "var(--bar-2)" : "var(--campus-2)" }} title="Last season" />
              </div>
              {impact && (
                <p className="muted num mt-1.5 text-[13px] font-semibold">
                  {r.sales_count.toLocaleString("en-US")} {r.sales_count === 1 ? "sale" : "sales"} · est. {lbsKept(r.sales_count).toLocaleString("en-US")} lbs kept out of landfills
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
