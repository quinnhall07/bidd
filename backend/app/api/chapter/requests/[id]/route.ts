import { DecideRequestBody } from "@/lib/contracts/community";
import { ApiError, handle, json, readJson } from "@/lib/http";
import { requireUser } from "@/lib/security/auth";
import { adminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Approve or reject a pending chapter request. Only active officers of that chapter.
export const POST = handle<Ctx>(async (req, { params }) => {
  const ctx = await requireUser(req);
  const { id } = await params;
  if (!UUID.test(id)) throw new ApiError(404, "request_not_found", "That request doesn't exist.");
  const { approve } = await readJson(req, DecideRequestBody);

  const { error } = await adminClient().rpc("decide_chapter_request", {
    p_membership_id: id,
    p_officer_id: ctx.userId,
    p_approve: approve,
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("request_not_found")) throw new ApiError(404, "request_not_found", "That request doesn't exist.");
    if (msg.includes("request_not_pending")) throw new ApiError(409, "request_not_pending", "That request was already decided.");
    throw error;
  }
  return json({ ok: true, status: approve ? "active" : "rejected" });
});
