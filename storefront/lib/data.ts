// The one data module. Every page reads through these functions.
// Today they read the JSON in mock/ (copied to lib/mock by scripts/sync.mjs).
// Later Rouan swaps the bodies for Supabase queries with the same signatures;
// every query is already scoped by campus, like the multi-tenant rule in build.md.
import campusRows from "./mock/campuses.json";
import chapterRows from "./mock/chapters.json";
import closetRows from "./mock/closets.json";
import listingRows from "./mock/listings.json";
import dropRows from "./mock/drops.json";
import cupRows from "./mock/cup.json";
import profileRows from "./mock/profiles.json";
import type { Campus, Chapter, Closet, CupRow, Drop, Listing, Moment, Profile } from "./types";

const campuses = campusRows as Campus[];
const chapters = chapterRows as Chapter[];
const closets = closetRows as Closet[];
const listings = listingRows as Listing[];
const drops = dropRows as Drop[];
const cup = cupRows as CupRow[];
const profiles = profileRows as Profile[];

export type FeedFilters = { tag?: Moment | null; size?: string | null; sort?: "new" | "price" | null };

export async function getCampuses(): Promise<Campus[]> {
  return campuses;
}

export async function getCampus(slug: string): Promise<Campus | null> {
  return campuses.find((c) => c.slug === slug) ?? null;
}

/** The signed-in viewer for a campus. Mock: one demo member per campus. */
export async function getViewer(campusId: string): Promise<Profile | null> {
  return profiles.find((p) => p.id === `${campusId}-me`) ?? null;
}

const sizeMatches = (listing: string, size: string) =>
  listing.split(/[\s/,]+/).some((s) => s.toUpperCase() === size.toUpperCase());

/** Resale feed for a campus: active first, newest first. Drops live in getDrops. */
export async function getFeed(campusId: string, filters: FeedFilters = {}): Promise<Listing[]> {
  let rows = listings.filter((l) => l.campus_id === campusId && !l.drop_id);
  if (filters.tag) rows = rows.filter((l) => l.tags.includes(filters.tag!));
  if (filters.size) rows = rows.filter((l) => sizeMatches(l.size, filters.size!));
  rows = [...rows].sort((a, b) =>
    filters.sort === "price" ? a.price_cents - b.price_cents : b.created_at.localeCompare(a.created_at),
  );
  return rows.sort((a, b) => Number(a.status === "sold") - Number(b.status === "sold"));
}

export async function getListing(campusId: string, id: string) {
  const listing = listings.find((l) => l.campus_id === campusId && l.id === id);
  if (!listing) return null;
  const closet = closets.find((c) => c.id === listing.closet_id) ?? null;
  const chapter = chapters.find((c) => c.id === closet?.chapter_id) ?? null;
  const more = listings.filter((l) => l.closet_id === listing.closet_id && l.id !== id && !l.drop_id && l.status === "active");
  return { listing, closet, chapter, more };
}

/** Any closet by slug: personal, chapter or brand (one route, three headers). */
export async function getCloset(campusId: string, slug: string) {
  const closet = closets.find((c) => c.campus_id === campusId && c.slug === slug);
  if (!closet) return null;
  const chapter = chapters.find((c) => c.id === closet.chapter_id) ?? null;
  const memberClosetIds =
    closet.type === "chapter"
      ? new Set(closets.filter((c) => c.type === "personal" && c.chapter_id === closet.chapter_id).map((c) => c.id))
      : null;
  const rows = listings
    .filter((l) => !l.drop_id && (memberClosetIds ? memberClosetIds.has(l.closet_id) : l.closet_id === closet.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const closetDrops = drops.filter((d) =>
    closet.type === "brand" ? d.closet_id === closet.id : closet.type === "chapter" ? d.chapter_id === closet.chapter_id : false,
  );
  return { closet, chapter, listings: rows, drops: closetDrops };
}

export async function getChapters(campusId: string): Promise<Chapter[]> {
  return chapters.filter((c) => c.campus_id === campusId);
}

export async function getDrops(campusId: string): Promise<Drop[]> {
  return drops.filter((d) => d.campus_id === campusId);
}

export async function getDrop(campusId: string, slug: string) {
  const drop = drops.find((d) => d.campus_id === campusId && d.slug === slug);
  if (!drop) return null;
  const chapter = chapters.find((c) => c.id === drop.chapter_id)!;
  const items = listings.filter((l) => l.drop_id === drop.id);
  return { drop, chapter, items };
}

/** Closet Cup: one campus's chapters, or the SEC view (one national org across every campus). */
export async function getCup(scope: string, nationalOrg?: string): Promise<(CupRow & { chapter: Chapter; campus: Campus })[]> {
  const rows = scope === "sec" ? cup.filter((r) => r.national_org === nationalOrg) : cup.filter((r) => r.campus_id === scope);
  return rows
    .map((r) => ({ ...r, chapter: chapters.find((c) => c.id === r.chapter_id)!, campus: campuses.find((c) => c.slug === r.campus_id)! }))
    .sort((a, b) => b.points - a.points);
}
