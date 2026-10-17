// Campus feed: Depop's Home grid with Bidd's layer (campus color, moment tags, drop banner, Cup strip).
import Image from "next/image";
import Link from "next/link";
import { getCampus, getChapters, getCup, getDrops, getFeed, getViewer } from "@/lib/data";
import { byState, withLab, withPhase } from "@/lib/lab";
import { cupDay, plural } from "@/lib/format";
import { one, setup } from "@/lib/page";
import { MOMENTS, type Moment } from "@/lib/types";
import { Shell } from "@/components/shell";
import { GridSkeleton, ListingGrid } from "@/components/listing";
import { DropBanner, DropHero, DropRail } from "@/components/drops";
import { EmptyState } from "@/components/empty-state";
import { CupBars } from "@/components/cup";
import { Arrow, Plus } from "@/components/icons";
import { SmartSearchBadge } from "@/components/smart-search-badge";
import { LiveFeed } from "@/components/live-feed";
import { applySmartFilters, smartSearch } from "@/lib/smart-search";

const SIZES = ["XS", "S", "M", "L", "XL"];
const tagSlug = (m: string) => m.toLowerCase().replace(/ /g, "-");
const MOMENT_PHOTO: Record<Moment, string> = {
  Rush: "/photos/pexels-4492631.jpg",
  "Bid Day": "/photos/pexels-5450671.jpg",
  Gameday: "/photos/pexels-19895956.jpg",
  Formal: "/photos/pexels-19895955.jpg",
  Casual: "/photos/pexels-14641437.jpg",
  Philanthropy: "/photos/pexels-15114700.jpg",
};

