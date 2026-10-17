import { ConfirmHandoffBody, type ConfirmHandoffResponse } from "@/lib/contracts/orders";
import { handle, json, readJson } from "@/lib/http";
import { HANDOFF_PREFIX, fromRpcError } from "@/lib/orders";
import { requireUser } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { sha256 } from "@/lib/security/request";
import { adminClient } from "@/lib/supabase/admin";

// Seller scans the buyer's QR at the meetup: completes the order and marks the listing sold.
export const POST = handle(async (req) => {
  const ctx = await requireUser(req);
  const body = await readJson(req, ConfirmHandoffBody);
  await enforceRateLimit([{ bucket: `handoff-confirm:${ctx.userId}`, max: 20, windowSeconds: 600 }]);

  const raw = body.token.startsWith(HANDOFF_PREFIX) ? body.token.slice(HANDOFF_PREFIX.length) : body.token;
  const { data, error } = await adminClient().rpc("confirm_handoff", { p_token_hash: sha256(raw), p_seller_id: ctx.userId });
  if (error) throw fromRpcError(error);

  return json<ConfirmHandoffResponse>({ ok: true, orderId: data as string });
});
