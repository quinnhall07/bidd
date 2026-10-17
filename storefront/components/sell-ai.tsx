// "AI fill" vocabulary, shared by the client and app/api/ai-listing (Gemma 4 on the Gemini API).
// The fallback below is deterministic, on-device heuristics, no model: sample photos have hand-written fills, and any
// other photo is read from its file name and average color when the model is unavailable (no key, error, timeout).
import { MOMENTS, type Moment } from "@/lib/types";

export const CATEGORIES = ["Outerwear", "Tops", "Dresses", "Bottoms", "Sets", "Accessories", "Shoes"] as const;
export type Category = (typeof CATEGORIES)[number];

// Backend enums (backend/lib/contracts/listings.ts), with the labels the brief asks for.
export const SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "ONE_SIZE", "0", "2", "4", "6", "8", "10", "12", "14"] as const;
export type Size = (typeof SIZES)[number];
export const sizeLabel = (s: Size) => (s === "ONE_SIZE" ? "One size" : s);

export const CONDITIONS = [
  ["new_with_tags", "New with tags"],
  ["like_new", "Like new"],
  ["good", "Good"],
  ["fair", "Fair"],
] as const;
export type Condition = (typeof CONDITIONS)[number][0];
export const conditionLabel = (c: Condition) => CONDITIONS.find(([id]) => id === c)![1];

export { MOMENTS, type Moment };
/** Moments the API stores as tags. Casual and Philanthropy stay on the storefront for now. */
export const API_TAG: Partial<Record<Moment, "rush" | "bid_day" | "gameday" | "formal">> = {
  Rush: "rush",
  "Bid Day": "bid_day",
  Gameday: "gameday",
  Formal: "formal",
};

export type Fill = {
  title: string;
  brand: string;
  category: Category;
  size: Size;
  condition: Condition;
  priceCents: number;
  tags: Moment[];
  description: string;
  /** Similar pieces' range, for the price hint. */
  range: [number, number];
};

export type Sample = { id: string; src: string; label: string; fill: Fill };

export const SAMPLES: Sample[] = [
  {
    id: "crimson-tide",
    src: "/merch/crimson-tide.jpg",
    label: "Crimson puffer",
    fill: {
      title: "Crimson script A cropped puffer",
      brand: "Campus Ink Co.",
      category: "Outerwear",
      size: "S",
      condition: "like_new",
      priceCents: 7800,
      tags: ["Gameday", "Bid Day"],
      description: "Cropped crimson puffer with the script A on the chest and sleeve, white varsity stripes at the cuffs. Worn to two home games, zipper is perfect.",
      range: [6000, 9500],
    },
  },
  {
    id: "lsu-street",
    src: "/merch/lsu-street.jpg",
    label: "LSU pullover",
    fill: {
      title: "Vintage LSU purple and gold pullover jacket",
      brand: "Vintage",
      category: "Outerwear",
      size: "L",
      condition: "good",
      priceCents: 9500,
      tags: ["Gameday", "Casual"],
      description: "Oversized satin pullover in purple and gold with the tiger patch on the chest. Warm, roomy fit. Light wear on the cuffs, nothing that shows.",
      range: [7500, 13000],
    },
  },
  {
    id: "uk-chrome-hearts",
    src: "/merch/uk-chrome-hearts.jpg",
    label: "Kentucky hooded",
    fill: {
      title: "Kentucky royal blue hooded varsity jacket",
      brand: "Chrome Hearts",
      category: "Outerwear",
      size: "M",
      condition: "like_new",
      priceCents: 24000,
      tags: ["Gameday", "Casual"],
      description: "Royal blue hooded jacket with the UK block letters and cross embroidery on the back, quilted white sleeves. Worn a handful of times.",
      range: [18000, 32000],
    },
  },
  {
    id: "florida-gators",
    src: "/merch/florida-gators.jpg",
    label: "Gators set",
    fill: {
      title: "Gators royal tee and gray sweats set",
      brand: "Campus Ink Co.",
      category: "Sets",
      size: "S",
      condition: "like_new",
      priceCents: 5500,
      tags: ["Gameday", "Casual"],
      description: "Royal blue boxy tee with the gator patch, plus heather gray joggers with the Gators script on the leg. Sold together. Washed cold, no fading.",
      range: [4000, 7000],
    },
  },
  {
    id: "liquid-death",
    src: "/merch/liquid-death.jpg",
    label: "Liquid Death tee",
    fill: {
      title: "Liquid Death x KA washed black tee",
      brand: "Liquid Death",
      category: "Tops",
      size: "L",
      condition: "new_with_tags",
      priceCents: 4200,
      tags: ["Rush", "Philanthropy"],
      description: "Washed black tee from the Liquid Death chapter drop, gothic back print. Never worn, tags still on.",
      range: [3000, 5500],
    },
  },
];