export default async function Home({ searchParams }: PageProps<"/">) {
  const { params, lab, campuses, campus, cid, now } = await setup(searchParams);
  const tag = MOMENTS.find((m) => tagSlug(m) === one(params.tag)) ?? null;
  const size = SIZES.find((s) => s === one(params.size)) ?? null;
  const sort = one(params.sort) === "price" ? "price" : "new";
  const q = one(params.q)?.trim().toLowerCase() || null;
  const view = one(params.view);

  const everything = byState(await getFeed(cid), lab);
  let rows = byState(await getFeed(cid, { tag, size, sort }), lab);
  const smart = q ? await smartSearch(q, campus?.name) : null;
  if (smart) rows = applySmartFilters(rows, smart.filters, { order: sort === "price" ? "input" : "relevance" });
  const newCampus = everything.length === 0 && lab.state !== "loading";
  // The hero features one drop (switchable with ?feature=); the lab's drop phase applies to it.
  const featureSlug = one(params.feature) ?? "bid-day";
  const allDrops = await getDrops(cid);
  const featuredSlug = allDrops.some((d) => d.slug === featureSlug) ? featureSlug : "bid-day";
  const drops = allDrops.map((d) => (d.slug === featuredSlug ? withPhase(d, lab.drop, now) : d));
  const featured = drops.find((d) => d.slug === featuredSlug)!;
  const chapters = await getChapters(cid);
  const featuredChapter = chapters.find((c) => c.id === featured.chapter_id)!;
  const home = (await getCampus(cid))!;
  const showDrops = !newCampus && lab.state !== "loading";
  const viewer = campus ? await getViewer(cid) : null;
  const cup = (await getCup(cid)).map((r) => (lab.state === "empty" ? { ...r, points: 0 } : r));

  const link = (extra: Record<string, string | null>) =>
    withLab("/", lab, { tag: tag ? tagSlug(tag) : null, size, sort: sort === "price" ? "price" : null, ...extra });
  const where = campus ? `at ${campus.name}` : "across every campus";

  // Nearest filter that has results, for the no-results state.
  const nearest = rows.length === 0 && !newCampus && (tag || size) ? await nearestFilter(cid, tag, size, lab) : null;

  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav={view === "moments" ? "discover" : "home"}>
      {!campus && <SignInBand />}
      {lab.v === "c" && showDrops && <DropHero drop={featured} drops={drops} chapters={chapters} campus={home} lab={lab} now={now} />}

      <div className="column pt-6 md:pt-8">
        {lab.v === "a" && showDrops && <DropBanner drop={featured} chapter={featuredChapter} campus={home} lab={lab} now={now} />}
        {/* Real listings from the API for a signed-in student (client-only; renders nothing otherwise). */}
        <LiveFeed lab={lab} />
        {showDrops && (
          <DropRail
            drops={lab.v === "b" ? drops : drops.filter((d) => d.id !== featured.id)}
            chapters={chapters}
            campus={home}
            lab={lab}
            now={now}
            title={lab.v === "b" ? `Drops ${where}.` : `More drops ${where}.`}
          />
        )}

        {campus && !newCampus && lab.state !== "loading" && (
          <section className="mt-10 grid gap-6 border-t-2 border-ink pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-12" aria-label="Closet Cup">
            <div>
              <span className="stamp">
                <span className="stamp-dot" /> Fall Cup · day {cupDay(now)}
              </span>
              <h2 className="display mt-4 text-[clamp(2.25rem,4vw,3.5rem)]">The Cup.</h2>
              <p className="muted mt-3 max-w-[38ch] text-[15px] leading-relaxed">Every sale on Bidd is points for your chapter. Here is {campus.name} today.</p>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link href={withLab("/sell", lab)} className="pill pill-ink pill-sm">
                  <Plus width={16} height={16} /> Sell a piece
                </Link>
                <Link href={withLab("/cup", lab)} className="inline-flex items-center gap-2 text-[15px] font-bold underline-offset-4 hover:underline">
                  Full standings <Arrow width={18} height={18} />
                </Link>
              </div>
            </div>
            <CupBars rows={cup.slice(0, 4)} lab={lab} mine={viewer?.chapter_id} scope="campus" compact />
          </section>
        )}

        {lab.state !== "loading" && <Explore lab={lab} slug={campus?.slug ?? null} where={where} />}
      </div>

      {/* Moment tags: sticky between search and grid. */}
      {!newCampus && (
        <div className="sticky top-[var(--sticky-top)] z-20 mt-6 bg-paper">
          <div className="column no-scrollbar flex items-center gap-2 overflow-x-auto py-3">
            <Link href={link({ tag: null })} aria-current={!tag} className="chip">
              All
            </Link>
            {MOMENTS.map((m) => (
              <Link key={m} href={link({ tag: tagSlug(m) })} aria-current={tag === m} className="chip">
                {m}
              </Link>
            ))}
            <span className="mx-2 h-6 w-px shrink-0 bg-[var(--gray-200)]" aria-hidden="true" />
            {SIZES.map((s) => (
              <Link key={s} href={link({ size: size === s ? null : s })} aria-current={size === s} className="chip chip-quiet" aria-label={`Size ${s}`}>
                {s}
              </Link>
            ))}
            <span className="ml-auto flex shrink-0 items-center gap-4 pl-4 text-[14px] font-semibold">
              <Link href={link({ sort: null })} aria-current={sort === "new"} className="muted aria-[current=true]:text-ink">
                Newest
              </Link>
              <Link href={link({ sort: "price" })} aria-current={sort === "price"} className="muted aria-[current=true]:text-ink">
                Price low
              </Link>
            </span>
          </div>
        </div>
      )}

      <div className="column pb-24 pt-4">
        {view === "moments" && !newCampus && (
          <section className="mb-12" aria-label="Shop by moment">
            <h2 className="display text-[clamp(2.25rem,4vw,3.5rem)]">Shop by moment.</h2>
            <ul className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
              {MOMENTS.map((m) => (
                <li key={m}>
                  <Link href={withLab("/", lab, { tag: tagSlug(m) })} className="group relative block aspect-[3/4] overflow-hidden bg-[var(--gray-50)]">
                    <Image src={MOMENT_PHOTO[m]} alt="" fill sizes="(min-width: 1280px) 16vw, 50vw" className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]" />
                    <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="display absolute bottom-3 left-3 text-[clamp(1.75rem,2.6vw,2.5rem)] text-paper">{m}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {newCampus ? (
          <div className="pt-6">
            <EmptyState
              photo="rack"
              title={campus ? `Be the first 1 at ${campus.name}.` : "Be the first 1."}
              body={
                <>
                  Bidd just opened {where}. Nobody has posted yet, so the first piece you list is the first thing every
                  {campus ? ` ${campus.name}` : ""} member sees. Rush dresses, gameday fits, formal gowns: one photo and you&apos;re live.
                </>
              }
              actions={
                <>
                  <Link href={withLab("/c/me", lab)} className="pill pill-ink">
                    <Plus width={18} height={18} /> Post a piece
                  </Link>
                  <Link href={withLab("/c/kappa-delta", lab)} className="pill pill-line">
                    Start your chapter&apos;s closet
                  </Link>
                </>
              }
            />
            <div className="mt-16 grid gap-x-12 gap-y-6 border-t border-[var(--gray-100)] pt-8 md:grid-cols-3">
              {[
                ["0% seller fee", "You keep the whole price. Buyers pay a small fee at checkout."],
                ["Handoff on campus", "Meet at an Exchange Spot with a QR code, or ship to their MSC."],
                ["Every sale is points", `The Fall Cup starts with the first sale${campus ? ` at ${campus.name}` : ""}.`],
              ].map(([h, b]) => (
                <div key={h}>
                  <p className="text-[17px] font-semibold">{h}</p>
                  <p className="muted mt-1 text-[15px] leading-relaxed">{b}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pt-6">
              <h1 className="display text-[clamp(2.25rem,4vw,3.5rem)]">
                {q ? `“${q}” ${where}.` : tag ? `${tag} ${where}.` : `New ${where}.`}
              </h1>
              {smart && <SmartSearchBadge by={smart.by} summary={smart.summary} className="basis-full" />}
              {lab.state !== "loading" && <p className="muted num text-[15px] font-semibold">{plural(rows.length, "piece")}</p>}
            </div>
            {lab.state === "loading" ? (
              <GridSkeleton />
            ) : rows.length ? (
              <ListingGrid listings={rows} lab={lab} />
            ) : (
              <EmptyState
                size="s"
                title={`Nothing in ${[tag, size && `size ${size}`].filter(Boolean).join(", ") || `“${q}”`} yet.`}
                body={
                  nearest ? (
                    <>
                      The closest match is <b className="text-ink">{nearest.label}</b>, with {plural(nearest.count, "piece")}. Or clear the filters and see
                      everything {where}.
                    </>
                  ) : (
                    <>Clear the filters to see everything {where}, or save this search and we&apos;ll tell you when something lands.</>
                  )
                }
                actions={
                  <>
                    {nearest && (
                      <Link href={withLab("/", lab, nearest.params)} className="pill pill-ink">
                        Show {nearest.label}
                      </Link>
                    )}
                    <Link href={withLab("/", lab)} className="pill pill-line">
                      Clear filters
                    </Link>
                  </>
                }
              />
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

async function nearestFilter(cid: string, tag: Moment | null, size: string | null, lab: Parameters<typeof byState>[1]) {
  const candidates: { label: string; params: Record<string, string>; count: number }[] = [];
  for (const s of SIZES) {
    if (!tag || s === size) continue;
    const n = byState(await getFeed(cid, { tag, size: s }), lab).length;
    if (n) candidates.push({ label: `${tag}, size ${s}`, params: { tag: tagSlug(tag), size: s }, count: n });
  }
  if (tag) {
    const n = byState(await getFeed(cid, { tag }), lab).length;
    if (n && size) candidates.push({ label: `${tag}, any size`, params: { tag: tagSlug(tag) }, count: n });
  }
  if (size) {
    const n = byState(await getFeed(cid, { size }), lab).length;
    if (n && tag) candidates.push({ label: `size ${size}, any moment`, params: { size }, count: n });
  }
  return candidates.sort((a, b) => b.count - a.count)[0] ?? null;
}

// Merch photos by campus; campuses without their own photo borrow the SEC set.
const MERCH: Record<string, string> = {
  ua: "/merch/crimson-tide.jpg",
  uf: "/merch/florida-gators.jpg",
  lsu: "/merch/lsu-street.jpg",
  uky: "/merch/uk-chrome-hearts.jpg",
};

/** Gameday teaser, then brand collabs, student stores and ambassadors: the deck's other ways in. */
function Explore({ lab, slug, where }: { lab: Parameters<typeof withLab>[1]; slug: string | null; where: string }) {
  const mine = (slug && MERCH[slug]) || MERCH.ua;
  const photos = [mine, ...Object.values(MERCH).filter((m) => m !== mine)].slice(0, 3);
  const tiles = [
    { href: "/brands", stamp: "Brand collabs", title: "Brands drop here.", body: "White Fox, Liquid Death and more drop pieces for one chapter or every campus.", photo: "/merch/liquid-death.jpg" },
    { href: "/store/new", stamp: "Student stores", title: "Open your store.", body: "School email verified sellers get their own storefront on campus. Takes a minute.", photo: null },
    { href: "/ambassadors", stamp: "Ambassadors", title: "Rep a brand.", body: "Brands fund campus reps. Bidd matches you and pays out per piece sold.", photo: "/photos/pexels-5450671.jpg" },
  ];
  return (
    <section className="mt-10 border-t-2 border-ink pt-6" aria-label="Gameday, brands and stores">
      <Link href={withLab("/gameday", lab)} className="group grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-12">
        <div className="flex flex-col">
          <span className="stamp self-start">
            <span className="stamp-dot" /> Gameday
          </span>
          <h2 className="display mt-4 text-[clamp(2.25rem,4vw,3.5rem)]">Big-game drops.</h2>
          <p className="muted mt-3 max-w-[38ch] text-[15px] leading-relaxed">
            Each school drops its own pieces for the big games, and both campuses drop side by side for the matchup. Every campus, one app.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-[15px] font-bold underline-offset-4 group-hover:underline">
            See gameday drops {where} <Arrow width={18} height={18} />
          </span>
        </div>
        <ul className="grid grid-cols-3 gap-2 md:gap-4">
          {photos.map((src) => (
            <li key={src} className="relative aspect-[3/4] overflow-hidden bg-[var(--gray-50)]">
              <Image src={src} alt="" fill sizes="(min-width: 768px) 20vw, 33vw" className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]" />
            </li>
          ))}
        </ul>
      </Link>
      <ul className="mt-8 grid gap-2 md:grid-cols-3 md:gap-4">
        {tiles.map((t) => (
          <li key={t.href}>
            {t.photo ? (
              <Link href={withLab(t.href, lab)} className="group relative flex aspect-[16/10] flex-col justify-end overflow-hidden bg-[var(--gray-50)] p-5 text-paper md:aspect-[4/3]">
                <Image src={t.photo} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                <span className="relative text-[12px] font-bold tracking-[0.06em] uppercase">{t.stamp}</span>
                <span className="display relative mt-2 text-[clamp(2rem,3vw,2.75rem)]">{t.title}</span>
                <span className="relative mt-2 max-w-[40ch] text-[14px] leading-snug text-white/85">{t.body}</span>
              </Link>
            ) : (
              <Link href={withLab(t.href, lab)} data-ground="dark" className="ink-band group flex h-full min-h-[240px] flex-col bg-ink p-5 text-paper md:aspect-[4/3] md:min-h-0">
                <span className="stamp self-start">
                  <span className="stamp-dot" /> {t.stamp}
                </span>
                <span className="display mt-auto text-[clamp(2rem,3vw,2.75rem)]">{t.title}</span>
                <span className="muted mt-2 max-w-[40ch] text-[14px] leading-snug">{t.body}</span>
                <span className="pill pill-paper pill-sm mt-4 self-start">
                  <Plus width={16} height={16} /> Open your store
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SignInBand() {
  return (
    <section data-ground="dark" className="ink-band bg-ink text-paper">
      <div className="column grid gap-8 py-14 md:grid-cols-12 md:items-end md:py-20">
        <div className="md:col-span-7">
          <h1 className="display text-[clamp(3.5rem,8vw,7rem)]">Be 1 of 1.</h1>
          <p className="muted mt-5 max-w-[48ch] text-[clamp(17px,1.6vw,20px)] leading-relaxed">
            The closet for college Greek life, on every campus. Resell your rush wardrobe, shop your chapter&apos;s drops, and every sale counts toward your chapter.
          </p>
        </div>
        <form className="md:col-span-5" action="/login">
          <label htmlFor="email" className="text-[14px] font-semibold">
            Create your account or sign in with your school email
          </label>
          <div className="mt-2 flex gap-2 rounded-full bg-paper p-1.5">
            <input id="email" name="email" type="email" placeholder="you@crimson.ua.edu" className="min-w-0 flex-1 bg-transparent px-4 text-[16px] text-ink outline-none placeholder:text-[var(--gray-600)]" />
            <button className="pill pill-ink pill-sm">Get my code</button>
          </div>
          <p className="muted mt-3 text-[13px]">We email a 6-digit code. Your campus comes from your email: crimson.ua.edu means Alabama.</p>
          <Link href="/?school=ua" className="mt-5 inline-flex items-center gap-2 text-[15px] font-semibold underline-offset-4 hover:underline">
            Just looking? Explore the demo <Arrow width={16} height={16} />
          </Link>
        </form>
      </div>
    </section>
  );
}
