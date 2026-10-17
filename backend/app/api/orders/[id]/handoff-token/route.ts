import { randomBytes } from "node:crypto";
import type { HandoffTokenResponse } from "@/lib/contracts/orders";
import { ApiError, handle, json } from "@/lib/http";
import { HANDOFF_PREFIX, fromRpcError } from "@/lib/orders";
import { requireUser } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { sha256 } from "@/lib/security/request";
import { adminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TTL_SECONDS = 15 * 60;

// Buyer only. Returns a fresh single-use token for the QR code; only its hash is stored.
export const POST = handle<Ctx>(async (req, { params }) => {
  const ctx = await requireUser(req);
  const { id } = await params;
  if (!UUID.test(id)) throw new ApiError(404, "order_not_found", "That order doesn't exist.");
  await enforceRateLimit([{ bucket: `handoff-token:${ctx.userId}`, max: 30, windowSeconds: 3600 }]);

  const token = randomBytes(32).toString("base64url");
  const { data, error } = await adminClient().rpc("create_handoff_token", {
    p_order_id: id,
    p_buyer_id: ctx.userId,
    p_token_hash: sha256(token),
    p_ttl_seconds: TTL_SECONDS,
  });
  if (error) throw fromRpcError(error);

  return json<HandoffTokenResponse>({ qrPayload: `${HANDOFF_PREFIX}${token}`, expiresAt: data as string });
});
