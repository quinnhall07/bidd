import { fromBidRpcError, loadBidsView } from "@/lib/bids";
import { PlaceBidBody, type BidsResponse } from "@/lib/contracts/bids";
import { handle, json, readJson } from "@/lib/http";
import { requireUuid } from "@/lib/listings";
import { requireUser } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

// Auction state plus the latest 20 bids, newest first. Own campus only; bidders are "You" / "Bidder N".
export const GET = handle<Ctx>(async (req, { params }) => {
  const ctx = await requireUser(req);
  const id = requireUuid((await params).id);
  return json<BidsResponse>(await loadBidsView(ctx, id));
});

// Place a bid. Bidder and campus come from the session, never the body; the minimum, the clock and
// anti-sniping come from the database (place_listing_bid locks the listing row).
export const POST = handle<Ctx>(async (req, { params }) => {
  const ctx = await requireUser(req);
  const id = requireUuid((await params).id);
  const body = await readJson(req, PlaceBidBody);
  await enforceRateLimit([
    { bucket: `bid:${ctx.userId}`, max: 120, windowSeconds: 3600 },
    { bucket: `bid:${ctx.userId}:${id}`, max: 10, windowSeconds: 60 },
  ]);

  const { error } = await adminClient().rpc("place_listing_bid", {
    p_listing_id: id,
    p_bidder_id: ctx.userId,
    p_amount_cents: body.amountCents,
  });
  if (error) throw fromBidRpcError(error);

  return json<BidsResponse>(await loadBidsView(ctx, id), 201);
});
