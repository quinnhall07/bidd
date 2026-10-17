// Ambassadors: brands fund a rep program on each campus; Bidd matches students to brands and handles payouts.
// Two sides: students apply to rep a brand, brands fund a program. Programs are demo seed content.
import Image from "next/image";
import Link from "next/link";
import { withLab } from "@/lib/lab";
import { money, plural } from "@/lib/format";
import { setup } from "@/lib/page";
import { Shell } from "@/components/shell";
import { PROGRAMS } from "@/components/ambassador-programs";
import { AmbassadorApply } from "@/components/ambassador-apply";
import { Arrow, Check } from "@/components/icons";

export default async function AmbassadorsPage({ searchParams }: PageProps<"/ambassadors">) {
  const { lab, campuses, campus } = await setup(searchParams);
  const where = campus ? campus.name : "your campus";

  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav="ambassadors">
      <section data-ground="dark" className="ink-band bg-ink text-paper">
        <div className="column py-12 md:py-16">
          <span className="stamp">
            <span className="stamp-dot" /> Ambassadors · demo
          </span>
          <h1 className="display mt-6 text-[clamp(3.5rem,8vw,7rem)]">Rep a brand.</h1>
          <p className="muted mt-4 max-w-[54ch] text-[clamp(17px,1.6vw,20px)] leading-relaxed">
            Brands fund ambassador programs on campus. Bidd matches them with students at {where} and pays reps for every drop piece sold
            through their code.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#students" className="pill pill-paper pill-sm">
              For students
            </a>
            <a href="#brands" className="pill pill-line pill-sm">
              For brands
            </a>
          </div>
        </div>
        <div className="tape" aria-hidden="true" />
      </section>

      <div className="column pt-12 pb-24">
        <section id="students" className="scroll-mt-[calc(var(--header)+16px)]" aria-label="For students">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h2 className="display text-[clamp(2.25rem,4vw,3.5rem)]">Rep a brand on your campus.</h2>
            <p className="muted num text-[15px] font-semibold">{plural(PROGRAMS.length, "open program")} at {where}</p>
          </div>
          <p className="muted mt-3 max-w-[60ch] text-[15px] leading-relaxed">
            School email verified students only. Apply once, Bidd matches you to the brand, and your payout lands after each drop closes.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {PROGRAMS.map((p) => (
              <li key={p.id} className="flex flex-col overflow-hidden rounded-[4px] border border-[var(--gray-100)] bg-paper">
                <div className="relative aspect-[4/3] bg-[var(--gray-50)]">
                  <Image src={p.photo} alt="" fill sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                  <span className="absolute top-3 left-3 rounded-full bg-paper px-3 py-1 text-[12px] font-bold tracking-[0.06em] uppercase">
                    {plural(p.spots, "spot")} left
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div>
                    <p className="text-[12px] font-bold tracking-[0.06em] text-[var(--gray-600)] uppercase">
                      {campus ? campus.name : "Any campus"} · demo program
                    </p>
                    <h3 className="display mt-2 text-[2rem]">{p.brand}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed">{p.pitch}</p>
                  </div>
                  <ul className="flex flex-col gap-1.5 text-[14px]">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2">
                        <Check width={16} height={16} className="mt-0.5 shrink-0" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-[var(--gray-100)] pt-4">
                    <div>
                      <p className="num text-[24px] leading-none font-semibold">{money(p.payout_cents)}</p>
                      <p className="muted mt-1 text-[13px]">per drop piece sold</p>
                    </div>
                    <p className="muted max-w-[16ch] text-right text-[12px] leading-snug">{p.drops}</p>
                  </div>
                  <AmbassadorApply brand={p.brand} campus={where} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="brands" className="mt-16 grid scroll-mt-[calc(var(--header)+16px)] gap-10 border-t-2 border-ink pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-12" aria-label="For brands">
          <div>
            <span className="stamp">
              <span className="stamp-dot" /> For brands
            </span>
            <h2 className="display mt-4 text-[clamp(2.25rem,4vw,3.5rem)]">Fund a program.</h2>
            <p className="muted mt-3 max-w-[42ch] text-[15px] leading-relaxed">
              Pick the campuses, set a payout per piece sold, and fund the budget. Bidd finds the reps, tracks every sale to a code and pays them
              out. Your pieces ship from you or the chapter&apos;s licensed vendor; Bidd never prints merch.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href={withLab("/brands", lab)} className="pill pill-ink pill-sm">
                See brand collabs
              </Link>
              <Link href={withLab("/gameday", lab)} className="inline-flex items-center gap-2 text-[15px] font-bold underline-offset-4 hover:underline">
                Gameday drops <Arrow width={18} height={18} />
              </Link>
            </div>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-[4px] border border-[var(--gray-100)] bg-[var(--gray-100)] sm:grid-cols-2">
            {[
              ["Set the program", "Campuses, payout per piece sold, number of reps and a budget cap."],
              ["Bidd matches reps", "School email verified students apply. Bidd ranks them by chapter, sales and campus reach."],
              ["Reps drive the drop", "Each rep gets a drop code and an event kit. Every sale through the code counts."],
              ["Bidd handles payouts", "Reps are paid when the drop closes. You get one invoice and a sales report per campus."],
            ].map(([h, b], i) => (
              <li key={h} className="bg-paper p-5">
                <span className="display text-[2.5rem] leading-none">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-3 text-[17px] font-semibold">{h}</p>
                <p className="muted mt-1 text-[14px] leading-relaxed">{b}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Shell>
  );
}
