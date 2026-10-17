import { fromBidRpcError, loadBidsView } from "@/lib/bids";
import { StartAuctionBody, type AuctionResponse } from "@/lib/contracts/bids";
import { handle, json, readJson } from "@/lib/http";
import { requireUuid } from "@/lib/listings";
import { requireUser } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

// Seller only: turn an active listing into a live auction, or re-time one that has no bids yet.
// Ownership, campus and status are checked inside start_listing_auction with the listing row locked.
export const POST = handle<Ctx>(async (req, { params }) => {
  const ctx = await requireUser(req);
  const id = requireUuid((await params).id);
  const body = await readJson(req, StartAuctionBody);
  await enforceRateLimit([{ bucket: `auction:${ctx.userId}`, max: 20, windowSeconds: 3600 }]);

  const { error } = await adminClient().rpc("start_listing_auction", {
    p_listing_id: id,
    p_seller_id: ctx.userId,
    p_start_cents: body.startCents,
    p_hours: body.hours,
  });
  if (error) throw fromBidRpcError(error);

  const { auction } = await loadBidsView(ctx, id);
  return json<AuctionResponse>({ auction });
});
