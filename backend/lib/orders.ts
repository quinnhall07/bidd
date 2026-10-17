import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { PAYMENT_NOTICE, type Order, type OrderStatus } from "@/lib/contracts/orders";
import { ApiError } from "@/lib/http";

export type OrderRow = {
  id: string;
  status: OrderStatus;
  buyer_id: string;
  seller_id: string;
  price_cents: number;
  buyer_fee_cents: number;
  total_cents: number;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  listing: { id: string; title: string } | { id: string; title: string }[] | null;
};

export const ORDER_COLUMNS =
  "id, status, buyer_id, seller_id, price_cents, buyer_fee_cents, total_cents, created_at, completed_at, cancelled_at, listing:listings(id, title)";

export const HANDOFF_PREFIX = "bidd:handoff:";

export function toOrder(row: OrderRow, viewerId: string): Order {
  return {
    id: row.id,
    status: row.status,
    role: row.buyer_id === viewerId ? "buyer" : "seller",
    priceCents: row.price_cents,
    buyerFeeCents: row.buyer_fee_cents,
    totalCents: row.total_cents,
    payment: { collected: false, message: PAYMENT_NOTICE },
    listing: Array.isArray(row.listing) ? (row.listing[0] ?? null) : row.listing,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
  };
}

const RPC_ERRORS: Record<string, [number, string]> = {
  listing_not_found: [404, "That listing doesn't exist."],
  listing_unavailable: [409, "Someone already claimed this item."],
  cannot_buy_own_listing: [409, "You can't buy your own listing."],
  order_not_found: [404, "That order doesn't exist."],
  order_not_open: [409, "This order is already completed or cancelled."],
  invalid_handoff: [400, "That QR code isn't valid for your sale."],
  handoff_already_used: [409, "That QR code was already used."],
  handoff_expired: [410, "That QR code expired. Ask the buyer to refresh it."],
};

/** Maps the database's named exceptions to API errors; anything else is a real failure. */
export function fromRpcError(error: PostgrestError): Error {
  for (const [code, [status, message]] of Object.entries(RPC_ERRORS)) {
    if ((error.message ?? "").includes(code)) return new ApiError(status, code, message);
  }
  if (error.code === "23505") return new ApiError(409, "listing_unavailable", RPC_ERRORS.listing_unavailable![1]);
  return error;
}
