// Seeded mock data for the storefront, shaped like the Supabase tables in build.md (snake_case columns).
// Reads campuses.json + photos.json, writes chapters, profiles, closets, listings, drops and cup.
//   node mock/generate.mjs
// Same seed, same output: every campus gets its own believable feed from the same photo pool.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
const write = (f, data) => writeFileSync(join(dir, f), JSON.stringify(data, null, 2) + "\n");

const campuses = read("campuses.json");
const photos = read("photos.json");

// mulberry32, seeded per campus so each feed is stable
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
const shuffle = (r, xs) => xs.map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

// The same national orgs on every campus, so the SEC view of the Cup compares like with like.
// Real names as plain text (nominative use); `letters` only shows when the lab sets names=letters.
const ORGS = [
  { key: "kd", national_org: "Kappa Delta", letters: "ΚΔ", kind: "sorority", philanthropy: "Prevent Child Abuse America", code: "KD2026" },
  { key: "chio", national_org: "Chi Omega", letters: "ΧΩ", kind: "sorority", philanthropy: "Make-A-Wish", code: "XO2026" },
  { key: "dg", national_org: "Delta Gamma", letters: "ΔΓ", kind: "sorority", philanthropy: "Service for Sight", code: "DG2026" },
  { key: "zta", national_org: "Zeta Tau Alpha", letters: "ΖΤΑ", kind: "sorority", philanthropy: "Breast cancer education", code: "ZT2026" },
  { key: "phimu", national_org: "Phi Mu", letters: "ΦΜ", kind: "sorority", philanthropy: "Children's Miracle Network Hospitals", code: "PM2026" },
  { key: "adpi", national_org: "Alpha Delta Pi", letters: "ΑΔΠ", kind: "sorority", philanthropy: "Ronald McDonald House Charities", code: "AD2026" },
  { key: "sigmachi", national_org: "Sigma Chi", letters: "ΣΧ", kind: "fraternity", philanthropy: "Huntsman Cancer Institute", code: "SX2026" },
];
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const WOMEN = ["Anna Claire", "Mary Kate", "Ellie", "Caroline", "Sarah Beth", "Lily", "Madison", "Reagan", "Hollis", "Emma"];
const MEN = ["Jack", "Will", "Thomas"];
const INITIALS = "BCDFHJLMPRSTW";
const BRANDS = {
  rush_day_dresses: ["Lulus", "Show Me Your Mumu", "Free People", "Princess Polly", "Abercrombie"],
  gameday: ["Lulus", "Judith March", "Altar'd State", "Other", "Boot Barn"],
  formal: ["Lulus", "Windsor", "Revolve", "House of CB", "Princess Polly"],
  casual: ["Levi's", "Madewell", "Aerie", "J.Crew", "Abercrombie"],
  menswear: ["J.Crew", "Southern Tide", "Peter Millar", "Brooks Brothers", "Vineyard Vines"],
  shoes_bags: ["Steve Madden", "Sam Edelman", "Other", "Ariat", "Dolce Vita"],
  accessories: ["Kendra Scott", "BaubleBar", "Other", "Lele Sadoughi"],
};
const CATEGORY = { rush_day_dresses: "dress", gameday: "dress", formal: "dress", casual: "top", menswear: "top", shoes_bags: "shoes", accessories: "accessory" };
const CONDITIONS = ["like new", "like new", "good", "good", "new", "fair"];

const NOW = Date.parse("2026-10-17T14:00:00-05:00");
const HOUR = 3600e3, DAY = 24 * HOUR;
const iso = (t) => new Date(t).toISOString();

const resell = photos.filter((p) => p.context === "resell");
const dropPhoto = (id) => photos.find((p) => p.id === id);
const photoUrl = (p) => `/photos/${p.id}.jpg`;

const chapters = [], profiles = [], closets = [], listings = [], drops = [], cup = [];

