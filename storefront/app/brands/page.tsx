// Brand collabs: every live brand drop across campuses, how a brand drop works (sealed bids, top bids win,
// the brand or the chapter's licensed vendor fulfills; Bidd never prints), and a drop-sponsorship request for brands.
// Every brand partner here is demo data, labeled as such.
import { getChapters, getDrops } from "@/lib/data";
import { dropPhase } from "@/lib/lab";
import { setup } from "@/lib/page";
import { Shell } from "@/components/shell";
import { BrandCard, BrandFeature, type BrandDropRow } from "@/components/brand-card";
import { BrandSponsor } from "@/components/brand-sponsor";

const STEPS = [
  { n: "01", title: "A brand sponsors a drop", body: "The brand pays to sponsor a limited run for one chapter or a whole campus." },
  { n: "02", title: "Students place sealed bids", body: "One hidden bid each, raisable until close. Nobody sees anyone else's bid." },
  { n: "03", title: "Top bids win", body: "When the clock ends, the top bids win the numbered pieces. Everyone else pays nothing." },
  { n: "04", title: "The brand fulfills", body: "The brand or the chapter's licensed vendor makes and ships it. Bidd never prints merch." },
];

export default async function BrandsPage({ searchParams }: PageProps<"/brands">) {
  const { lab, campuses, campus, cid, now } = await setup(searchParams);
  const rows: BrandDropRow[] = [];
  for (const c of campuses) {
    const [drops, chapters] = await Promise.all([getDrops(c.slug), getChapters(c.slug)]);
    for (const drop of drops) {
      if (drop.company.role !== "brand" || dropPhase(drop, now) === "ended") continue;
      const chapter = chapters.find((ch) => ch.id === drop.chapter_id);
      if (chapter) rows.push({ drop, chapter, campus: c });
    }
  }
  // Sealed-bid drops first, then by campus.
  const rank = (r: BrandDropRow) => (r.drop.kind === "auction" ? 0 : 1);
  const mine = rows.filter((r) => r.campus.slug === cid).sort((a, b) => rank(a) - rank(b));
  const others = rows.filter((r) => r.campus.slug !== cid).sort((a, b) => rank(a) - rank(b) || a.campus.name.localeCompare(b.campus.name));
  const home = campus ?? campuses.find((c) => c.slug === cid)!;
  const brands = new Set(rows.map((r) => r.drop.company.name));

  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav="drop">
      <section data-ground="dark" className="ink-band bg-ink text-paper">
        <div className="column py-12 md:py-16">
          <span className="stamp">
            <span className="stamp-dot" /> Brand collabs · {rows.length} live across {new Set(rows.map((r) => r.campus.slug)).size} campuses
          </span>
          <h1 className="display mt-6 max-w-[14ch] text-[clamp(3.5rem,8vw,7rem)]">Brands gain exclusive markets.</h1>
          <p className="muted mt-4 max-w-[54ch] text-[clamp(17px,1.6vw,20px)] leading-relaxed">
            A brand drops pieces made for one chapter or one campus. Students place sealed bids, the top bids win, and every campus sees its own drop in one app. Brand partners shown here ({[...brands].join(", ")}) are demo data, not confirmed partnerships.
          </p>
          <a href="#sponsor" className="pill pill-paper mt-8">
            Sponsor a drop
          </a>
        </div>
        <div className="tape" aria-hidden="true" />
      </section>

      <section aria-label="How a brand drop works" className="border-b border-[var(--gray-100)]">
        <ol className="column grid gap-px py-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="flex flex-col gap-2 py-4 sm:pr-8">
              <span className="display num text-[40px] text-[var(--gray-400)]">{s.n}</span>
              <p className="text-[18px] font-bold">{s.title}</p>
              <p className="muted text-[15px] leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="column pb-24">
        {mine.length > 0 && (
          <section aria-label={`Brand drops at ${home.name}`} className="pt-12">
            <div className="flex flex-wrap items-end justify-between gap-4 border-t-2 border-ink pt-6">
              <h2 className="display text-[clamp(2.25rem,4vw,3.5rem)]">Live at {home.name}.</h2>
              <p className="muted text-[15px]">Brand × chapter, on your campus</p>
            </div>
            <div className="mt-6 grid gap-6">
              {mine.map((r) => (
                <BrandFeature key={r.drop.id} row={r} lab={lab} now={now} />
              ))}
            </div>
          </section>
        )}

        <section aria-label="Brand drops on every campus" className="pt-14">
          <div className="flex flex-wrap items-end justify-between gap-4 border-t-2 border-ink pt-6">
            <h2 className="display text-[clamp(2.25rem,4vw,3.5rem)]">Every campus.</h2>
            <p className="muted text-[15px]">{others.length} brand drops · one app</p>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((r) => (
              <li key={r.drop.id}>
                <BrandCard row={r} lab={lab} now={now} />
              </li>
            ))}
          </ul>
        </section>

        <section id="sponsor" aria-label="Drop sponsorship" className="scroll-mt-24 pt-14">
          <div data-ground="dark" className="rounded-[4px] bg-ink p-[clamp(20px,3vw,40px)] text-paper">
            <span className="stamp">
              <span className="stamp-dot" /> For brands
            </span>
            <h2 className="display mt-5 text-[clamp(2.5rem,5vw,4.5rem)]">Drop sponsorship.</h2>
            <p className="muted mt-3 max-w-[56ch] text-[17px] leading-relaxed">
              Pay to sponsor a drop on campus and reach one chapter or every chapter at once. Students bid on your pieces, and you or the chapter&apos;s licensed vendor fulfill the winners. Bidd runs the bids, the handoff and the payouts.
            </p>
            <div className="mt-8">
              <BrandSponsor campuses={campuses.map((c) => ({ slug: c.slug, name: c.name }))} initial={cid} />
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
