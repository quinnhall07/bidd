// Shared contract for bidding (live ascending auctions on resale listings). No server-only imports here.
// The storefront's components/live-bid.tsx implements the client side of these shapes.
import { z } from "zod";

/** Latest bids returned by GET/POST /api/listings/:id/bids, newest first. */
export const BID_HISTORY_LIMIT = 20;
/** A bid this close to the end puts the clock back to this many seconds. */
export const ANTI_SNIPE_SECONDS = 120;

/** POST /api/listings/:id/auction (seller only). */
export const StartAuctionBody = z.object({
  /** Whole cents. $1.00–$1,000.00, the same range as a listing price. */
  startCents: z
    .number()
    .int("Starting bid must be in whole cents.")
    .min(100, "Starting bid must be at least $1.")
    .max(100000, "Starting bid can be at most $1,000."),
  /** How long bidding runs: 1 hour to 7 days. */
  hours: z
    .number()
    .int("Duration must be whole hours.")
    .min(1, "Bidding must run at least 1 hour.")
    .max(168, "Bidding can run at most 7 days."),
});
export type StartAuctionBody = z.infer<typeof StartAuctionBody>;

/** POST /api/listings/:id/bids. Anything else in the body (bidder, campus, listing) is ignored. */
export const PlaceBidBody = z.object({
  /** Whole cents. The server checks it against the current minimum and answers `bid_too_low` if short. */
  amountCents: z
    .number()
    .int("Bid must be in whole cents.")
    .min(1, "Bid must be a positive amount.")
    .max(10_000_000, "Bids can be at most $100,000."),
});
export type PlaceBidBody = z.infer<typeof PlaceBidBody>;

export type Auction = {
  listingId: string;
  startCents: number;
  /** Highest bid so far, or null before the first bid. */
  highCents: number | null;
  bidCount: number;
  /** The smallest bid the server will accept right now. */
  minNextCents: number;
  /** ISO time. Moves later when a bid lands in the last 2 minutes. */
  endsAt: string;
  /** The viewer holds the high bid. */
  leading: boolean;
  ended: boolean;
};

export type Bid = {
  amountCents: number;
  /** ISO time. */
  at: string;
  /** "You" for the viewer, otherwise "Bidder N" (N = order of each other bidder's first bid). Never a name or id. */
  bidder: string;
};

export type AuctionResponse = { auction: Auction };
export type BidsResponse = { auction: Auction; bids: Bid[] };
