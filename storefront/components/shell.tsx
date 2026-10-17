// Page frame: campus theme, header, footer, mobile tab bar and the lab panel.
// Bidd frames in black and white; the campus fills through the --campus-* variables set here.
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { campusTheme } from "@/lib/brand/campus";
import { BiddMark, BiddWordmark } from "@/lib/brand/bidd-logo";
import { dropPhase, dropStock, SHORT, withLab, type Lab } from "@/lib/lab";
import { getChapters, getCup, getDrops, getFeed } from "@/lib/data";
import { cupDay } from "@/lib/format";
import { chapterName } from "@/lib/page";
import { Spotlight } from "./spotlight";
import { RepaintSweep } from "./repaint";
import type { Campus } from "@/lib/types";
import { Compass, Hanger, Home, Plus, Search, Trophy } from "./icons";
import { LabPanel } from "./lab-panel";
import { AccountChip } from "./account-chip";

type Nav = "home" | "discover" | "cup" | "closet" | "drop" | "item" | "sell" | "gameday" | "brands" | "store" | "ambassadors";

/** The campus's identity, always apart from the Bidd logo: official logo, Bidd's type badge, or just the dot. */
export function CampusMark({ campus, lab, tone = "light", size = 30 }: { campus: Campus; lab: Lab; tone?: "light" | "dark"; size?: number }) {
  if (lab.logos === "official" && campus.logo_url) {
    const src = tone === "dark" ? (campus.logo_url_dark ?? campus.logo_url) : campus.logo_url;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
  }
  if (lab.logos === "badge")
    return (
      <span className="field display inline-flex h-7 shrink-0 items-center rounded-[4px] px-2 pt-[2px] text-[17px] leading-none">
        {SHORT[campus.slug] ?? campus.name}
      </span>
    );
  return <span className="duo-dot" />;
}

