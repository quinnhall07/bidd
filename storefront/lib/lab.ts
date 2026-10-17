// The ?lab=1 panel's state. Everything lives in the URL, so any combination is a link,
// and tools/shots/matrix.mjs can loop through them. Mock-only: delete with the panel.
import type { Drop, DropPhase, DropSize, Listing } from "./types";

export const LAB_OPTIONS = {
  state: ["full", "few", "empty", "loading"],
  v: ["a", "b", "c"],
  card: ["square", "portrait"],
  duo: ["off", "pair", "tape", "jersey"],
  logos: ["official", "badge", "off"],
  drop: ["auto", "upcoming", "live", "low", "soldout", "ended"],
  gate: ["locked", "unlocked"],
  viewer: ["member", "visitor", "officer"],
  names: ["plain", "letters"],
  bid: ["none", "placed", "won", "lost"],
  rule: ["uniform", "first"],
  // Look: effects to try against the brand's flat default.
  fx: ["flat", "grade", "duotone", "grain", "halftone", "spotlight"],
  heads: ["solid", "outline", "offset"],
  photos: ["color", "mono"],
  motion: ["off", "on"],
  ticker: ["off", "on"],
  header: ["solid", "glass"],
  corners: ["square", "soft"],
  grid: ["4", "5", "6"],
} as const;

type Options = typeof LAB_OPTIONS;
export type Lab = { on: boolean; school: string } & { [K in keyof Options]: Options[K][number] };

export const LAB_DEFAULTS: Lab = {
  on: false,
  school: "ua",
  state: "full",
  v: "a",
  card: "square",
  duo: "tape",
  logos: "official",
  drop: "auto",
  gate: "locked",
  viewer: "member",
  names: "plain",
  bid: "none",
  rule: "uniform",
  fx: "flat",
  heads: "solid",
  photos: "color",
  motion: "off",
  ticker: "off",
  header: "solid",
  corners: "square",
  grid: "5",
};

/** One-click looks: each sets several switches at once. */
export const LAB_PRESETS: { id: string; label: string; note: string; set: Partial<Lab> }[] = [
  { id: "brand", label: "Brand default", note: "Flat, as DESIGN.md has it", set: { fx: "flat", heads: "solid", photos: "color", motion: "off", ticker: "off", header: "solid", corners: "square", grid: "5", duo: "tape" } },
  { id: "drop-night", label: "Drop night", note: "Grain, ticker, motion, drop-first", set: { v: "c", fx: "grain", heads: "offset", motion: "on", ticker: "on", header: "glass", duo: "tape" } },
  { id: "editorial", label: "Editorial", note: "Mono photos, outline heads, 4-up", set: { fx: "flat", heads: "outline", photos: "mono", grid: "4", corners: "square", motion: "on", ticker: "off" } },
  { id: "varsity", label: "Varsity", note: "Halftone, jersey type, ticker", set: { fx: "halftone", duo: "jersey", heads: "offset", ticker: "on", motion: "on" } },
  { id: "soft", label: "Soft retail", note: "Gradient fields, soft corners, glass", set: { fx: "grade", corners: "soft", header: "glass", heads: "solid", photos: "color", motion: "on", card: "portrait" } },
];

export const LAB_KEYS = ["school", ...Object.keys(LAB_OPTIONS)] as (keyof Omit<Lab, "on">)[];

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseLab(params: Params): Lab {
  const lab = { ...LAB_DEFAULTS, on: one(params.lab) === "1" };
  const school = one(params.school);
  if (school) lab.school = school;
  for (const key of Object.keys(LAB_OPTIONS) as (keyof Options)[]) {
    const value = one(params[key]);
    if (value && (LAB_OPTIONS[key] as readonly string[]).includes(value)) (lab as Record<string, unknown>)[key] = value;
  }
  return lab;
}

/** The lab part of a query string: lab=1 plus every value that differs from the default. */
export function labQuery(lab: Lab): URLSearchParams {
  const q = new URLSearchParams();
  if (lab.on) q.set("lab", "1");
  for (const key of LAB_KEYS) if (lab[key] !== LAB_DEFAULTS[key]) q.set(key, String(lab[key]));
  return q;
}

