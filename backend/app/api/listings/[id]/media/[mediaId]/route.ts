import { ApiError, handle, json } from "@/lib/http";
import { PHOTO_BUCKET, getOwnListing } from "@/lib/listings";
import { requireUser } from "@/lib/security/auth";
import { adminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string; mediaId: string }> };

export const DELETE = handle<Ctx>(async (req, { params }) => {
  const ctx = await requireUser(req);
  const { id, mediaId } = await params;
  const listing = await getOwnListing(ctx, id);
  const media = listing.listing_media ?? [];
  const target = media.find((m) => m.id === mediaId.toLowerCase());
  if (!target) throw new ApiError(404, "photo_not_found", "That photo doesn't exist.");
  if (listing.status === "active" && media.length === 1) {
    throw new ApiError(409, "listing_needs_photo", "A published listing needs at least one photo. Unpublish it first.");
  }
  if (!["draft", "active"].includes(listing.status)) {
    throw new ApiError(409, "listing_locked", "This listing can't be changed anymore.");
  }

  const admin = adminClient();
  const { error } = await admin.from("listing_media").delete().eq("id", target.id).eq("listing_id", listing.id);
  if (error) throw error;
  const removed = await admin.storage.from(PHOTO_BUCKET).remove([target.storage_path]);
  if (removed.error) console.error("[media] storage cleanup failed", removed.error.message);

  return json({ ok: true });
});
