// Security acceptance tests for listings, photos and the campus feed.
// Needs the dev server running and migrations 001 + 002 applied.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { admin, api, asUser, cleanupUsers, signIn } from "./helpers.mjs";

const BUCKET = "listing-media";
let seller; // UA
let classmate; // UA
let rival; // Ole Miss
let olemissId;
const storagePaths = [];

/** A small JPEG that carries GPS coordinates in its EXIF, like a phone photo. */
async function jpegWithGps(color = "#9E1B32") {
  return sharp({ create: { width: 64, height: 64, channels: 3, background: color } })
    .jpeg()
    .withExif({ IFD0: { Make: "TestPhone" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "33/1 12/1 50/1", GPSLongitudeRef: "W", GPSLongitude: "87/1 32/1 45/1" } })
    .toBuffer();
}

function photoForm(buffer, name = "photo.jpg", type = "image/jpeg") {
  const form = new FormData();
  form.append("photo", new Blob([buffer], { type }), name);
  return form;
}

const validListing = { title: "Crimson rush dress", priceCents: 4500, size: "S", condition: "like_new", tags: ["rush"] };

async function createDraft(user, overrides = {}) {
  const res = await api("/api/listings", { method: "POST", token: user.token, body: { ...validListing, ...overrides } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.listing;
}

async function uploadPhoto(user, listingId, buffer) {
  return api(`/api/listings/${listingId}/media`, { method: "POST", token: user.token, form: photoForm(buffer ?? (await jpegWithGps())) });
}

let published; // seller's active listing
let hiddenDraft; // seller's draft

before(async () => {
  const health = await api("/api/health");
  assert.equal(health.status, 200, `backend not ready: ${JSON.stringify(health.body)}`);
  const { error } = await admin.from("listings").select("id").limit(1);
  assert.ok(!error, "migration 002 not applied: run supabase/migrations/20261017143000_listings_and_media.sql");

  const { data: campuses } = await admin.from("campuses").select("id, slug");
  olemissId = campuses.find((c) => c.slug === "olemiss").id;

  seller = await signIn("crimson.ua.edu", "Sec Seller");
  classmate = await signIn("ua.edu", "Sec Classmate");
  rival = await signIn("go.olemiss.edu", "Sec Rival");
});

after(async () => {
  if (storagePaths.length) await admin.storage.from(BUCKET).remove(storagePaths);
  await cleanupUsers();
});

// --- Creating -------------------------------------------------------------------

test("create: server sets seller, campus and draft status; forged fields are ignored", async () => {
  const res = await api("/api/listings", {
    method: "POST",
    token: seller.token,
    body: { ...validListing, campus_id: olemissId, campusId: olemissId, seller_id: rival.userId, sellerId: rival.userId, status: "sold" },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  hiddenDraft = res.body.listing;
  assert.equal(hiddenDraft.status, "draft");
  assert.equal(hiddenDraft.seller.id, seller.userId);

  const { data } = await admin.from("listings").select("campus_id, seller_id, status").eq("id", hiddenDraft.id).single();
  assert.notEqual(data.campus_id, olemissId);
  assert.equal(data.seller_id, seller.userId);
  assert.equal(data.status, "draft");
});

test("create: rejects bad prices, sizes and tags", async () => {
  for (const bad of [{ priceCents: -500 }, { priceCents: 0 }, { priceCents: 10_000_000 }, { priceCents: 12.5 }, { size: "HUGE" }, { tags: ["free_stuff"] }, { title: "" }]) {
    const res = await api("/api/listings", { method: "POST", token: seller.token, body: { ...validListing, ...bad } });
    assert.equal(res.status, 400, `accepted ${JSON.stringify(bad)}`);
  }
});

test("create: requires sign-in", async () => {
  assert.equal((await api("/api/listings", { method: "POST", body: validListing })).status, 401);
});

// --- Photos ---------------------------------------------------------------------------

test("publish without a photo is refused", async () => {
  const draft = await createDraft(seller);
  const res = await api(`/api/listings/${draft.id}`, { method: "PATCH", token: seller.token, body: { status: "active" } });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "listing_needs_photo");
});

test("upload: a text file renamed .jpg is rejected", async () => {
  const draft = await createDraft(seller);
  const res = await api(`/api/listings/${draft.id}/media`, {
    method: "POST",
    token: seller.token,
    form: photoForm(Buffer.from("definitely not an image"), "photo.jpg", "image/jpeg"),
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "invalid_image");
});

test("upload: files over 4 MB are rejected", async () => {
  const draft = await createDraft(seller);
  const big = Buffer.alloc(5 * 1024 * 1024, 0xff);
  const res = await api(`/api/listings/${draft.id}/media`, { method: "POST", token: seller.token, form: photoForm(big) });
  assert.equal(res.status, 413);
});

test("upload: GPS/EXIF metadata is stripped and the photo is stored as WebP", async () => {
  const original = await jpegWithGps();
  assert.ok((await sharp(original).metadata()).exif, "test image should start with EXIF");

  published = await createDraft(seller, { title: "Gameday overalls", tags: ["gameday"] });
  const res = await uploadPhoto(seller, published.id, original);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.ok(res.body.photo.url, "signed URL missing");

  const { data: media } = await admin.from("listing_media").select("storage_path").eq("listing_id", published.id);
  storagePaths.push(...media.map((m) => m.storage_path));
  const { data: blob, error } = await admin.storage.from(BUCKET).download(media[0].storage_path);
  assert.ok(!error, error?.message);
  const stored = Buffer.from(await blob.arrayBuffer());
  const meta = await sharp(stored).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.exif, undefined, "EXIF survived the upload");
});

test("upload: at most 6 photos per listing", async () => {
  const draft = await createDraft(seller);
  const img = await jpegWithGps("#14213D");
  for (let i = 0; i < 6; i++) assert.equal((await uploadPhoto(seller, draft.id, img)).status, 201);
  const seventh = await uploadPhoto(seller, draft.id, img);
  assert.equal(seventh.status, 409);
  assert.equal(seventh.body.error.code, "too_many_photos");
  const { data: media } = await admin.from("listing_media").select("storage_path").eq("listing_id", draft.id);
  storagePaths.push(...media.map((m) => m.storage_path));
});

// --- Visibility --------------------------------------------------------------------------

test("publish puts the listing in the seller's campus feed only", async () => {
  const pub = await api(`/api/listings/${published.id}`, { method: "PATCH", token: seller.token, body: { status: "active" } });
  assert.equal(pub.status, 200, JSON.stringify(pub.body));
  assert.equal(pub.body.listing.status, "active");

  const classmateFeed = await api("/api/listings?tag=gameday", { token: classmate.token });
  assert.equal(classmateFeed.status, 200);
  const seen = classmateFeed.body.listings.find((l) => l.id === published.id);
  assert.ok(seen, "classmate can't see the published listing");
  assert.equal(seen.seller.displayName, "Sec Seller");
  assert.ok(!JSON.stringify(seen).includes("@"), "feed leaks an email address");

  const rivalFeed = await api("/api/listings", { token: rival.token });
  assert.ok(!rivalFeed.body.listings.some((l) => l.id === published.id), "Ole Miss sees a UA listing");
});

test("another campus can't read a listing by ID, via the API or directly", async () => {
  assert.equal((await api(`/api/listings/${published.id}`, { token: rival.token })).status, 404);
  const db = asUser(rival.token);
  assert.deepEqual((await db.from("listings").select("id").eq("id", published.id)).data ?? [], []);
  assert.deepEqual((await db.from("listing_media").select("id").eq("listing_id", published.id)).data ?? [], []);
});

test("drafts are invisible to classmates", async () => {
  assert.equal((await api(`/api/listings/${hiddenDraft.id}`, { token: classmate.token })).status, 404);
  const feed = await api("/api/listings", { token: classmate.token });
  assert.ok(!feed.body.listings.some((l) => l.id === hiddenDraft.id));
  assert.deepEqual((await asUser(classmate.token).from("listings").select("id").eq("id", hiddenDraft.id)).data ?? [], []);
  // ...but visible to their seller.
  assert.equal((await api(`/api/listings/${hiddenDraft.id}`, { token: seller.token })).status, 200);
  const mine = await api("/api/me/listings", { token: seller.token });
  assert.ok(mine.body.listings.some((l) => l.id === hiddenDraft.id));
});

// --- Tampering ------------------------------------------------------------------------------

test("only the seller can edit, add or delete photos", async () => {
  const edit = await api(`/api/listings/${published.id}`, { method: "PATCH", token: classmate.token, body: { priceCents: 100 } });
  assert.equal(edit.status, 404);
  assert.equal((await uploadPhoto(classmate, published.id)).status, 404);
  const photoId = (await api(`/api/listings/${published.id}`, { token: seller.token })).body.listing.photos[0].id;
  assert.equal((await api(`/api/listings/${published.id}/media/${photoId}`, { method: "DELETE", token: classmate.token })).status, 404);
});

test("clients can't mark a listing sold or reserved", async () => {
  for (const status of ["sold", "reserved"]) {
    const res = await api(`/api/listings/${published.id}`, { method: "PATCH", token: seller.token, body: { status } });
    assert.equal(res.status, 400, `status ${status} accepted`);
  }
});

test("RLS: students can't write listings, photos or closets directly", async () => {
  const db = asUser(seller.token);
  assert.ok((await db.from("listings").update({ price_cents: 1 }).eq("id", published.id)).error);
  assert.ok((await db.from("listings").insert({ ...validListing, seller_id: seller.userId })).error);
  assert.ok((await db.from("listing_media").delete().eq("listing_id", published.id)).error);
  assert.ok((await db.from("closets").insert({ kind: "personal", name: "x" })).error);
  const { data } = await admin.from("listings").select("price_cents").eq("id", published.id).single();
  assert.equal(data.price_cents, 4500);
});

test("photos can't be fetched without a signed URL", async () => {
  const path = storagePaths[0];
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  assert.notEqual((await fetch(publicUrl)).status, 200, "photo is publicly readable");
  const { error } = await asUser(classmate.token).storage.from(BUCKET).download(path);
  assert.ok(error, "a student could download directly from storage");
  const { error: uploadError } = await asUser(seller.token).storage.from(BUCKET).upload(`x/${Date.now()}.webp`, Buffer.from("x"), { contentType: "image/webp" });
  assert.ok(uploadError, "a student could upload directly to storage");
});

test("feed paginates with a cursor", async () => {
  const first = await api("/api/listings?limit=1", { token: classmate.token });
  assert.equal(first.status, 200);
  assert.ok(first.body.listings.length <= 1);
  const bad = await api("/api/listings?cursor=not-a-cursor", { token: classmate.token });
  assert.equal(bad.status, 400);
});
