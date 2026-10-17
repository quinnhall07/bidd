// Shared contract between backend/ and frontend/ for listings. No server-only imports here.
import { z } from "zod";

export const LISTING_TAGS = ["rush", "bid_day", "gameday", "formal"] as const;
export const LISTING_SIZES = [
  "XXS", "XS", "S", "M", "L", "XL", "XXL", "0", "2", "4", "6", "8", "10", "12", "14", "ONE_SIZE",
] as const;
export const LISTING_CONDITIONS = ["new_with_tags", "like_new", "good", "fair"] as const;
export const MAX_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export type ListingTag = (typeof LISTING_TAGS)[number];
export type ListingSize = (typeof LISTING_SIZES)[number];
export type ListingCondition = (typeof LISTING_CONDITIONS)[number];
export type ListingStatus = "draft" | "active" | "reserved" | "sold" | "removed";

const fields = {
  title: z.string().trim().min(3, "Title needs at least 3 characters.").max(80, "Title can be at most 80 characters."),
  description: z.string().trim().max(1000, "Description can be at most 1000 characters."),
  brand: z.string().trim().min(1).max(60).nullable(),
  /** Whole cents. $1.00–$1,000.00. */
  priceCents: z
    .number()
    .int("Price must be in whole cents.")
    .min(100, "Price must be at least $1.")
    .max(100000, "Price can be at most $1,000."),
  size: z.enum(LISTING_SIZES),
  condition: z.enum(LISTING_CONDITIONS),
  tags: z
    .array(z.enum(LISTING_TAGS))
    .max(4)
    .refine((t) => new Set(t).size === t.length, "Tags must be unique."),
};

export const CreateListingBody = z.object({
  ...fields,
  description: fields.description.default(""),
  brand: fields.brand.optional(),
  tags: fields.tags.default([]),
});
export type CreateListingBody = z.infer<typeof CreateListingBody>;

/** Any subset of fields, plus a status change: publish ("active"), unpublish ("draft") or "removed". */
export const UpdateListingBody = z.object({
  title: fields.title.optional(),
  description: fields.description.optional(),
  brand: fields.brand.optional(),
  priceCents: fields.priceCents.optional(),
  size: fields.size.optional(),
  condition: fields.condition.optional(),
  tags: fields.tags.optional(),
  status: z.enum(["draft", "active", "removed"]).optional(),
});
export type UpdateListingBody = z.infer<typeof UpdateListingBody>;

/** Query string for GET /api/listings. */
export const FeedQuery = z.object({
  tag: z.enum(LISTING_TAGS).optional(),
  size: z.enum(LISTING_SIZES).optional(),
  minPriceCents: z.coerce.number().int().min(0).optional(),
  maxPriceCents: z.coerce.number().int().min(0).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});
export type FeedQuery = z.infer<typeof FeedQuery>;

export type ListingPhoto = {
  id: string;
  position: number;
  /** Short-lived signed URL (about 10 minutes). Re-fetch the listing to get fresh ones. */
  url: string | null;
  width: number | null;
  height: number | null;
};

export type ListingSummary = {
  id: string;
  title: string;
  priceCents: number;
  size: ListingSize;
  condition: ListingCondition;
  tags: ListingTag[];
  brand: string | null;
  status: ListingStatus;
  publishedAt: string | null;
  coverUrl: string | null;
  seller: { id: string; displayName: string | null };
};

export type ListingDetail = ListingSummary & {
  description: string;
  photos: ListingPhoto[];
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FeedResponse = { listings: ListingSummary[]; nextCursor: string | null };
export type MyListingsResponse = { listings: ListingSummary[] };
export type ListingResponse = { listing: ListingDetail };
export type PhotoResponse = { photo: ListingPhoto };