const WORDS: [RegExp, Category][] = [
  [/dress|gown|romper|mini|midi|maxi/, "Dresses"],
  [/jacket|puffer|coat|hood|hoodie|crew|sweat|fleece|quarter|zip/, "Outerwear"],
  [/tee|shirt|top|tank|polo|jersey|blouse|cami/, "Tops"],
  [/skirt|short|jean|pant|trouser|legging|jogger/, "Bottoms"],
  [/set|matching|two.?piece/, "Sets"],
  [/bag|hat|cap|scarf|belt|earring|necklace|jewel|purse/, "Accessories"],
  [/shoe|boot|sneaker|heel|sandal|loafer|jordan|dunk/, "Shoes"],
];

const GARMENT: Record<Category, string[]> = {
  Outerwear: ["puffer jacket", "quarter-zip pullover", "oversized crewneck", "varsity jacket"],
  Tops: ["boxy tee", "ribbed tank", "button-down", "baby tee"],
  Dresses: ["mini dress", "satin slip dress", "smocked midi dress", "one-shoulder dress"],
  Bottoms: ["pleated skirt", "wide-leg jeans", "linen shorts", "trousers"],
  Sets: ["two-piece set", "matching sweatsuit"],
  Accessories: ["shoulder bag", "dad cap", "claw clip set"],
  Shoes: ["platform sneakers", "cowboy boots", "ballet flats"],
};

export const PRICE: Record<Category, [number, number]> = {
  Outerwear: [4500, 9000],
  Tops: [1800, 3500],
  Dresses: [3500, 7500],
  Bottoms: [2500, 5000],
  Sets: [4000, 7000],
  Accessories: [1500, 4000],
  Shoes: [4000, 9000],
};

const BRANDS: [RegExp, string][] = [
  [/lulus/, "Lulus"],
  [/aritzia/, "Aritzia"],
  [/free.?people|\bfp\b/, "Free People"],
  [/nike/, "Nike"],
  [/lulu(lemon)?/, "Lululemon"],
  [/princess.?polly/, "Princess Polly"],
  [/comfort.?colors/, "Comfort Colors"],
  [/reformation/, "Reformation"],
  [/zara/, "Zara"],
];

// Named colors the fill can say out loud, in RGB.
const COLORS: [string, number, number, number][] = [
  ["Crimson", 158, 27, 50],
  ["Red", 200, 40, 40],
  ["Navy", 20, 33, 61],
  ["Royal blue", 30, 70, 170],
  ["Sky blue", 120, 170, 220],
  ["Purple", 80, 40, 130],
  ["Orange", 230, 110, 30],
  ["Gold", 210, 170, 40],
  ["Sage", 150, 170, 140],
  ["Green", 40, 110, 60],
  ["Pink", 230, 150, 175],
  ["Black", 20, 20, 20],
  ["White", 240, 240, 240],
  ["Gray", 140, 140, 140],
  ["Cream", 235, 225, 200],
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Average color of the photo's center, weighted toward saturated pixels (the garment, not the wall). */
export async function averageColor(src: string): Promise<[number, number, number] | null> {
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) return null;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    g.drawImage(img, w * 0.2, h * 0.2, w * 0.6, h * 0.6, 0, 0, 32, 32);
    const d = g.getImageData(0, 0, 32, 32).data;
    let r = 0, gg = 0, b = 0, t = 0;
    for (let i = 0; i < d.length; i += 4) {
      const max = Math.max(d[i], d[i + 1], d[i + 2]);
      const min = Math.min(d[i], d[i + 1], d[i + 2]);
      const wgt = 0.15 + (max - min) / 255;
      r += d[i] * wgt;
      gg += d[i + 1] * wgt;
      b += d[i + 2] * wgt;
      t += wgt;
    }
    return [r / t, gg / t, b / t];
  } catch {
    return null;
  }
}

