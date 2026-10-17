// The matchup (deck slide 08): both campuses drop for the same game, split screen, each half in its own colors.
// Each half is that campus's gameday drop and links to it with ?school=<that campus>.
import Image from "next/image";
import Link from "next/link";
import { campusTheme } from "@/lib/brand/campus";
import { dropPhase, dropStock, SHORT, withLab, withPhase, type Lab } from "@/lib/lab";
import { GAMEDAY_SLUG, type GamedaySide } from "@/lib/gameday";
import { CampusMark } from "./shell";
import { Countdown } from "./countdown";
import { Arrow } from "./icons";

/** Sealed bids plus pre-orders (or reminders, before the drop opens): the number the rivalry bar splits. */
function heat(s: GamedaySide, lab: Lab, now: number) {
  const drop = withPhase(s.drop, lab.drop, now);
  const phase = dropPhase(drop, now);
  const { left, total } = dropStock(drop);
  const second = phase === "upcoming" ? { n: s.reminders, label: "reminders set" } : { n: total - left, label: "pre-orders" };
  return { drop, second, score: s.sealedBids + second.n };
}

function Half({ s, lab, now, role }: { s: GamedaySide; lab: Lab; now: number; role: "Away" | "Home" }) {
  const { drop, second } = heat(s, lab, now);
  return (
    <Link
      href={withLab(`/drop/${GAMEDAY_SLUG}`, lab, { school: s.campus.slug })}
      style={campusTheme({ primary: s.campus.primary_color, secondary: s.campus.secondary_color })}
      className="field group flex min-w-0 flex-col"
      aria-label={`${s.campus.name} gameday drop`}
    >
      <div className="media relative aspect-[4/5] overflow-hidden">
        <Image
          src={drop.photo_url}
          alt=""
          fill
          sizes="(min-width: 760px) 40vw, 50vw"
          className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
        />
        <span className="absolute top-3 left-3 inline-flex rounded-full bg-paper p-1.5 md:top-4 md:left-4">
          <CampusMark campus={s.campus} lab={lab} size={30} />
        </span>
      </div>
      <div className="tape" aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-2 p-[clamp(14px,2.4vw,32px)]">
        <p className="field-soft text-[13px] font-semibold">
          {role} · {drop.name}
        </p>
        <h3 className="display jersey truncate text-[clamp(2rem,5.5vw,4.75rem)]">{s.campus.name}</h3>
        <p className="mt-2 flex flex-col gap-0.5 md:flex-row md:gap-4">
          <span className="num text-[clamp(15px,1.5vw,18px)] font-semibold">{s.sealedBids} sealed bids</span>
          <span className="field-soft num text-[clamp(14px,1.4vw,17px)] font-semibold">
            {second.n} {second.label}
          </span>
        </p>
        <span className="pill pill-flip pill-sm mt-4 w-fit">
          Shop {SHORT[s.campus.slug] ?? s.campus.name} <Arrow width={16} height={16} />
        </span>
      </div>
    </Link>
  );
}

export function GamedayVersus({
  sides,
  day,
  kickoff,
  lab,
  now,
}: {
  sides: readonly [GamedaySide, GamedaySide];
  day: string;
  kickoff: string;
  lab: Lab;
  now: number;
}) {
  const [away, home] = sides;
  const a = heat(away, lab, now).score;
  const b = heat(home, lab, now).score;
  const pct = a + b > 0 ? Math.round((a / (a + b)) * 100) : 50;
  return (
    <article className="flex flex-col gap-4" aria-label={`${away.campus.name} at ${home.campus.name}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h3 className="display text-[clamp(1.75rem,3vw,2.5rem)]">
          {away.campus.name} at {home.campus.name}
        </h3>
        <p className="muted text-[14px] font-semibold">
          {day} · kickoff in <Countdown to={kickoff} serverNow={now} className="text-ink" />
        </p>
      </div>
      <div className="@container relative grid grid-cols-2 overflow-hidden rounded-[4px]">
        <Half s={away} lab={lab} now={now} role="Away" />
        <Half s={home} lab={lab} now={now} role="Home" />
        <span
          aria-hidden="true"
          className="display pointer-events-none absolute top-[31.25cqw] left-1/2 z-10 grid h-[clamp(56px,9cqw,96px)] w-[clamp(56px,9cqw,96px)] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink pt-1 text-[clamp(24px,4cqw,44px)] text-paper ring-4 ring-paper"
        >
          VS
        </span>
      </div>
      <div>
        <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={`${away.campus.name} ${pct}%, ${home.campus.name} ${100 - pct}%`}>
          <span style={{ width: `${pct}%`, background: away.campus.primary_color }} />
          <span className="flex-1" style={{ background: home.campus.primary_color }} />
        </div>
        <div className="num mt-2 flex justify-between gap-3 text-[13px] font-semibold">
          <span>
            {SHORT[away.campus.slug]} {pct}%
          </span>
          <span className="muted hidden text-center sm:inline">Who&apos;s louder: sealed bids + pre-orders</span>
          <span>
            {100 - pct}% {SHORT[home.campus.slug]}
          </span>
        </div>
      </div>
    </article>
  );
}
