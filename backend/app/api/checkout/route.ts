import { CheckoutBody, type CheckoutResponse } from "@/lib/contracts/orders";
import { handle, json, readJson } from "@/lib/http";
import { ORDER_COLUMNS, fromRpcError, toOrder, type OrderRow } from "@/lib/orders";
import { requireUser } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminClient } from "@/lib/supabase/admin";

// Pilot checkout: reserves the listing and opens an order. No payment is collected.
// Price, fee, seller and campus all come from the database, never from the request.
export const POST = handle(async (req) => {
  const ctx = await requireUser(req);
  const body = await readJson(req, CheckoutBody);
  await enforceRateLimit([{ bucket: `checkout:${ctx.userId}`, max: 30, windowSeconds: 3600 }]);

  const admin = adminClient();
  const { data: orderId, error } = await admin.rpc("create_order", { p_listing_id: body.listingId, p_buyer_id: ctx.userId });
  if (error) throw fromRpcError(error);

  const { data, error: readError } = await admin.from("orders").select(ORDER_COLUMNS).eq("id", orderId as string).single();
  if (readError) throw readError;
  return json<CheckoutResponse>({ order: toOrder(data as OrderRow, ctx.userId) }, 201);
});
