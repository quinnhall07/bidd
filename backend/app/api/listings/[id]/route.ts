import { audit } from "@/lib/audit";
import { UpdateListingBody, type ListingResponse } from "@/lib/contracts/listings";
import { ApiError, handle, json, readJson } from "@/lib/http";
import { LISTING_WITH_MEDIA, getOwnListing, requireUuid, toDetail, type ListingRow } from "@/lib/listings";
import { requireUser } from "@/lib/security/auth";
import { adminClient } from "@/lib/supabase/admin";
import { userClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

// Detail, read through RLS: own campus only; drafts only for their seller.
export const GET = handle<Ctx>(async (req, { params }) => {
  const ctx = await requireUser(req);
  const id = requireUuid((await params).id);

  const { data, error } = await userClient(ctx.accessToken)
    .from("listings")
    .select(LISTING_WITH_MEDIA)
    .eq("id", id)
    .eq("campus_id", ctx.campus.id)
    .neq("status", "removed")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "listing_not_found", "That listing doesn't exist.");

  return json<ListingResponse>({ listing: await toDetail(data as ListingRow, ctx.userId) });
});

// Owner edits and status changes. Reserved/sold are set by checkout (Phase 3), never by the client.
export const PATCH = handle<Ctx>(async (req, { params }) => {
  const ctx = await requireUser(req);
  const body = await readJson(req, UpdateListingBody);
  const current = await getOwnListing(ctx, (await params).id);

  if (!["draft", "active"].includes(current.status)) {
    throw new ApiError(409, "listing_locked", "This listing can't be changed anymore.");
  }

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.description !== undefined) patch.description = body.description;
  if (body.brand !== undefined) patch.brand = body.brand;
  if (body.priceCents !== undefined) patch.price_cents = body.priceCents;
  if (body.size !== undefined) patch.size = body.size;
  if (body.condition !== undefined) patch.condition = body.condition;
  if (body.tags !== undefined) patch.tags = body.tags;

  if (body.status && body.status !== current.status) {
    if (body.status === "active") {
      if ((current.listing_media ?? []).length === 0) {
        throw new ApiError(409, "listing_needs_photo", "Add at least one photo before publishing.");
      }
      patch.published_at = current.published_at ?? new Date().toISOString();
    }
    patch.status = body.status;
  }

  if (Object.keys(patch).length === 0) {
    return json<ListingResponse>({ listing: await toDetail(current, ctx.userId) });
  }

  const { data, error } = await adminClient()
    .from("listings")
    .update(patch)
    .eq("id", current.id)
    .eq("seller_id", ctx.userId)
    .select(LISTING_WITH_MEDIA)
    .single();
  if (error) throw error;

  if (patch.status) await audit(ctx.userId, `listing.${String(patch.status)}`, current.id);
  return json<ListingResponse>({ listing: await toDetail(data as ListingRow, ctx.userId) });
});
