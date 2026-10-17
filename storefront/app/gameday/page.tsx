// Gameday (deck slide 08): big-game drops. Your school's drop, this week's matchups side by side,
// and every campus's gameday drop in one grid. Bidd never prints: each drop goes through the chapter's licensed vendor.
import { getCampus, getDrop } from "@/lib/data";
import { withPhase } from "@/lib/lab";
import { setup } from "@/lib/page";
import { GAMEDAY_SLUG, getGamedayDrops, getMatchups } from "@/lib/gameday";
import { Shell } from "@/components/shell";
import { DropBanner } from "@/components/drops";
import { GamedayVersus } from "@/components/gameday-versus";
import { GamedayGrid } from "@/components/gameday-grid";

const SECTIONS = [
  ["your-school", "01", "Your school"],
  ["matchup", "02", "The matchup"],
  ["every-campus", "03", "Every campus"],
] as const;

function SectionHead({ id, title, note }: { id: (typeof SECTIONS)[number][0]; title: string; note: string }) {
  const [, n, label] = SECTIONS.find((s) => s[0] === id)!;
  return (
    <div className="mb-8 flex flex-col gap-3">
      <p className="num text-[13px] font-bold tracking-[0.06em] uppercase">
        {n} · {label}
      </p>
      <h2 className="display text-[clamp(2.25rem,4vw,3.5rem)]">{title}</h2>
      <p className="muted max-w-[56ch] text-[16px] leading-relaxed">{note}</p>
    </div>
  );
}

export default async function GamedayPage({ searchParams }: PageProps<"/gameday">) {
  const { lab, campuses, campus, cid, now } = await setup(searchParams);
  const home = (await getCampus(cid))!;
  const mine = await getDrop(cid, GAMEDAY_SLUG);
  const [matchups, every] = await Promise.all([getMatchups(), getGamedayDrops()]);

  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav="drop">
      <section data-ground="dark" className="ink-band bg-ink text-paper">
        <div className="column py-12 md:py-16">
          <span className="stamp">
            <span className="stamp-dot" /> Gameday · this week
          </span>
          <h1 className="display mt-6 text-[clamp(3.5rem,8vw,7rem)]">Big-game drops.</h1>
          <p className="muted mt-4 max-w-[52ch] text-[clamp(17px,1.6vw,20px)] leading-relaxed">
            Each school drops its own pieces for the big games. Both campuses drop for the same matchup, and every campus&apos;s drop lives in one app. Printed by each chapter&apos;s licensed vendor, never by Bidd.
          </p>
          <nav aria-label="Gameday sections" className="mt-8 flex flex-wrap gap-2">
            {SECTIONS.map(([id, n, label]) => (
              <a key={id} href={`#${id}`} className="rounded-full border border-[var(--gray-800)] px-5 py-2.5 text-[15px] font-semibold text-[var(--dim)] hover:bg-paper hover:text-ink">
                <span className="num">{n}</span> {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="tape" aria-hidden="true" />
      </section>

      <section id="your-school" className="column scroll-mt-24 pt-14">
        <SectionHead
          id="your-school"
          title={`${home.name} drops for Saturday.`}
          note={`Your campus's own gameday piece, from a ${home.name} chapter and its licensed vendor. Pre-order before the window closes and pick it up at the Exchange Spot.`}
        />
        {mine ? (
          <DropBanner drop={withPhase(mine.drop, lab.drop, now)} chapter={mine.chapter} campus={home} lab={lab} now={now} />
        ) : (
          <p className="muted">No gameday drop on this campus yet.</p>
        )}
      </section>

      <section id="matchup" className="column scroll-mt-24 pt-20">
        <SectionHead
          id="matchup"
          title="Both sides drop."
          note="Both campuses drop for the same game, side by side. Every sealed bid and pre-order counts toward whose side is louder."
        />
        <div className="flex flex-col gap-14">
          {matchups.map((m) => (
            <GamedayVersus key={m.id} sides={m.sides} day={m.day} kickoff={m.kickoff} lab={lab} now={now} />
          ))}
        </div>
      </section>

      <section id="every-campus" className="column scroll-mt-24 pt-20 pb-24">
        <SectionHead id="every-campus" title="Every campus. One app." note={`${every.length} campuses, one gameday drop each. Tap any school to see its drop in its colors.`} />
        <GamedayGrid rows={every} mine={campus?.slug ?? null} lab={lab} now={now} />
      </section>
    </Shell>
  );
}
