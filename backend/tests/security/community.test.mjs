// Security acceptance tests for the Closet Cup, chapter approvals, reports, blocks and admin removal.
// Needs the dev server running and migrations 001-004 applied.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { admin, api, asUser, cleanupUsers, signIn } from "./helpers.mjs";

let seller, buyer, officer, reporter1, reporter2, rival;
let chapterId; // a UA chapter
let rivalCampusListing;
const storagePaths = [];

async function publishedListing(owner, title = "Rush dress") {
  const created = await api("/api/listings", {
    method: "POST",
    token: owner.token,
    body: { title, priceCents: 3000, size: "S", condition: "like_new", tags: ["rush"] },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.listing.id;
  const img = await sharp({ create: { width: 24, height: 24, channels: 3, background: "#828A8F" } }).jpeg().toBuffer();
  const form = new FormData();
  form.append("photo", new Blob([img], { type: "image/jpeg" }), "p.jpg");
  assert.equal((await api(`/api/listings/${id}/media`, { method: "POST", token: owner.token, form })).status, 201);
  assert.equal((await api(`/api/listings/${id}`, { method: "PATCH", token: owner.token, body: { status: "active" } })).status, 200);
  const { data } = await admin.from("listing_media").select("storage_path").eq("listing_id", id);
  storagePaths.push(...data.map((m) => m.storage_path));
  return id;
}

async function completeSale(sellerUser, buyerUser, listingId) {
  const order = await api("/api/checkout", { method: "POST", token: buyerUser.token, body: { listingId } });
  assert.equal(order.status, 201, JSON.stringify(order.body));
  const qr = await api(`/api/orders/${order.body.order.id}/handoff-token`, { method: "POST", token: buyerUser.token });
  const done = await api("/api/handoffs/confirm", { method: "POST", token: sellerUser.token, body: { token: qr.body.qrPayload } });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  return order.body.order.id;
}

const pointsFor = (cup, orgId) => cup.campus.standings.find((s) => s.organizationId === orgId)?.points ?? 0;
const pendingRequestId = async (userId) =>
  (await admin.from("organization_memberships").select("id").eq("user_id", userId).eq("status", "pending").single()).data.id;

before(async () => {
  const health = await api("/api/health");
  assert.equal(health.status, 200, `backend not ready: ${JSON.stringify(health.body)}`);
  const { error } = await admin.from("cup_events").select("id").limit(1);
  assert.ok(!error, "migration 004 not applied: run supabase/migrations/20261017160000_cup_and_moderation.sql");

  const { data: campuses } = await admin.from("campuses").select("id, slug");
  const ua = campuses.find((c) => c.slug === "ua").id;
  const { data: orgs } = await admin.from("organizations").select("id").eq("campus_id", ua).eq("kind", "sorority").limit(1);
  chapterId = orgs[0].id;

  seller = await signIn("crimson.ua.edu", "Cup Seller");
  buyer = await signIn("crimson.ua.edu", "Cup Buyer");
  officer = await signIn("ua.edu", "Cup Officer");
  reporter1 = await signIn("crimson.ua.edu", "Reporter One");
  reporter2 = await signIn("crimson.ua.edu", "Reporter Two");
  rival = await signIn("go.olemiss.edu", "Cup Rival");

  // Bootstrap the first officer the way an admin would (the SQL snippet in docs/API.md).
  await api("/api/onboarding", { method: "POST", token: officer.token, body: { displayName: "Cup Officer", organizationId: chapterId } });
  await admin.from("organization_memberships").update({ status: "active", role: "officer", decided_at: new Date().toISOString() }).eq("user_id", officer.userId);

  // Seller asks to join the same chapter (pending).
  await api("/api/onboarding", { method: "POST", token: seller.token, body: { displayName: "Cup Seller", organizationId: chapterId } });
  rivalCampusListing = await publishedListing(rival, "Ole Miss gameday dress");
});

after(async () => {
  if (storagePaths.length) await admin.storage.from("listing-media").remove(storagePaths);
  await cleanupUsers();
});

// --- Chapter approvals ---------------------------------------------------------------

test("non-officers see no join requests and can't approve", async () => {
  const requestId = await pendingRequestId(seller.userId);
  for (const user of [buyer, seller, rival]) {
    const list = await api("/api/chapter/requests", { token: user.token });
    assert.deepEqual(list.body.requests, []);
    const decide = await api(`/api/chapter/requests/${requestId}`, { method: "POST", token: user.token, body: { approve: true } });
    assert.equal(decide.status, 404, `${user.email} could approve`);
  }
});

test("a sale before approval scores nothing (pending isn't membership)", async () => {
  const before = await api("/api/cup", { token: buyer.token });
  await completeSale(seller, buyer, await publishedListing(seller, "Pending-member sale"));
  const after = await api("/api/cup", { token: buyer.token });
  assert.equal(pointsFor(after.body, chapterId), pointsFor(before.body, chapterId));
});

test("an officer approves a request", async () => {
  const requestId = await pendingRequestId(seller.userId);
  const list = await api("/api/chapter/requests", { token: officer.token });
  const req = list.body.requests.find((r) => r.id === requestId);
  assert.ok(req, "officer can't see the request");
  assert.equal(req.user.displayName, "Cup Seller");
  assert.ok(!JSON.stringify(list.body).includes("@"), "requests leak an email");

  const ok = await api(`/api/chapter/requests/${requestId}`, { method: "POST", token: officer.token, body: { approve: true } });
  assert.equal(ok.status, 200);
  const me = await api("/api/me", { token: seller.token });
  assert.equal(me.body.memberships[0].status, "active");
  assert.equal(me.body.memberships[0].role, "member");
  const again = await api(`/api/chapter/requests/${requestId}`, { method: "POST", token: officer.token, body: { approve: false } });
  assert.equal(again.status, 409);
});

// --- Closet Cup ----------------------------------------------------------------------

test("a completed handoff by an approved member scores 10 points, once", async () => {
  const before = await api("/api/cup", { token: buyer.token });
  const orderId = await completeSale(seller, buyer, await publishedListing(seller, "Scoring sale"));
  const after = await api("/api/cup", { token: buyer.token });
  assert.equal(pointsFor(after.body, chapterId), pointsFor(before.body, chapterId) + 10);
  const { count } = await admin.from("cup_events").select("id", { count: "exact", head: true }).eq("order_id", orderId);
  assert.equal(count, 1);
});

test("the Cup shows aggregates only, per campus and across the conference", async () => {
  const cup = await api("/api/cup", { token: rival.token });
  assert.equal(cup.status, 200);
  assert.ok(!cup.body.campus.standings.some((s) => s.organizationId === chapterId), "Ole Miss sees UA chapters as its own");
  assert.ok(cup.body.conference.some((c) => c.isYourCampus));
  assert.ok(cup.body.conference.length >= 2);
  const text = JSON.stringify(cup.body);
  for (const leak of [seller.userId, buyer.userId, "@", "buyer", "seller_id"]) assert.ok(!text.includes(leak), `cup leaks ${leak}`);
  assert.equal((await api("/api/cup")).status, 401);
});

test("RLS: Cup events, reports and approvals can't be touched directly", async () => {
  const db = asUser(seller.token);
  const { data, error } = await db.from("cup_events").select("*").limit(1);
  assert.ok(error || (data ?? []).length === 0);
  assert.ok((await db.from("cup_events").insert({ organization_id: chapterId, points: 1000 })).error);
  const reports = await db.from("reports").select("*").limit(1);
  assert.ok(reports.error || (reports.data ?? []).length === 0, "reports are readable");
  assert.ok((await db.rpc("decide_chapter_request", { p_membership_id: chapterId, p_officer_id: seller.userId, p_approve: true })).error);
  assert.ok((await db.rpc("cup_campus_standings", { p_campus_id: chapterId })).error);
  assert.ok((await db.rpc("report_listing", { p_listing_id: chapterId, p_reporter_id: seller.userId, p_reason: "other", p_details: null })).error);
  assert.ok((await db.from("organization_memberships").update({ role: "officer" }).eq("user_id", seller.userId)).error);
});

// --- Reports -------------------------------------------------------------------------

test("reports: can't report your own or another campus's listing", async () => {
  const listingId = await publishedListing(seller, "Own listing");
  const own = await api(`/api/listings/${listingId}/report`, { method: "POST", token: seller.token, body: { reason: "other" } });
  assert.equal(own.status, 409);
  const cross = await api(`/api/listings/${rivalCampusListing}/report`, { method: "POST", token: buyer.token, body: { reason: "scam_or_fraud" } });
  assert.equal(cross.status, 404);
  const bad = await api(`/api/listings/${listingId}/report`, { method: "POST", token: buyer.token, body: { reason: "i_dont_like_it" } });
  assert.equal(bad.status, 400);
});

test("reports: three different students hide a listing; repeats don't count", async () => {
  const listingId = await publishedListing(seller, "Reported item");
  const r1 = await api(`/api/listings/${listingId}/report`, { method: "POST", token: reporter1.token, body: { reason: "offensive" } });
  assert.deepEqual(r1.body, { ok: true, hidden: false });
  await api(`/api/listings/${listingId}/report`, { method: "POST", token: reporter1.token, body: { reason: "offensive" } });
  const r2 = await api(`/api/listings/${listingId}/report`, { method: "POST", token: reporter2.token, body: { reason: "other" } });
  assert.equal(r2.body.hidden, false, "two reporters (one repeated) hid the listing");
  const r3 = await api(`/api/listings/${listingId}/report`, { method: "POST", token: buyer.token, body: { reason: "prohibited_item", details: "test" } });
  assert.equal(r3.body.hidden, true);
  const feed = await api("/api/listings", { token: reporter1.token });
  assert.ok(!feed.body.listings.some((l) => l.id === listingId));
});

// --- Blocks --------------------------------------------------------------------------

test("blocking a seller hides their listings from my feed; unblocking restores them", async () => {
  const listingId = await publishedListing(seller, "Blockable item");
  assert.equal((await api("/api/blocks", { method: "POST", token: reporter2.token, body: { userId: reporter2.userId } })).status, 400);
  assert.equal((await api("/api/blocks", { method: "POST", token: reporter2.token, body: { userId: seller.userId } })).status, 200);
  let feed = await api("/api/listings", { token: reporter2.token });
  assert.ok(!feed.body.listings.some((l) => l.seller.id === seller.userId), "blocked seller still in feed");
  const others = await api("/api/listings", { token: reporter1.token });
  assert.ok(others.body.listings.some((l) => l.id === listingId), "block leaked into someone else's feed");

  assert.equal((await api(`/api/blocks/${seller.userId}`, { method: "DELETE", token: reporter2.token })).status, 200);
  feed = await api("/api/listings", { token: reporter2.token });
  assert.ok(feed.body.listings.some((l) => l.id === listingId));
  assert.ok((await asUser(reporter2.token).from("blocks").insert({ blocker_id: reporter2.userId, blocked_id: seller.userId })).error);
});

// --- Admin removal -------------------------------------------------------------------

test("only a campus admin can remove listings, and only on their campus", async () => {
  const listingId = await publishedListing(seller, "Admin target");
  assert.equal((await api(`/api/admin/listings/${listingId}/remove`, { method: "POST", token: officer.token })).status, 403);

  await admin.from("profiles").update({ role: "admin" }).eq("id", rival.userId);
  assert.equal((await api(`/api/admin/listings/${listingId}/remove`, { method: "POST", token: rival.token })).status, 404);

  await admin.from("profiles").update({ role: "admin" }).eq("id", officer.userId);
  assert.equal((await api(`/api/admin/listings/${listingId}/remove`, { method: "POST", token: officer.token })).status, 200);
  const { data } = await admin.from("listings").select("status").eq("id", listingId).single();
  assert.equal(data.status, "removed");
});