for (const campus of campuses) {
  const r = rng(hash(campus.slug));
  const cid = campus.slug;

  // Chapters and their closets (code-gated)
  for (const o of ORGS) {
    const id = `${cid}-${o.key}`;
    chapters.push({
      id, campus_id: cid, national_org: o.national_org, letters: o.letters, kind: o.kind,
      name: `${o.national_org} at ${campus.name}`, philanthropy: o.philanthropy, join_code: o.code, slug: slugify(o.national_org),
      members: 180 + Math.floor(r() * 220),
    });
    closets.push({
      id: `closet-${id}`, campus_id: cid, type: "chapter", owner_id: null, chapter_id: id,
      name: o.national_org, slug: slugify(o.national_org), logo_url: null,
      visibility: "code", access_code: o.code, verified: true,
      bio: `${o.national_org}'s closet at ${campus.name}: chapter drops, member resale, and every sale counts toward the Fall Cup.`,
      sold_count: 40 + Math.floor(r() * 160), active_label: "Active today",
    });
  }
  const sororities = chapters.filter((c) => c.campus_id === cid && c.kind === "sorority");
  const frat = chapters.find((c) => c.campus_id === cid && c.kind === "fraternity");

  // Sellers (personal closets). "me" is the demo viewer's own closet.
  const people = [
    ...shuffle(r, WOMEN).map((n) => ({ n, men: false })),
    ...MEN.map((n) => ({ n, men: true })),
  ];
  const sellers = people.map(({ n, men }, i) => {
    const initial = INITIALS[Math.floor(r() * INITIALS.length)];
    const chapter = men ? frat : sororities[i % sororities.length];
    const handle = `${n.toLowerCase().replace(/ /g, "")}.${initial.toLowerCase()}`;
    const pid = `${cid}-u${i}`;
    profiles.push({ id: pid, campus_id: cid, chapter_id: chapter.id, name: `${n} ${initial}.`, email: `${handle.replace(".", "")}@${campus.email_domains[0]}`, msc_code: String(1000 + Math.floor(r() * 9000)), points: Math.floor(r() * 400) });
    const closet = {
      id: `closet-${pid}`, campus_id: cid, type: "personal", owner_id: pid, chapter_id: chapter.id,
      name: `${n} ${initial}.`, slug: slugify(handle), handle, logo_url: null, visibility: "public", access_code: null, verified: true,
      bio: pick(r, ["Cleaning out after formal season. Bundles welcome.", "Worn once, photographed twice. Meet at the Exchange Spot.", "Senior Clear-out has started early.", "Mostly rush and gameday. Everything is steamed.", "Sizes S/M. Ask about bundles."]),
      sold_count: 3 + Math.floor(r() * 40), active_label: pick(r, ["Active today", "Active today", "Active yesterday", "Active this week"]),
      men,
    };
    closets.push(closet);
    return closet;
  });
  const me = { id: `${cid}-me`, campus_id: cid, chapter_id: sororities[0].id, name: "Taylor M.", email: `taylorm@${campus.email_domains[0]}`, msc_code: "2417", points: 120 };
  profiles.push(me);
  closets.push({ id: `closet-${me.id}`, campus_id: cid, type: "personal", owner_id: me.id, chapter_id: me.chapter_id, name: me.name, slug: "me", handle: "taylor.m", logo_url: null, visibility: "public", access_code: null, verified: true, bio: "Rush wardrobe, gently used.", sold_count: 2, active_label: "Active today", men: false });
  const women = sellers.filter((s) => !s.men), men = sellers.filter((s) => s.men);

  // Brand closet for the co-branded drop (demo seed, not a confirmed partnership)
  closets.push({ id: `closet-${cid}-whitefox`, campus_id: cid, type: "brand", owner_id: null, chapter_id: sororities[0].id, name: "White Fox", slug: "white-fox", logo_url: null, visibility: "public", access_code: null, verified: false, bio: "Demo brand closet for the co-branded drop. Not a confirmed partnership.", sold_count: 0, active_label: "Demo", demo: true });

  // Resale listings: every resell photo once, in a campus-specific order
  const order = shuffle(r, resell);
  order.forEach((p, i) => {
    const seller = p.category === "menswear" ? pick(r, men) : (i % 7 === 3 ? closets.find((c) => c.id === `closet-${me.id}`) : women[i % women.length]);
    const jitter = 0.85 + r() * 0.3;
    const price = Math.max(10, Math.round((p.suggested_price_usd * jitter) / 2) * 2);
    listings.push({
      id: `${cid}-l${String(i + 1).padStart(2, "0")}`, closet_id: seller.id, campus_id: cid,
      title: p.suggested_title, description: `${p.suggested_title}. ${pick(r, ["Smoke-free closet.", "Steamed and ready.", "Meet at the Exchange Spot or ship to your MSC.", "Happy to bundle."])}`,
      category: CATEGORY[p.category] ?? "top", brand: pick(r, BRANDS[p.category] ?? ["Other"]),
      size: p.suggested_size, condition: pick(r, CONDITIONS), price_cents: price * 100, tags: p.moment_tags,
      photo_urls: [photoUrl(p)], dominant_color: p.dominant_color, status: i % 9 === 8 ? "sold" : "active",
      drop_id: null, stock: 1, created_at: iso(NOW - i * 5.5 * HOUR - Math.floor(r() * 3 * HOUR)),
    });
  });

  // Drops: one live now (Bid Day), one upcoming, one brand co-drop, one ended
  const kd = sororities[0], chio = sororities[1], phimu = sororities.find((c) => c.national_org === "Phi Mu");
  const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
  const sizeStock = (totals, left) => SIZES.map((size, i) => ({ size, total: totals[i], stock: left[i] }));
  // Every drop names its collab: the Greek chapter, a company (a brand partner, or the licensed vendor
  // that prints it), and the university when the drop is officially licensed. All demo seed content.
  const VENDOR = "Campus Ink Co.";
  const dropDefs = [
    { slug: "bid-day", name: "Bid Day drop", chapter: kd, hero: "pexels-9594669", banner: "unsplash-RYHvzYdeoCI", also: ["pexels-9594089", "unsplash-t8HiP3e5abg"],
      starts: NOW - 2 * HOUR, ends: Date.parse("2026-10-17T18:00:00-05:00"), sizes: sizeStock([4, 10, 12, 10, 8, 4], [1, 4, 7, 6, 3, 1]), brand_partner: null, university: false },
    { slug: "one-of-one", name: "1 of 1 Big/Little sets", chapter: kd, hero: "pexels-9594422", banner: "pexels-9594422", also: [], kind: "auction",
      starts: NOW - 3 * HOUR, ends: Date.parse("2026-10-17T19:30:00-05:00"), sizes: sizeStock([2, 2, 2, 2, 2, 2], [2, 2, 2, 2, 2, 2]), brand_partner: null, university: false,
      auction: { pieces: 12, min_bid_cents: 6000 } },
    { slug: "gameday-tee", name: "Gameday tee", chapter: chio, hero: "pexels-39277919", banner: "pexels-39277919", also: ["unsplash-t8HiP3e5abg"],
      starts: Date.parse("2026-10-18T19:00:00-05:00"), ends: Date.parse("2026-10-20T19:00:00-05:00"), sizes: sizeStock([6, 12, 14, 12, 8, 4], [6, 12, 14, 12, 8, 4]), brand_partner: null, university: true },
    { slug: "white-fox", name: `White Fox × ${kd.national_org}`, chapter: kd, hero: "pexels-6786666", banner: "pexels-6786666", also: ["pexels-9594089"],
      starts: Date.parse("2026-10-24T18:00:00-05:00"), ends: Date.parse("2026-10-27T18:00:00-05:00"), sizes: sizeStock([6, 14, 16, 14, 10, 6], [6, 14, 16, 14, 10, 6]), brand_partner: "White Fox", brand_closet: `closet-${cid}-whitefox`, university: true },
    { slug: "philanthropy-week", name: "Philanthropy week", chapter: phimu, hero: "unsplash-kWVImL5QxJI", banner: "unsplash-kWVImL5QxJI", also: ["pexels-6787035"],
      starts: Date.parse("2026-09-28T09:00:00-05:00"), ends: Date.parse("2026-10-03T21:00:00-05:00"), sizes: sizeStock([4, 10, 14, 12, 6, 2], [0, 0, 0, 0, 0, 0]), brand_partner: null, university: false },
  ];
  for (const d of dropDefs) {
    const hero = dropPhoto(d.hero), banner = dropPhoto(d.banner);
    const id = `${cid}-${d.slug}`;
    // Sealed bids, highest first (mock): spread from the minimum up to about 2.4x it.
    const auction = d.auction && (() => {
      const count = 38 + Math.floor(r() * 60);
      const bids = Array.from({ length: count }, () => Math.round((d.auction.min_bid_cents * (1 + r() ** 1.8 * 1.4)) / 100) * 100).sort((a, b) => b - a);
      return { ...d.auction, bid_count: count, bids_cents: bids };
    })();
    drops.push({
      id, slug: d.slug, kind: d.kind ?? "preorder", closet_id: d.brand_closet ?? `closet-${d.chapter.id}`, campus_id: cid, chapter_id: d.chapter.id,
      name: d.name,
      description: d.kind === "auction"
        ? "Twelve one-off Big/Little crewneck sets, each hand-finished and numbered. Sealed bids: nobody sees anyone else's bid, and the top 12 win."
        : `${hero.suggested_title}. Printed by the chapter's licensed vendor; ships to your MSC or hands off at the Exchange Spot.`,
      starts_at: iso(d.starts), ends_at: iso(d.ends), licensed_vendor: `${VENDOR} (demo vendor)`, philanthropy_pct: 10,
      brand_partner: d.brand_partner, university_licensed: d.university,
      company: d.brand_partner ? { name: d.brand_partner, role: "brand" } : { name: VENDOR, role: "vendor" },
      price_cents: d.kind === "auction" ? d.auction.min_bid_cents : hero.suggested_price_usd * 100,
      photo_url: photoUrl(hero), banner_url: photoUrl(banner), sizes: d.sizes, auction: auction ?? null,
      raised_cents: d.slug === "philanthropy-week" ? 124000 : Math.floor(r() * 40000),
    });
    [hero, ...d.also.map(dropPhoto)].forEach((p, j) => listings.push({
      id: `${id}-i${j + 1}`, closet_id: d.brand_closet ?? `closet-${d.chapter.id}`, campus_id: cid,
      title: p.suggested_title, description: p.suggested_title, category: "top", brand: d.chapter.national_org,
      size: p.suggested_size, condition: "new", price_cents: p.suggested_price_usd * 100, tags: p.moment_tags,
      photo_urls: [photoUrl(p)], dominant_color: p.dominant_color, status: "active", drop_id: id,
      stock: j === 0 ? d.sizes.reduce((n, s) => n + s.stock, 0) : 24, created_at: iso(d.starts),
    }));
  }

  // Closet Cup (Fall Cup started on Bid Day): the cup_scores view, one row per chapter
  for (const ch of chapters.filter((c) => c.campus_id === cid)) {
    const sales = 8 + Math.floor(r() * 90);
    cup.push({ chapter_id: ch.id, campus_id: cid, national_org: ch.national_org, season: "fall-2026", sales_count: sales, gmv_cents: sales * (2600 + Math.floor(r() * 3000)), points: sales * 10 + Math.floor(r() * 9) * 10 });
  }
}

write("chapters.json", chapters);
write("profiles.json", profiles);
write("closets.json", closets);
write("listings.json", listings);
write("drops.json", drops);
write("cup.json", cup);
console.log(`${campuses.length} campuses · ${chapters.length} chapters · ${closets.length} closets · ${listings.length} listings · ${drops.length} drops · ${cup.length} cup rows`);
