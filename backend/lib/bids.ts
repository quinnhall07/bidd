import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { BID_HISTORY_LIMIT, type Auction, type Bid, type BidsResponse } from "@/lib/contracts/bids";
import type { ListingStatus } from "@/lib/contracts/listings";
import { ApiError } from "@/lib/http";
import type { AuthContext } from "@/lib/security/auth";
import { adminClient } from "@/lib/supabase/admin";

type AuctionListingRow = {
  id: string;
  seller_id: string;
  status: ListingStatus;
  auction_ends_at: string | null;
  auction_start_cents: number | null;
};

type BidRow = { bidder_id: string; amount_cents: number; created_at: string };

const NOT_FOUND = () => new ApiError(404, "listing_not_found", "That listing doesn't exist.");

/** Same formula as place_listing_bid(): start with no bids, else high + max($1, 5% of high rounded up to a dollar). */
export function minNextCents(startCents: number, highCents: number | null): number {
  return highCents == null ? startCents : highCents + Math.max(100, Math.ceil(highCents / 2000) * 100);
}

/** "$12" or "$10.50". */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars)
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Auction state and the latest bids for one viewer. `bids` must be every bid on the listing in
 * ascending amount order (amounts strictly increase, so that is also time order).
 * Bidders are anonymized: the viewer is "You"; everyone else is "Bidder N", numbered by when they
 * first bid on this listing (the viewer is skipped, so the others are always 1, 2, 3...).
 */
export function toBidsView(listing: AuctionListingRow, bids: BidRow[], viewerId: string, now = Date.now()): BidsResponse {
  if (listing.auction_ends_at == null || listing.auction_start_cents == null) {
    throw new ApiError(400, "not_an_auction", "This listing isn't up for bidding.");
  }

  const numbers = new Map<string, number>();
  for (const b of bids) {
    if (b.bidder_id !== viewerId && !numbers.has(b.bidder_id)) numbers.set(b.bidder_id, numbers.size + 1);
  }

  const top = bids.length > 0 ? bids[bids.length - 1] : undefined;
  const highCents = top?.amount_cents ?? null;
  const endsAt = new Date(listing.auction_ends_at).toISOString();

  const auction: Auction = {
    listingId: listing.id,
    startCents: listing.auction_start_cents,
    highCents,
    bidCount: bids.length,
    minNextCents: minNextCents(listing.auction_start_cents, highCents),
    endsAt,
    leading: top !== undefined && top.bidder_id === viewerId,
    ended: listing.status !== "active" || Date.parse(endsAt) <= now,
  };

  const latest: Bid[] = bids
    .slice(-BID_HISTORY_LIMIT)
    .reverse()
    .map((b) => ({
      amountCents: b.amount_cents,
      at: new Date(b.created_at).toISOString(),
      bidder: b.bidder_id === viewerId ? "You" : `Bidder ${numbers.get(b.bidder_id) ?? 0}`,
    }));

  return { auction, bids: latest };
}

/**
 * Loads an auction on the viewer's campus with the admin client (listing_bids has no client
 * access). Drafts are visible only to their seller and removed listings to nobody, as with RLS.
 */
export async function loadBidsView(ctx: AuthContext, listingId: string): Promise<BidsResponse> {
  const admin = adminClient();
  const { data: listing, error } = await admin
    .from("listings")
    .select("id, seller_id, status, auction_ends_at, auction_start_cents")
    .eq("id", listingId)
    .eq("campus_id", ctx.campus.id)
    .neq("status", "removed")
    .maybeSingle();
  if (error) throw error;
  const row = listing as AuctionListingRow | null;
  if (!row || (row.status === "draft" && row.seller_id !== ctx.userId)) throw NOT_FOUND();
  if (row.auction_ends_at == null) throw new ApiError(400, "not_an_auction", "This listing isn't up for bidding.");

  // Every bid, for the "Bidder N" numbering. Bounded: each bid must beat the last by at least $1 or
  // 5%, and bids are capped at $100,000, so a listing can't collect more than about 200 bids.
  const { data: bids, error: bidsError } = await admin
    .from("listing_bids")
    .select("bidder_id, amount_cents, created_at")
    .eq("listing_id", row.id)
    .order("amount_cents", { ascending: true });
  if (bidsError) throw bidsError;

  return toBidsView(row, (bids ?? []) as BidRow[], ctx.userId);
}

const RPC_ERRORS: Record<string, [number, string]> = {
  listing_not_found: [404, "That listing doesn't exist."],
  listing_not_active: [409, "Publish the listing before starting an auction."],
  auction_has_bids: [409, "This auction already has bids, so it can't be changed."],
  invalid_auction: [400, "Pick a starting bid of $1–$1,000 and 1–168 hours."],
  invalid_bid: [400, "Bid a whole-cent amount up to $100,000."],
  not_an_auction: [400, "This listing isn't up for bidding."],
  own_listing: [403, "You can't bid on your own listing."],
  auction_ended: [409, "Bidding has ended."],
};

/** Maps start_listing_auction / place_listing_bid exceptions to API errors; anything else is a real failure. */
export function fromBidRpcError(error: PostgrestError): Error {
  const message = error.message ?? "";
  if (message.includes("bid_too_low")) {
    const min = Number(/bid_too_low:(\d+)/.exec(message)?.[1] ?? error.details);
    return new ApiError(
      400,
      "bid_too_low",
      Number.isInteger(min) && min > 0 ? `Bid ${formatCents(min)} or more.` : "Someone just bid higher. Refresh and try again.",
    );
  }
  for (const [code, [status, text]] of Object.entries(RPC_ERRORS)) {
    if (message.includes(code)) return new ApiError(status, code, text);
  }
  // Two bids raced for the same amount: the unique (listing, amount) index rejected the loser.
  if (error.code === "23505") return new ApiError(400, "bid_too_low", "Someone just bid that amount. Bid higher.");
  return error;
}