const nearest = ([r, g, b]: [number, number, number]) =>
  COLORS.reduce((best, c) => {
    const d = (c[1] - r) ** 2 + (c[2] - g) ** 2 + (c[3] - b) ** 2;
    return d < best[1] ? ([c[0], d] as [string, number]) : best;
  }, ["Black", Infinity] as [string, number])[0];

const roundPrice = (cents: number) => Math.max(500, Math.round(cents / 500) * 500);

/** Reads a photo the student picked: file name first, then color, then a stable hash for the rest. */
export function fillFromPhoto(name: string, size: number, rgb: [number, number, number] | null, campus: string | null): Fill {
  const n = name.toLowerCase().replace(/[_\-.]+/g, " ");
  const h = hash(`${name}:${size}`);
  const category = WORDS.find(([re]) => re.test(n))?.[1] ?? (["Tops", "Dresses", "Outerwear"] as const)[h % 3];
  const garments = GARMENT[category];
  const garment = garments[(h >> 3) % garments.length];
  const color = rgb ? nearest(rgb) : ["Black", "White", "Navy", "Sage"][(h >> 5) % 4];
  const brand = BRANDS.find(([re]) => re.test(n))?.[1] ?? ["Lulus", "Aritzia", "Free People", "Princess Polly", "Comfort Colors"][(h >> 7) % 5];
  const sizes: Size[] = category === "Dresses" ? ["2", "4", "6", "XS", "S"] : category === "Accessories" ? ["ONE_SIZE"] : ["XS", "S", "M", "L"];
  const sz = sizes[(h >> 9) % sizes.length];
  const condition: Condition = (["like_new", "like_new", "good", "new_with_tags"] as const)[(h >> 11) % 4];
  const [lo, hi] = PRICE[category];
  const base = lo + ((h >> 13) % 1000) / 1000 * (hi - lo);
  const priceCents = roundPrice(condition === "new_with_tags" ? base * 1.15 : condition === "good" ? base * 0.85 : base);

  const tags: Moment[] = [];
  const isSchool = /crimson|tide|bama|rebel|ole ?miss|gameday|tailgate|game/.test(n) || ["Crimson", "Navy", "Red", "Royal blue", "Orange", "Purple"].includes(color);
  if (category === "Dresses") tags.push(/formal|gown|satin|slip/.test(n + garment) ? "Formal" : "Rush");
  if (isSchool && category !== "Dresses") tags.push("Gameday");
  if (/bid ?day|white/.test(n) || color === "White") tags.push("Bid Day");
  if (/philanthropy|5k|charity/.test(n)) tags.push("Philanthropy");
  if (!tags.length || category === "Tops" || category === "Bottoms") tags.push("Casual");
  const uniq = [...new Set(tags)].slice(0, 3);

  const title = `${color} ${garment}`.replace(/^(\w)/, (c) => c.toUpperCase());
  const cond = condition === "new_with_tags" ? "Never worn, tags still on." : condition === "good" ? "Worn a few times, light wear." : "Worn once or twice, no marks.";
  return {
    title: brand === "Vintage" ? `Vintage ${title.toLowerCase()}` : title,
    brand,
    category,
    size: sz,
    condition,
    priceCents,
    tags: uniq,
    description: `${color} ${garment} from ${brand}. ${cond}${campus ? ` Meet up anywhere on ${campus}'s campus.` : ""}`,
    range: [roundPrice(priceCents * 0.75), roundPrice(priceCents * 1.3)],
  };
}

/* Model output → Fill. Used by app/api/ai-listing on Gemma's JSON and again by the client on the route's answer. */

/** Similar pieces' range for the price hint: ±20%, rounded to whole dollars, inside the $1–$1,000 the form allows. */
export function rangeFor(priceCents: number): [number, number] {
  const dollars = (c: number) => Math.min(100000, Math.max(100, Math.round(c / 100) * 100));
  return [dollars(priceCents * 0.8), dollars(priceCents * 1.2)];
}