/** A link that keeps the current lab settings, plus any page params. */
export function withLab(path: string, lab: Lab, extra: Record<string, string | null | undefined> = {}) {
  const q = labQuery(lab);
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/** full ≈ everything, few = 3, empty and loading = none. */
export function byState<T>(rows: T[], lab: Lab): T[] {
  if (lab.state === "few") return rows.slice(0, 3);
  if (lab.state === "empty" || lab.state === "loading") return [];
  return rows;
}

const left = (sizes: DropSize[]) => sizes.reduce((n, s) => n + s.stock, 0);
const total = (sizes: DropSize[]) => sizes.reduce((n, s) => n + s.total, 0);

export function dropPhase(drop: Drop, now = Date.now()): DropPhase {
  if (now < Date.parse(drop.starts_at)) return "upcoming";
  if (now > Date.parse(drop.ends_at)) return "ended";
  if (drop.kind === "auction") return "live"; // sealed bids have no stock phases
  const n = left(drop.sizes);
  if (n === 0) return "soldout";
  if (n <= 6) return "low";
  return "live";
}

/** Rewrites a drop's window and stock so it lands in the phase the lab asks for. */
export function withPhase(drop: Drop, phase: Lab["drop"], now = Date.now()): Drop {
  if (phase === "auto") return drop;
  if (drop.kind === "auction" && (phase === "low" || phase === "soldout")) phase = "live";
  const H = 3600e3;
  const at = (t: number) => new Date(t).toISOString();
  const live = { starts_at: at(now - 2 * H), ends_at: at(now + 3 * H + 59 * 60e3 + 12e3) };
  const fill = (fn: (s: DropSize, i: number) => number) => drop.sizes.map((s, i) => ({ ...s, stock: Math.min(s.total, fn(s, i)) }));
  switch (phase) {
    case "upcoming":
      return { ...drop, starts_at: at(now + 2 * H + 14 * 60e3 + 9e3), ends_at: at(now + 50 * H), sizes: fill((s) => s.total) };
    case "live":
      return { ...drop, ...live, sizes: fill((s, i) => Math.max(1, Math.round(s.total * [0.25, 0.4, 0.6, 0.55, 0.4, 0.25][i % 6]))) };
    case "low":
      return { ...drop, ...live, sizes: fill((_, i) => [0, 1, 2, 2, 1, 0][i % 6]) };
    case "soldout":
      return { ...drop, ...live, sizes: fill(() => 0) };
    case "ended":
      return { ...drop, starts_at: at(now - 9 * 24 * H), ends_at: at(now - 4 * 24 * H), sizes: fill(() => 0) };
  }
}

export const dropStock = (drop: Drop) => ({ left: left(drop.sizes), total: total(drop.sizes) });

/** Mock: the philanthropy share of what has sold so far (about 45% margin, philanthropy_pct of profit). */
export const raisedCents = (drop: Drop) => Math.round((total(drop.sizes) - left(drop.sizes)) * drop.price_cents * 0.45 * (drop.philanthropy_pct / 100));

/** Short campus label for logos=badge and tight spots. */
export const SHORT: Record<string, string> = {
  ua: "UA", uark: "ARK", auburn: "AU", uf: "UF", uga: "UGA", uky: "UK", lsu: "LSU", olemiss: "OLE MISS",
  msstate: "MSU", mizzou: "MIZZOU", ou: "OU", sc: "SC", utk: "UT", utexas: "TEXAS", tamu: "A&M", vanderbilt: "VANDY",
};

export const isSold = (l: Listing) => l.status === "sold";

/** Sealed-bid results. uniform: every winner pays the lowest winning bid. first: each winner pays their own bid. */
export function auctionResult(drop: Drop, rule: Lab["rule"], myBidCents: number) {
  const a = drop.auction!;
  const winners = a.bids_cents.slice(0, a.pieces);
  const clearing = winners[winners.length - 1];
  const rank = a.bids_cents.filter((b) => b > myBidCents).length + 1;
  return { clearing, top: winners[0], won: rank <= a.pieces, rank, pays: rule === "uniform" ? clearing : myBidCents };
}