export async function Shell({ lab, campus, campuses, nav, children }: { lab: Lab; campus: Campus | null; campuses: Campus[]; nav: Nav; children: ReactNode }) {
  const ticker = lab.ticker === "on" ? await tickerItems(lab, campus) : [];
  const style = campus ? campusTheme({ primary: campus.primary_color, secondary: campus.secondary_color }) : undefined;
  // Paths may carry their own query ("/?view=moments"): merge it with the lab params instead of appending a second "?".
  const href = (path: string) => {
    const [p, q] = path.split("?");
    return withLab(p, lab, Object.fromEntries(new URLSearchParams(q)));
  };
  // xl: links that only fit on wide screens; below lg, home carries the same routes as tiles.
  const links: { id: Nav; label: string; path: string; xl?: boolean }[] = [
    { id: "discover", label: "Discover", path: "/?view=moments", xl: true },
    { id: "gameday", label: "Gameday", path: "/gameday" },
    { id: "brands", label: "Brands", path: "/brands" },
    { id: "ambassadors", label: "Ambassadors", path: "/ambassadors" },
    { id: "cup", label: "Closet Cup", path: "/cup" },
    { id: "closet", label: "Your closet", path: "/c/me", xl: true },
  ];
  return (
    <div
      style={style}
      data-duo={campus ? lab.duo : "off"}
      data-card={lab.card}
      data-school={campus?.slug ?? "none"}
      data-fx={lab.fx}
      data-heads={lab.heads}
      data-photos={lab.photos}
      data-motion={lab.motion}
      data-header={lab.header}
      data-corners={lab.corners}
      data-grid={lab.grid}
      data-ticker={ticker.length ? "on" : "off"}
      className="flex min-h-dvh flex-col bg-paper text-ink"
    >
      {lab.fx === "spotlight" && <Spotlight />}
      {lab.motion === "on" && <RepaintSweep school={campus?.slug ?? "none"} />}
      <header className="site-header sticky top-0 z-30 bg-paper">
        <div className="column flex h-[var(--header)] items-center gap-4 md:gap-6">
          {lab.v !== "b" && (
            <Link href={href("/")} aria-label="Bidd home" className="shrink-0">
              <BiddWordmark className="h-[24px] w-auto text-ink md:h-[28px]" />
            </Link>
          )}
          {campus ? (
            <Link href={href("/")} className={`hidden shrink-0 items-center gap-2.5 md:flex ${lab.v === "b" ? "" : "border-l border-[var(--gray-200)] pl-4 md:pl-6"}`}>
              <CampusMark campus={campus} lab={lab} />
              <span className="text-[15px] font-semibold">{campus.name}</span>
              {lab.logos === "official" && <span className="duo-dot" aria-hidden="true" />}
            </Link>
          ) : null}
          <form action="/" className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-[var(--gray-50)] px-4 md:max-w-[560px]">
            {lab.v === "b" ? (
              <Link href={href("/")} aria-label="Bidd home" className="-ml-1 shrink-0">
                <BiddMark className="h-[22px] w-auto text-ink" />
              </Link>
            ) : (
              <Search className="shrink-0 text-[var(--gray-600)]" />
            )}
            {[...labHidden(lab)].map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <input
              name="q"
              placeholder={campus ? `Search ${campus.name}` : "Search every campus"}
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--gray-600)]"
            />
          </form>
          <nav className="ml-auto hidden items-center gap-5 lg:flex">
            {links.map((l) => (
              <Link key={l.id} href={href(l.path)} aria-current={nav === l.id ? "page" : undefined} className={`${l.xl ? "hidden xl:inline" : ""} text-[15px] font-semibold whitespace-nowrap text-[var(--gray-600)] transition-colors hover:text-ink aria-[current=page]:text-ink`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <AccountChip demoCampus={Boolean(campus)}>
            <Link href={href("/login")} className="pill pill-ink pill-sm hidden md:inline-flex">
              Sign in
            </Link>
          </AccountChip>
          {campus && (
            <Link href={href("/sell")} aria-current={nav === "sell" ? "page" : undefined} className="pill pill-ink pill-sm hidden md:inline-flex">
              <Plus width={16} height={16} /> Sell
            </Link>
          )}
        </div>
        <div className="border-b border-[var(--gray-100)]" />
        <div className="tape" aria-hidden="true" />
        {ticker.length > 0 && (
          <div data-ground="dark" className="ticker ink-band overflow-hidden bg-ink text-paper" aria-label="What's happening">
            <div className="ticker-track flex w-max">
              {[0, 1].map((copy) => (
                <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
                  {ticker.map((t, i) => (
                    <li key={i} className="flex h-[38px] items-center gap-3 px-5 text-[12.5px] font-bold tracking-[0.06em] whitespace-nowrap uppercase">
                      <span className="size-2 rounded-full bg-[var(--campus-on-dark)]" />
                      {t}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pb-24 md:pb-0">{children}</main>

      <footer data-ground="dark" className="ink-band bg-ink text-paper">
        <div className="tape" aria-hidden="true" />
        <div className="column grid gap-10 py-16 md:grid-cols-[1fr_auto] md:items-end md:py-20">
          <div>
            <BiddWordmark tone="dark" className="h-12 w-auto text-paper md:h-16" />
            <p className="display mt-6 text-[clamp(2.5rem,5vw,4rem)]">Be 1 of 1.</p>
            <p className="muted mt-3 text-[17px]">Exclusive pieces, any university.</p>
          </div>
          <p className="muted max-w-[420px] text-[13px] leading-relaxed md:text-right">
            Demo build on mock data. School logos identify each campus for the hackathon demo only. Chapter and brand names are
            demo seed content, not partnerships.
          </p>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--gray-100)] bg-paper pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Tabs">
        <div className="grid h-16 grid-cols-5 items-center text-[11px] font-semibold">
          {[
            { id: "home", label: "Home", path: "/", icon: Home },
            { id: "discover", label: "Discover", path: "/?view=moments", icon: Compass },
            { id: "sell", label: "Sell", path: "/sell", icon: Plus },
            { id: "cup", label: "Cup", path: "/cup", icon: Trophy },
            { id: "closet", label: "Closet", path: "/c/me", icon: Hanger },
          ].map(({ id, label, path, icon: I }) =>
            id === "sell" ? (
              <Link key={id} href={href(path)} aria-label="Sell" className="mx-auto grid size-11 place-items-center rounded-full bg-ink text-paper">
                <I />
              </Link>
            ) : (
              <Link key={id} href={href(path)} aria-current={nav === id ? "page" : undefined} className="flex flex-col items-center gap-1 text-[var(--gray-600)] aria-[current=page]:text-ink">
                <I />
                {label}
              </Link>
            ),
          )}
        </div>
      </nav>

      <Suspense>
        <LabPanel
          on={lab.on}
          campuses={campuses.map((c) => ({ slug: c.slug, name: c.name, short: SHORT[c.slug] ?? c.name, primary: c.primary_color, secondary: c.secondary_color }))}
        />
      </Suspense>
    </div>
  );
}

/** Lab params carried through the search form as hidden fields. */
function labHidden(lab: Lab) {
  const q = new URLSearchParams(withLab("/", lab).split("?")[1] ?? "");
  return q.entries();
}

/** Ticker lines from live campus data: drops, the Cup, the feed. */
async function tickerItems(lab: Lab, campus: Campus | null) {
  const cid = campus?.slug ?? "ua";
  const now = Date.now();
  const [drops, cup, chapters, feed] = await Promise.all([getDrops(cid), getCup(cid), getChapters(cid), getFeed(cid)]);
  const where = campus ? campus.name : "every campus";
  const items: string[] = [];
  for (const d of drops) {
    const p = dropPhase(d, now);
    if (p === "ended") continue;
    const ch = chapters.find((c) => c.id === d.chapter_id)!;
    if (d.auction) items.push(`Sealed bids open · ${d.name} · ${d.auction.bid_count} bids in for ${d.auction.pieces} pieces`);
    else if (p === "upcoming") items.push(`Opens soon · ${d.name} · ${chapterName(ch, lab)}`);
    else items.push(`Live now · ${d.name} · ${dropStock(d).left} of ${dropStock(d).total} left`);
  }
  if (cup[0]) items.push(`Fall Cup day ${cupDay(now)} · ${chapterName(cup[0].chapter, lab)} leads ${where} with ${cup[0].points.toLocaleString("en-US")} pts`);
  items.push(`${feed.filter((l) => l.status === "active").length} pieces on the rack at ${where}`);
  items.push("0% seller fee · every sale is points for your chapter");
  items.push("Be 1 of 1.");
  return items;
}
