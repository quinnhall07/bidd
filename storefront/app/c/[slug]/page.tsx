// One closet route, three headers: personal (Depop's shop page), chapter (code-gated), brand.
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampus, getCloset, getCup, getViewer } from "@/lib/data";
import { byState, raisedCents, withLab, withPhase, type Lab } from "@/lib/lab";
import { cupDay, initials, money, plural } from "@/lib/format";
import { chapterName, one, setup } from "@/lib/page";
import type { Campus, Chapter, Closet } from "@/lib/types";
import { CampusMark, Shell } from "@/components/shell";
import { GridSkeleton, ListingGrid } from "@/components/listing";
import { DropCard, DropStrip } from "@/components/drops";
import { EmptyState } from "@/components/empty-state";
import { CodeGate } from "@/components/code-gate";
import { Check, Plus } from "@/components/icons";

// Aliases so the screenshot matrix and lab links work on every campus.
const ALIAS: Record<string, string> = { "demo-chapter": "kappa-delta", demo: "kappa-delta" };

export default async function ClosetPage({ params, searchParams }: PageProps<"/c/[slug]">) {
  const { slug: raw } = await params;
  const { params: query, lab, campuses, campus, cid, now } = await setup(searchParams);
  const slug = ALIAS[raw] ?? raw;
  const data = await getCloset(cid, slug);
  if (!data) notFound();
  const { closet, chapter } = data;
  const tab = one(query.tab) === "sold" ? "sold" : "active";
  const home = await getCampus(cid);

  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav={slug === "me" ? "closet" : "home"}>
      {closet.type === "chapter" && chapter ? (
        <ChapterCloset closet={closet} chapter={chapter} data={data} lab={lab} campus={campus} home={home!} cid={cid} now={now} slug={raw} />
      ) : closet.type === "brand" ? (
        <BrandCloset closet={closet} data={data} lab={lab} now={now} />
      ) : (
        <PersonalCloset closet={closet} chapter={chapter} data={data} lab={lab} campus={campus} home={home!} tab={tab} slug={raw} />
      )}
    </Shell>
  );
}

type Data = NonNullable<Awaited<ReturnType<typeof getCloset>>>;

