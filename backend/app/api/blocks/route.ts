import { BlockBody } from "@/lib/contracts/community";
import { ApiError, handle, json, readJson } from "@/lib/http";
import { requireUser } from "@/lib/security/auth";
import { adminClient } from "@/lib/supabase/admin";
import { userClient } from "@/lib/supabase/server";

// IDs of users I've blocked (their listings are hidden from my feed).
export const GET = handle(async (req) => {
  const ctx = await requireUser(req);
  const { data, error } = await userClient(ctx.accessToken).from("blocks").select("blocked_id");
  if (error) throw error;
  return json({ blockedUserIds: ((data ?? []) as { blocked_id: string }[]).map((b) => b.blocked_id) });
});

export const POST = handle(async (req) => {
  const ctx = await requireUser(req);
  const { userId } = await readJson(req, BlockBody);
  if (userId.toLowerCase() === ctx.userId) throw new ApiError(400, "cannot_block_self", "You can't block yourself.");

  const admin = adminClient();
  const { data: target, error: findError } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (findError) throw findError;
  if (!target) throw new ApiError(404, "user_not_found", "That user doesn't exist.");

  const { error } = await admin
    .from("blocks")
    .upsert({ blocker_id: ctx.userId, blocked_id: userId }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
  if (error) throw error;
  return json({ ok: true });
});
