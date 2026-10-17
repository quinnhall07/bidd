import { ApiError, handle, json } from "@/lib/http";
import { fromRpcError } from "@/lib/orders";
import { requireUser } from "@/lib/security/auth";
import { adminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST = handle<Ctx>(async (req, { params }) => {
  const ctx = await requireUser(req);
  const { id } = await params;
  if (!UUID.test(id)) throw new ApiError(404, "order_not_found", "That order doesn't exist.");

  const { error } = await adminClient().rpc("cancel_order", { p_order_id: id, p_user_id: ctx.userId });
  if (error) throw fromRpcError(error);
  return json({ ok: true });
});
