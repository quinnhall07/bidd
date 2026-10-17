// Closet Cup season meter (on the dark hero) and the "how points work" strip (on paper).
import { cupDay } from "@/lib/format";
import { Arrow, Bell, Check, Hanger, Lock } from "@/components/icons";

// Fall Cup: Bid Day to Thanksgiving (vision.md). Bid Day matches cupDay in lib/format.
const BID_DAY = Date.parse("2026-08-16T00:00:00-05:00");
const THANKSGIVING = Date.parse("2026-11-26T00:00:00-06:00");
const DAY = 864e5;

export function CupSeason({ now, zero }: { now: number; zero?: boolean }) {
  const total = Math.round((THANKSGIVING - BID_DAY) / DAY);
  const day = zero ? 1 : Math.min(total, cupDay(now));
  const left = zero ? total : Math.max(0, Math.ceil((THANKSGIVING - now) / DAY));
  return (
    <div className="mt-8 max-w-[640px]" aria-label={`Fall Cup, day ${day} of ${total}, ${left} days left`}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p className="flex items-center gap-2 text-[15px] font-bold">
          Fall Cup: Bid Day <Arrow width={16} height={16} />
          <span className="sr-only">to</span> Thanksgiving
        </p>
        <p className="flex items-baseline gap-2">
          <span className="display num text-[40px]">{left}</span>
          <span className="text-[15px] font-semibold text-[var(--dim)]">{left === 1 ? "day left" : "days left"}</span>
        </p>
      </div>
      <div className="mt-3 h-2 bg-[var(--gray-800)]">
        <div className="cup-bar h-full bg-[var(--campus-on-dark)]" style={{ width: `${(day / total) * 100}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[13px] font-semibold text-[var(--dim)]">
        <span>Aug 16 · Bid Day</span>
        <span>Nov 26 · Thanksgiving</span>
      </div>
    </div>
  );
}

const RULES = [
  { icon: Hanger, title: "10 points a sale", body: "Every piece a member sells puts 10 points on their chapter's board. No sign-up, it counts automatically." },
  { icon: Check, title: "Sold, not listed", body: "Points land only when a sale completes at the campus handoff. Listings and cancelled orders score nothing." },
  { icon: Lock, title: "Capped every week", body: "Each seller's points cap out weekly, so the Cup is won by the whole chapter, not one closet." },
  { icon: Bell, title: "Spend them", body: "Redeem points for fee waivers and early access to chapter drops." },
];

export function CupPoints() {
  return (
    <section aria-label="How points work" className="column pt-10">
      <h2 className="display text-[clamp(1.75rem,3vw,2.5rem)]">How points work.</h2>
      <ol className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {RULES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="border-t-2 border-ink pt-4">
            <p className="flex items-center gap-2 text-[17px] font-bold">
              <Icon width={20} height={20} /> {title}
            </p>
            <p className="muted mt-2 max-w-[34ch] text-[15px] leading-relaxed">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