// Single line, no control characters or stray markup, capped.
const line = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f<>*_`#]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max).trim() : "";
const key = (v: unknown) => (typeof v === "string" ? v.toLowerCase().replace(/[^a-z0-9]+/g, "") : typeof v === "number" ? String(v) : "");

// Maps, not object literals, so a key like "constructor" can never resolve to something inherited.
const CATEGORY_ALIAS = new Map<string, Category>(Object.entries({
  jacket: "Outerwear", coat: "Outerwear", hoodie: "Outerwear", sweatshirt: "Outerwear", sweater: "Outerwear", outerwears: "Outerwear",
  top: "Tops", tee: "Tops", tshirt: "Tops", shirt: "Tops", dress: "Dresses", gown: "Dresses", bottom: "Bottoms", pants: "Bottoms",
  jeans: "Bottoms", skirt: "Bottoms", shorts: "Bottoms", set: "Sets", accessory: "Accessories", bag: "Accessories", jewelry: "Accessories",
  shoe: "Shoes", sneakers: "Shoes", boots: "Shoes",
} as const));
const SIZE_ALIAS = new Map<string, Size>(Object.entries({ onesize: "ONE_SIZE", os: "ONE_SIZE", osfa: "ONE_SIZE", xxsmall: "XXS", xsmall: "XS", small: "S", medium: "M", large: "L", xlarge: "XL", xxlarge: "XXL", "2xl": "XXL" } as const));
const CONDITION_ALIAS = new Map<string, Condition>(Object.entries({ nwt: "new_with_tags", new: "new_with_tags", brandnew: "new_with_tags", excellent: "like_new", gentlyused: "like_new", used: "good", worn: "fair" } as const));
const NO_BRAND = /^(unknown|unbranded|none|n\/?a|no brand|generic|not visible|unclear)$/i;

/**
 * Validates and repairs a model's answer field by field: anything off-list or out of range becomes a safe default.
 * Returns null when there's nothing worth showing (no usable title or category), so the caller falls back.
 */
export function repairFill(raw: unknown): Fill | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  const title = line(r.title, 80);
  const category = CATEGORIES.find((c) => key(c) === key(r.category)) ?? CATEGORY_ALIAS.get(key(r.category));
  if (title.length < 3 || !category) return null;

  const brandRaw = line(r.brand, 60);
  const brand = NO_BRAND.test(brandRaw) ? "" : brandRaw;

  const size = SIZES.find((s) => key(s) === key(r.size)) ?? SIZE_ALIAS.get(key(r.size)) ?? (category === "Accessories" ? "ONE_SIZE" : "M");
  const condition = CONDITIONS.find(([id]) => key(id) === key(r.condition))?.[0] ?? CONDITION_ALIAS.get(key(r.condition)) ?? "good";

  // Whole dollars, $1–$1,000; junk gets the category's middle. Cents are integers, so anything that reads as dollars is
  // converted: a "$" or decimal point in a string, a fractional number, a value under 100 ($0.45 isn't a campus price),
  // or a renamed "price"/"priceUsd" field. Without this, "$120.00" would become a $1 listing.
  const cents = r.priceCents ?? r.price_cents;
  const dollars = cents === undefined || cents === null ? (r.price ?? r.priceUsd ?? r.price_usd) : undefined;
  const raw$ = cents ?? dollars;
  let price = typeof raw$ === "number" ? raw$ : typeof raw$ === "string" ? Number.parseFloat(raw$.replace(/[^0-9.]/g, "")) : Number.NaN;
  const inDollars = dollars !== undefined || (typeof raw$ === "string" && /[$.]/.test(raw$)) || (Number.isFinite(price) && !Number.isInteger(price)) || price < 100;
  if (Number.isFinite(price) && price > 0 && inDollars) price *= 100;
  if (!Number.isFinite(price) || price <= 0) price = (PRICE[category][0] + PRICE[category][1]) / 2;
  const priceCents = Math.min(100000, Math.max(100, Math.round(price / 100) * 100));

  const rawTags = Array.isArray(r.tags) ? r.tags : typeof r.tags === "string" ? r.tags.split(/[,|]/) : [];
  const tags = [...new Set(rawTags.map((t) => MOMENTS.find((m) => key(m) === key(t))).filter((m): m is Moment => Boolean(m)))].slice(0, 3);

  const description =
    typeof r.description === "string"
      ? r.description.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u0009\u000b-\u001f\u007f<>*`#]+/g, " ").replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 1000).trim()
      : "";

  return {
    title,
    brand,
    category,
    size,
    condition,
    priceCents,
    tags: tags.length ? tags : ["Casual"],
    description: description || `${title}. ${conditionLabel(condition)}.`,
    range: rangeFor(priceCents),
  };
}
