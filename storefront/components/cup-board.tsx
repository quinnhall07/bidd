// Closet Cup board: the standings, plus the philanthropy pot and the sustainability tally beside them.
// Pure and client-safe: rendered by cup-live.tsx, which may swap in live numbers.
import { money } from "@/lib/format";
import type { Lab } from "@/lib/lab";
import { Trophy } from "@/components/icons";
import { CupBars, lbsKept, nameOf, LBS_PER_ITEM, type Row } from "@/components/cup";

// Demo assumption: the pot is this share of Bidd's buyer fees (5% + $0.50 a sale) for the scope's sales.
const POT_SHARE = 0.2;
const potCents = (rows: Row[]) => {
  const fees = rows.reduce((sum, r) => sum + r.gmv_cents * 0.05 + r.sales_count * 50, 0);
  return Math.round((fees * POT_SHARE) / 100) * 100;
};

type Props = { rows: Row[]; lab: Lab; mine?: string | null; scope: "campus" | "sec"; title: string; zero?: boolean; live?: boolean };

export function CupBoard({ rows, lab, mine, scope, title, zero, live }: Props) {
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:gap-16">
      <div>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="display text-[clamp(2.25rem,4vw,3.25rem)]">{title}</h2>
          <p className="muted flex items-center gap-3 text-[15px]">
            {live && (
              <span className="stamp text-ink">
                <span className="stamp-dot" /> Live
              </span>
            )}
            <span>
              <span className="series-2-label">Points this season</span>
              <span className="hidden [[data-duo=pair]_&]:inline"> · thin bar is last season</span>
            </span>
          </p>
        </div>
        {zero && (
          <p className="mb-8 border-t-2 border-ink pt-6 text-[clamp(18px,1.8vw,22px)] font-semibold">
            The Fall Cup starts with the first sale. Every chapter is at zero, so the first piece sold puts its chapter on top.
          </p>
        )}
        <CupBars rows={rows} lab={lab} mine={mine} scope={scope} impact />
      </div>
      <aside className="grid content-start gap-6">
        <CupPot rows={rows} lab={lab} scope={scope} />
        <CupImpact rows={rows} lab={lab} scope={scope} />
      </aside>
    </div>
  );
}

function CupPot({ rows, lab, scope }: { rows: Row[]; lab: Lab; scope: "campus" | "sec" }) {
  const pot = potCents(rows);
  const lead = rows[0];
  const leader = lead && (scope === "sec" ? `${nameOf(lead.chapter, lab)} at ${lead.campus.name}` : nameOf(lead.chapter, lab));
  return (
    <section className="field rounded-[4px] p-6 md:p-8" aria-label="Philanthropy pot">
      <span className="stamp">
        <Trophy width={16} height={16} /> Philanthropy pot
      </span>
      <p className="display num mt-5 text-[clamp(3rem,5vw,4.5rem)]">{money(pot, false)}</p>
      <p className="field-soft mt-2 text-[15px] font-semibold leading-relaxed">
        A share of Bidd&apos;s fees from every sale this season. When the Cup ends, the winning chapter&apos;s philanthropy takes it.
      </p>
      <p className="mt-5 border-t border-current pt-4 text-[15px] leading-relaxed">
        {lead && lead.points > 0 ? (
          <>
            If the Cup ended today: <strong>{lead.chapter.philanthropy}</strong>, for {leader}.
          </>
        ) : (
          "No leader yet. The first completed sale picks the philanthropy on top."
        )}
      </p>
    </section>
  );
}

function CupImpact({ rows, lab, scope }: { rows: Row[]; lab: Lab; scope: "campus" | "sec" }) {
  const sales = rows.reduce((sum, r) => sum + r.sales_count, 0);
  const lbs = lbsKept(sales);
  const greenest = [...rows].sort((a, b) => b.sales_count - a.sales_count)[0];
  return (
    <section className="rounded-[4px] border-2 border-ink p-6 md:p-8" aria-label="Sustainability">
      <span className="stamp">
        <span className="stamp-dot" /> Kept in circulation
      </span>
      <p className="display num mt-5 text-[clamp(3rem,5vw,4.5rem)]">
        {lbs.toLocaleString("en-US")}
        <span className="ml-2 text-[0.4em]">lbs</span>
      </p>
      <p className="muted mt-2 text-[15px] leading-relaxed">
        Est. kept out of landfills {scope === "sec" ? "by these chapters" : "on this campus"} this season: {sales.toLocaleString("en-US")} pieces resold at about {LBS_PER_ITEM} lb each.
      </p>
      {greenest && greenest.sales_count > 0 && (
        <p className="mt-5 border-t border-[var(--gray-200)] pt-4 text-[15px] leading-relaxed">
          Most rehomed: <strong>{scope === "sec" ? greenest.campus.name : nameOf(greenest.chapter, lab)}</strong>, {lbsKept(greenest.sales_count).toLocaleString("en-US")} lbs.
        </p>
      )}
    </section>
  );
}
