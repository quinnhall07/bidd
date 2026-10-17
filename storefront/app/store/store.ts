// Server-side store helpers shared by /store/new and /store/[handle]: the campus palette, banner choices,
// and the demo viewer's closet (a store is the verified viewer's closet with a storefront on top).
import { getCloset, getViewer } from "@/lib/data";
import type { Campus } from "@/lib/types";
import type { Store } from "@/components/store-header";

const MERCH: Record<string, string> = { ua: "crimson-tide", uf: "florida-gators", lsu: "lsu-street", uky: "uk-chrome-hearts" };

export const BANNERS = [
  { src: "/merch/crimson-tide.jpg", label: "Crimson Tide" },
  { src: "/merch/florida-gators.jpg", label: "Florida Gators" },
  { src: "/merch/lsu-street.jpg", label: "LSU street" },
  { src: "/merch/uk-chrome-hearts.jpg", label: "Kentucky chrome" },
  { src: "/merch/liquid-death.jpg", label: "Liquid Death" },
  { src: "/photos/pexels-10557065.jpg", label: "Rack" },
  { src: "/photos/pexels-12168883.jpg", label: "Closet" },
  { src: "/photos/pexels-14641437.jpg", label: "Fit check" },
  { src: "/photos/pexels-18984439.jpg", label: "Campus" },
  { src: "/photos/pexels-5442253.jpg", label: "Folded" },
];

/** The home campus's merch photo first, then the rest. */
export function bannersFor(campus: Campus | null) {
  const home = campus && MERCH[campus.slug] ? `/merch/${MERCH[campus.slug]}.jpg` : null;
  return home ? [...BANNERS.filter((b) => b.src === home), ...BANNERS.filter((b) => b.src !== home)] : BANNERS;
}

const nearWhite = (hex: string) => {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255) > 690;
};

export function paletteFor(campus: Campus | null) {
  const colors = campus ? [campus.primary_color, campus.secondary_color] : [];
  return [...new Set([...colors.filter((c) => !nearWhite(c)), "#0B0B0B", "#6B6B6B"])];
}

/** The verified demo viewer and their closet. Mock: every campus's demo viewer is school-email verified. */
export async function storeOwner(campus: Campus | null, cid: string) {
  const viewer = campus ? await getViewer(cid) : null;
  const data = await getCloset(cid, "me");
  const closet = data?.closet ?? null;
  const sold = closet?.sold_count ?? 0;
  const followers = 48 + sold * 9;
  const domain = viewer?.email.split("@")[1] ?? campus?.email_domains[0] ?? null;
  const fallback: Store = {
    handle: closet?.handle ?? "taylor.m",
    name: closet ? `${closet.name.split(" ")[0]}'s Closet` : "Student store",
    bio: closet?.bio ?? "",
    accent: paletteFor(campus)[0],
    banner: bannersFor(campus)[0].src,
    campus: campus?.name ?? "your campus",
    owner: viewer?.name ?? closet?.name ?? "",
  };
  return { viewer, verified: Boolean(viewer), listings: data?.listings ?? [], sold, followers, domain, fallback };
}
