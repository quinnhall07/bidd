import { randomUUID } from "node:crypto";
import { MAX_PHOTOS, MAX_PHOTO_BYTES, type PhotoResponse } from "@/lib/contracts/listings";
import { ApiError, handle, json } from "@/lib/http";
import { processListingPhoto } from "@/lib/images";
import { PHOTO_BUCKET, getOwnListing, signPhotos, toPhoto, type MediaRow } from "@/lib/listings";
import { requireUser } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

// One photo per request, multipart/form-data field "photo". Re-encoded server-side (metadata stripped).
export const POST = handle<Ctx>(async (req, { params }) => {
  const ctx = await requireUser(req);
  const listing = await getOwnListing(ctx, (await params).id);
  if (!["draft", "active"].includes(listing.status)) {
    throw new ApiError(409, "listing_locked", "This listing can't be changed anymore.");
  }
  if ((listing.listing_media ?? []).length >= MAX_PHOTOS) {
    throw new ApiError(409, "too_many_photos", `A listing can have at most ${MAX_PHOTOS} photos.`);
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_PHOTO_BYTES + 64 * 1024) {
    throw new ApiError(413, "photo_too_large", "Photos can be at most 4 MB.");
  }
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")) {
    throw new ApiError(415, "unsupported_media_type", "Send the photo as multipart/form-data in a field named \"photo\".");
  }

  await enforceRateLimit([{ bucket: `listings:upload:${ctx.userId}`, max: 60, windowSeconds: 3600 }]);

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("photo");
  } catch {
    throw new ApiError(400, "invalid_request", "Couldn't read the upload.");
  }
  if (!(file instanceof File)) throw new ApiError(400, "invalid_request", "Attach the image in a field named \"photo\".");
  if (file.size > MAX_PHOTO_BYTES) throw new ApiError(413, "photo_too_large", "Photos can be at most 4 MB.");

  const photo = await processListingPhoto(Buffer.from(await file.arrayBuffer()));

  const admin = adminClient();
  const path = `${listing.campus_id}/${listing.id}/${randomUUID()}.webp`;
  const upload = await admin.storage.from(PHOTO_BUCKET).upload(path, photo.data, { contentType: "image/webp", upsert: false });
  if (upload.error) throw upload.error;

  const nextPosition = Math.max(-1, ...(listing.listing_media ?? []).map((m) => m.position)) + 1;
  const { data, error } = await admin
    .from("listing_media")
    .insert({ listing_id: listing.id, storage_path: path, position: nextPosition, width: photo.width, height: photo.height })
    .select("id, storage_path, position, width, height")
    .single();
  if (error) {
    await admin.storage.from(PHOTO_BUCKET).remove([path]);
    if ((error.message ?? "").includes("too_many_photos")) {
      throw new ApiError(409, "too_many_photos", `A listing can have at most ${MAX_PHOTOS} photos.`);
    }
    throw error;
  }

  const row = data as MediaRow;
  return json<PhotoResponse>({ photo: toPhoto(row, await signPhotos([row.storage_path])) }, 201);
});
