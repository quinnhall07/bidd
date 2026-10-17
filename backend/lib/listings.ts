import "server-only";
import type {
  ListingCondition,
  ListingDetail,
  ListingPhoto,
  ListingSize,
  ListingStatus,
  ListingSummary,
  ListingTag,
} from "@/lib/contracts/listings";
import { ApiError } from "@/lib/http";
import type { AuthContext } from "@/lib/security/auth";
import { adminClient } from "@/lib/supabase/admin";

export const PHOTO_BUCKET = "listing-media";
const SIGNED_URL_SECONDS = 600;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MediaRow = { id: string; storage_path: string; position: number; width: number | null; height: number | null };

export type ListingRow = {
  id: string;
  campus_id: string;
  closet_id: string;
  seller_id: string;
  title: string;
  description: string;
  brand: string | null;
  price_cents: number;
  size: ListingSize;
  condition: ListingCondition;
  tags: ListingTag[];
  status: ListingStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  listing_media?: MediaRow[] | null;
};

export const LISTING_COLUMNS =
  "id, campus_id, closet_id, seller_id, title, description, brand, price_cents, size, condition, tags, status, published_at, created_at, updated_at";
export const LISTING_WITH_MEDIA = `${LISTING_COLUMNS}, listing_media(id, storage_path, position, width, height)`;

/** Path ids that aren't UUIDs are simply "not found". */
export function requireUuid(id: string): string {
  if (!UUID.test(id)) throw new ApiError(404, "listing_not_found", "That listing doesn't exist.");
  return id.toLowerCase();
}

/** The caller's own listing on their campus, or 404 (same answer for "not yours" and "doesn't exist"). */
export async function getOwnListing(ctx: AuthContext, id: string): Promise<ListingRow> {
  const { data, error } = await adminClient()
    .from("listings")
    .select(LISTING_WITH_MEDIA)
    .eq("id", requireUuid(id))
    .eq("seller_id", ctx.userId)
    .eq("campus_id", ctx.campus.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "listing_not_found", "That listing doesn't exist.");
  return data as ListingRow;
}

/** The seller's personal closet, created on first use. */
export async function ensurePersonalCloset(ctx: AuthContext): Promise<string> {
  const admin = adminClient();
  const find = () => admin.from("closets").select("id").eq("owner_id", ctx.userId).eq("kind", "personal").maybeSingle();

  const existing = await find();
  if (existing.error) throw existing.error;
  if (existing.data) return (existing.data as { id: string }).id;

  const { data, error } = await admin
    .from("closets")
    .insert({ campus_id: ctx.campus.id, kind: "personal", owner_id: ctx.userId, name: `${ctx.profile.displayName ?? "My"} closet` })
    .select("id")
    .single();
  if (!error) return (data as { id: string }).id;
  if (error.code !== "23505") throw error;
  // Lost a race with a parallel request: use the closet it created.
  const again = await find();
  if (again.error || !again.data) throw again.error ?? error;
  return (again.data as { id: string }).id;
}

export function sortedMedia(row: ListingRow): MediaRow[] {
  return [...(row.listing_media ?? [])].sort((a, b) => a.position - b.position);
}

/** Signed URLs for private photos, keyed by storage path. */
export async function signPhotos(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data, error } = await adminClient().storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw error;
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

/** Display names only (never emails) for the given sellers. */
export async function sellerNames(ids: string[]): Promise<Map<string, string | null>> {
  const names = new Map<string, string | null>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return names;
  const { data, error } = await adminClient().from("profiles").select("id, display_name").in("id", unique);
  if (error) throw error;
  for (const p of (data ?? []) as { id: string; display_name: string | null }[]) names.set(p.id, p.display_name);
  return names;
}

export function toPhoto(m: MediaRow, urls: Map<string, string>): ListingPhoto {
  return { id: m.id, position: m.position, url: urls.get(m.storage_path) ?? null, width: m.width, height: m.height };
}

export function toSummary(row: ListingRow, urls: Map<string, string>, names: Map<string, string | null>): ListingSummary {
  const cover = sortedMedia(row)[0];
  return {
    id: row.id,
    title: row.title,
    priceCents: row.price_cents,
    size: row.size,
    condition: row.condition,
    tags: row.tags,
    brand: row.brand,
    status: row.status,
    publishedAt: row.published_at,
    coverUrl: cover ? (urls.get(cover.storage_path) ?? null) : null,
    seller: { id: row.seller_id, displayName: names.get(row.seller_id) ?? null },
  };
}

/** Summaries with signed cover URLs and seller names for a page of rows. */
export async function summarize(rows: ListingRow[]): Promise<ListingSummary[]> {
  const covers = rows.map((r) => sortedMedia(r)[0]?.storage_path).filter((p): p is string => Boolean(p));
  const [urls, names] = await Promise.all([signPhotos(covers), sellerNames(rows.map((r) => r.seller_id))]);
  return rows.map((r) => toSummary(r, urls, names));
}

export async function toDetail(row: ListingRow, viewerId: string): Promise<ListingDetail> {
  const media = sortedMedia(row);
  const [urls, names] = await Promise.all([signPhotos(media.map((m) => m.storage_path)), sellerNames([row.seller_id])]);
  return {
    ...toSummary(row, urls, names),
    description: row.description,
    photos: media.map((m) => toPhoto(m, urls)),
    isOwner: row.seller_id === viewerId,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
