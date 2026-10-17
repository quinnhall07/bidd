import type { MyListingsResponse } from "@/lib/contracts/listings";
import { handle, json } from "@/lib/http";
import { LISTING_WITH_MEDIA, summarize, type ListingRow } from "@/lib/listings";
import { requireUser } from "@/lib/security/auth";
import { userClient } from "@/lib/supabase/server";

// The caller's own listings, drafts included (removed ones hidden).
export const GET = handle(async (req) => {
  const ctx = await requireUser(req);
  const { data, error } = await userClient(ctx.accessToken)
    .from("listings")
    .select(LISTING_WITH_MEDIA)
    .eq("seller_id", ctx.userId)
    .neq("status", "removed")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return json<MyListingsResponse>({ listings: await summarize((data ?? []) as ListingRow[]) });
});
