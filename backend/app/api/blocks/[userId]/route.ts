import { ApiError, handle, json } from "@/lib/http";
import { requireUser } from "@/lib/security/auth";
import { adminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ userId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DELETE = handle<Ctx>(async (req, { params }) => {
  const ctx = await requireUser(req);
  const { userId } = await params;
  if (!UUID.test(userId)) throw new ApiError(404, "user_not_found", "That user doesn't exist.");

  const { error } = await adminClient().from("blocks").delete().eq("blocker_id", ctx.userId).eq("blocked_id", userId.toLowerCase());
  if (error) throw error;
  return json({ ok: true });
});