function Tabs({ lab, slug, tab, active, sold }: { lab: Lab; slug: string; tab: string; active: number; sold: number }) {
  return (
    <div className="flex gap-6 border-b border-[var(--gray-100)]" role="tablist">
      {[
        ["active", `Active ${active}`],
        ["sold", `Sold ${sold}`],
      ].map(([id, label]) => (
        <Link
          key={id}
          role="tab"
          aria-selected={tab === id}
          href={withLab(`/c/${slug}`, lab, { tab: id === "sold" ? "sold" : null })}
          className="-mb-px border-b-2 border-transparent pb-3 text-[15px] font-semibold text-[var(--gray-600)] aria-selected:border-ink aria-selected:text-ink"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

function PersonalCloset({ closet, chapter, data, lab, campus, home, tab, slug }: { closet: Closet; chapter: Chapter | null; data: Data; lab: Lab; campus: Campus | null; home: Campus; tab: string; slug: string }) {
  const own = closet.slug === "me";
  const all = byState(data.listings, lab);
  const active = all.filter((l) => l.status === "active");
  const sold = all.filter((l) => l.status === "sold");
  const rows = tab === "sold" ? sold : active;
  const first = closet.name.split(" ")[0];
  const verifiedB = lab.v === "b";

  return (
    <>
      <section className="column grid gap-8 pt-10 pb-8 md:grid-cols-[auto_1fr_auto] md:items-start md:gap-10 md:pt-14">
        <div className="relative size-24 md:size-32">
          <div className="grid size-full place-items-center rounded-full bg-ink text-[32px] font-bold text-paper md:text-[40px]">{initials(closet.name)}</div>
          {verifiedB && (
            <span className="absolute right-0 bottom-0 grid size-8 place-items-center rounded-full border-[3px] border-paper bg-ink text-paper md:size-9" title={`${home.name} verified`}>
              <Check width={16} height={16} strokeWidth={3} />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="display text-[clamp(2.75rem,5vw,4.5rem)]">{own ? "Your closet." : closet.name}</h1>
          <p className="muted mt-2 text-[15px]">
            @{closet.handle}
            {own && <span> · {closet.name}</span>}
          </p>
          {!verifiedB && (
            <p className="mt-4 flex flex-wrap items-center gap-x-2 text-[15px] font-semibold">
              <Check width={18} height={18} strokeWidth={2.5} className="text-[var(--campus-line)]" />
              {campus ? `${home.name} verified` : "Campus verified"} <span className="muted font-normal">· {closet.sold_count} sold · {closet.active_label}</span>
            </p>
          )}
          {verifiedB && <p className="muted mt-4 text-[15px]">{closet.sold_count} sold · {closet.active_label}</p>}
          <p className="mt-4 max-w-[56ch] text-[16px] leading-relaxed">{closet.bio}</p>
          {chapter && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={withLab(`/c/${chapter.slug}`, lab)} className="stamp hover:bg-[var(--gray-50)]">
                <span className="stamp-dot" /> {chapterName(chapter, lab)}
              </Link>
              {campus && <span className="stamp">{home.city}</span>}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          {own ? (
            <>
              <button className="pill pill-ink">
                <Plus width={18} height={18} /> Sell a piece
              </button>
              <button className="pill pill-line">Edit closet</button>
            </>
          ) : (
            <button className="pill pill-line">Share closet</button>
          )}
        </div>
      </section>

      <div className="column pb-24">
        <Tabs lab={lab} slug={slug} tab={tab} active={active.length} sold={sold.length} />
        <div className="pt-8">
          {lab.state === "loading" ? (
            <GridSkeleton count={5} />
          ) : rows.length ? (
            <ListingGrid listings={rows} lab={lab} />
          ) : all.length ? (
            <EmptyState size="s" title={tab === "sold" ? "Nothing sold yet." : "Everything's sold."} body={tab === "sold" ? "Sold pieces land here, with what they went for." : `${own ? "You've" : `${first} has`} sold every piece. ${own ? "Post the next one." : "Check the sold tab to see what went."}`} />
          ) : own ? (
            <EmptyState
              photo="closet"
              title="Post your first piece."
              body="It takes 30 seconds: one photo, and Bidd fills in the title, size and price. You keep 100% of it. Every sale is points for your chapter in the Fall Cup."
              actions={
                <button className="pill pill-ink">
                  <Plus width={18} height={18} /> Sell a piece
                </button>
              }
            />
          ) : (
            <EmptyState
              size="s"
              title={`${first} hasn't posted yet.`}
              body={chapter ? `Shop ${chapterName(chapter, lab)}'s closet while you wait, or see what's new on campus.` : "See what's new on campus while you wait."}
              actions={
                <>
                  {chapter && (
                    <Link href={withLab(`/c/${chapter.slug}`, lab)} className="pill pill-ink">
                      Shop {chapterName(chapter, lab)}
                    </Link>
                  )}
                  <Link href={withLab("/", lab)} className="pill pill-line">
                    Back to the feed
                  </Link>
                </>
              }
            />
          )}
        </div>
      </div>
    </>
  );
}

async function ChapterCloset({ closet, chapter, data, lab, campus, home, cid, now, slug }: { closet: Closet; chapter: Chapter; data: Data; lab: Lab; campus: Campus | null; home: Campus; cid: string; now: number; slug: string }) {
  const name = chapterName(chapter, lab);
  const cup = await getCup(cid);
  const rank = cup.findIndex((r) => r.chapter_id === chapter.id) + 1;
  const viewer = campus ? await getViewer(cid) : null;
  const notSetUp = lab.state === "empty";
  const locked = lab.gate === "locked" && !notSetUp;
  const drops = notSetUp ? [] : data.drops.map((d) => (d.slug === "bid-day" || data.drops.length === 1 ? withPhase(d, lab.drop, now) : d));
  const live = drops.find((d) => d.slug === "bid-day") ?? drops[0];
  const listings = byState(data.listings, lab);
  const officer = lab.viewer === "officer";

  return (
    <>
      <section data-ground="dark" className="ink-band bg-ink text-paper">
        <div className="column grid gap-8 py-12 md:grid-cols-[1fr_auto] md:items-end md:py-16">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="stamp">
                <span className="stamp-dot" /> Chapter closet
              </span>
              {rank > 0 && !notSetUp && (
                <span className="stamp">
                  #{rank} in the Fall Cup · day {cupDay(now)}
                </span>
              )}
            </div>
            <h1 className={`display mt-6 ${lab.names === "letters" ? "text-[clamp(5rem,12vw,10rem)]" : "text-[clamp(3.5rem,8vw,7rem)]"}`}>{name}</h1>
            <p className="muted mt-4 flex flex-wrap items-center gap-x-2 text-[16px]">
              {lab.names === "letters" && <span className="font-semibold text-paper">{chapter.national_org} ·</span>}
              {campus ? home.name : "Every campus"} · {plural(chapter.members, "member")}
              {!notSetUp && <> · {closet.sold_count} sold · {closet.active_label}</>}
            </p>
            {!notSetUp && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--gray-800)] px-4 py-2 text-[14px] font-semibold">
                {lab.v === "b" ? `${money(drops.reduce((n, d) => n + raisedCents(d), 0))} raised` : `10% of every drop → ${chapter.philanthropy}`}
                {lab.v === "b" && <span className="text-[var(--dim)]">for {chapter.philanthropy}</span>}
              </p>
            )}
          </div>
          {campus && (
            <div className="flex items-center gap-3 md:flex-col md:items-end">
              <CampusMark campus={campus} lab={lab} tone="dark" size={56} />
              <p className="muted text-[13px]">{home.full_name}</p>
            </div>
          )}
        </div>
        <div className="tape" aria-hidden="true" />
      </section>

      {lab.v === "b" && live && !notSetUp && <DropStrip drop={live} lab={lab} now={now} />}

      {officer && !notSetUp && (
        <div className="border-b border-[var(--gray-100)] bg-[var(--gray-50)]">
          <div className="column flex flex-wrap items-center gap-3 py-3 text-[14px]">
            <span className="font-semibold">Officer tools</span>
            <span className="muted">Access code {closet.access_code}</span>
            <span className="ml-auto flex flex-wrap gap-2">
              <button className="pill pill-line pill-sm">Change code</button>
              <button className="pill pill-line pill-sm">Export drop orders (CSV)</button>
              <button className="pill pill-ink pill-sm">
                <Plus width={16} height={16} /> New drop
              </button>
            </span>
          </div>
        </div>
      )}

      <div className="column pb-24">
        {notSetUp ? (
          <div className="pt-10">
            {officer ? (
              <EmptyState
                photo="hangers"
                title="Set up your chapter closet."
                body={`Pick an access code, invite members, and run your first drop here instead of a Google Form and a Venmo thread. ${name}'s sales start counting toward the Fall Cup the moment it opens.`}
                actions={
                  <>
                    <button className="pill pill-ink">Set up the closet</button>
                    <button className="pill pill-line">See how drops work</button>
                  </>
                }
              />
            ) : (
              <EmptyState
                photo="hangers"
                title="Your chapter's closet isn't open yet."
                body={`An officer opens it with an access code, then drops and members' resale show up here. Until then, every piece you post still counts toward ${name} in the Fall Cup.`}
                actions={
                  <>
                    <Link href={withLab("/c/me", lab)} className="pill pill-ink">
                      <Plus width={18} height={18} /> Post a piece
                    </Link>
                    <button className="pill pill-line">Ask an officer to open it</button>
                  </>
                }
              />
            )}
          </div>
        ) : locked ? (
          <div className="relative pt-10">
            {lab.v !== "b" && (
              <div className="relative z-10 border-t-2 border-ink pt-8">
                <CodeGate code={closet.access_code!} chapter={name} viewer={lab.viewer} unlockHref={withLab(`/c/${slug}`, { ...lab, gate: "unlocked" })} />
              </div>
            )}
            {lab.v === "b" && (
              <>
                <h2 className="display text-[clamp(2.25rem,4vw,3.25rem)] text-[var(--gray-400)]">Members only.</h2>
                <CodeGate sheet code={closet.access_code!} chapter={name} viewer={lab.viewer} unlockHref={withLab(`/c/${slug}`, { ...lab, gate: "unlocked" })} />
              </>
            )}
            <div aria-hidden="true" className="pointer-events-none mt-10 select-none opacity-70 blur-[14px] saturate-50">
              {lab.state === "loading" ? <GridSkeleton count={10} /> : <ListingGrid listings={(listings.length ? listings : data.listings).slice(0, 10)} lab={lab} />}
            </div>
          </div>
        ) : (
          <>
            {drops.length > 0 && (
              <section className="pt-10">
                <div className="flex flex-wrap items-end justify-between gap-4 border-t-2 border-ink pt-6">
                  <h2 className="display text-[clamp(2.25rem,4vw,3.25rem)]">Drops.</h2>
                  <p className="muted text-[15px]">Printed by the chapter&apos;s licensed vendor. No buyer fee on drops.</p>
                </div>
                <ul className="mt-6 grid gap-x-4 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
                  {drops.map((d) => (
                    <li key={d.id}>
                      <DropCard drop={d} lab={lab} now={now} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="pt-14">
              <div className="flex flex-wrap items-end justify-between gap-4 border-t-2 border-ink pt-6">
                <h2 className="display text-[clamp(2.25rem,4vw,3.25rem)]">Members&apos; closet.</h2>
                <p className="muted num text-[15px]">
                  {plural(listings.length, "piece")} from {name} members{viewer?.chapter_id === chapter.id ? ", including you" : ""}
                </p>
              </div>
              <div className="pt-6">
                {lab.state === "loading" ? (
                  <GridSkeleton />
                ) : listings.length ? (
                  <ListingGrid listings={listings} lab={lab} />
                ) : (
                  <EmptyState size="s" title="No member resale yet." body={`When ${name} members post, their pieces show up here for the chapter first.`} />
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

function BrandCloset({ closet, data, lab, now }: { closet: Closet; data: Data; lab: Lab; now: number }) {
  const drops = data.drops.map((d) => withPhase(d, lab.drop, now));
  return (
    <>
      <section className="column pt-12 pb-8 md:pt-16">
        <span className="stamp">
          <span className="stamp-dot" /> Brand closet · demo
        </span>
        <h1 className="display mt-6 text-[clamp(3.5rem,8vw,7rem)]">{closet.name}</h1>
        <p className="muted mt-4 max-w-[56ch] text-[16px] leading-relaxed">{closet.bio}</p>
      </section>
      <div className="column pb-24">
        <ul className="grid gap-x-4 gap-y-8 border-t-2 border-ink pt-8 md:grid-cols-2 lg:grid-cols-3">
          {byState(drops, lab).map((d) => (
            <li key={d.id}>
              <DropCard drop={d} lab={lab} now={now} />
            </li>
          ))}
        </ul>
        {byState(drops, lab).length === 0 && <EmptyState size="s" title="No drops yet." body="Co-branded drops with chapters show up here." />}
      </div>
    </>
  );
}
