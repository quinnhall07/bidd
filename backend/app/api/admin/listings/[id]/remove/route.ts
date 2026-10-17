import { audit } from "@/lib/audit";
import { ApiError, handle, json } from "@/lib/http";
import { requireUuid } from "@/lib/listings";
import { requireUser } from "@/lib/security/auth";
import { adminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

// Campus admins take down any listing on their own campus. Role comes from the database, not the token.
export const POST = handle<Ctx>(async (req, { params }) => {
  const ctx = await requireUser(req);
  if (ctx.profile.role !== "admin") throw new ApiError(403, "forbidden", "Only admins can do that.");
  const id = requireUuid((await params).id);

  const { data, error } = await adminClient()
    .from("listings")
    .update({ status: "removed" })
    .eq("id", id)
    .eq("campus_id", ctx.campus.id)
    .in("status", ["draft", "active"])
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "listing_not_found", "No removable listing with that ID on your campus.");

  await audit(ctx.userId, "listing.removed_by_admin", id);
  return json({ ok: true });
});
