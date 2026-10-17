// Security acceptance tests for live bidding on resale listings.
// Needs the dev server running and migrations 001-005 applied.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { PUBLISHABLE, SUPABASE_URL, admin, api, asUser, cleanupUsers, noSession, signIn } from "./helpers.mjs";

let seller; // UA
let bidder; // UA
let bidder2; // UA
let rival; // Ole Miss
let auctionId; // UA listing running as an auction
let fixedId; // UA listing at a fixed price
const storagePaths = [];

async function publishedListing(owner, overrides = {}) {
  const created = await api("/api/listings", {
    method: "POST",
    token: owner.token,
    body: { title: "Gameday dress", priceCents: 4000, size: "S", condition: "like_new", tags: ["gameday"], ...overrides },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.listing.id;
  const img = await sharp({ create: { width: 24, height: 24, channels: 3, background: "#9E1B32" } }).jpeg().toBuffer();
  const form = new FormData();
  form.append("photo", new Blob([img], { type: "image/jpeg" }), "p.jpg");
  assert.equal((await api(`/api/listings/${id}/media`, { method: "POST", token: owner.token, form })).status, 201);
  assert.equal((await api(`/api/listings/${id}`, { method: "PATCH", token: owner.token, body: { status: "active" } })).status, 200);
  const { data } = await admin.from("listing_media").select("storage_path").eq("listing_id", id);
  storagePaths.push(...data.map((m) => m.storage_path));
  return id;
}

const bid = (user, listingId, body) => api(`/api/listings/${listingId}/bids`, { method: "POST", token: user.token, body });
const bids = (user, listingId) => api(`/api/listings/${listingId}/bids`, { token: user.token });
const startAuction = (user, listingId, body) => api(`/api/listings/${listingId}/auction`, { method: "POST", token: user.token, body });
const setEndsAt = async (id, ms) =>
  assert.ok(!(await admin.from("listings").update({ auction_ends_at: new Date(Date.now() + ms).toISOString() }).eq("id", id)).error);

before(async () => {
  const health = await api("/api/health");
  assert.equal(health.status, 200, `backend not ready: ${JSON.stringify(health.body)}`);
  const { error } = await admin.from("listing_bids").select("id").limit(1);
  assert.ok(!error, "migration 005 not applied: run supabase/migrations/20261017170000_listing_bids.sql");

  seller = await signIn("crimson.ua.edu", "Sec Seller");
  bidder = await signIn("crimson.ua.edu", "Sec Bidder");
  bidder2 = await signIn("ua.edu", "Sec Bidder Two");
  rival = await signIn("go.olemiss.edu", "Sec Rival");
  auctionId = await publishedListing(seller);
  fixedId = await publishedListing(seller, { title: "Rush tee", tags: ["rush"] });
});

after(async () => {
  if (storagePaths.length) await admin.storage.from("listing-media").remove(storagePaths);
  await cleanupUsers();
});

test("bids need sign-in; a fixed-price listing isn't an auction", async () => {
  assert.equal((await api(`/api/listings/${auctionId}/bids`)).status, 401);
  assert.equal((await api(`/api/listings/${auctionId}/bids`, { method: "POST", body: { amountCents: 5000 } })).status, 401);
  const res = await bids(bidder, fixedId);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "not_an_auction");
  const placed = await bid(bidder, fixedId, { amountCents: 5000 });
  assert.equal(placed.status, 400);
  assert.equal(placed.body.error.code, "not_an_auction");
});

test("only the seller can start an auction, with a valid start and duration", async () => {
  for (const user of [bidder, rival]) {
    const res = await startAuction(user, auctionId, { startCents: 2000, hours: 24 });
    assert.equal(res.status, 404, `${user.email} started someone else's auction`);
  }
  assert.equal((await startAuction(seller, auctionId, { startCents: 50, hours: 24 })).status, 400);
  assert.equal((await startAuction(seller, auctionId, { startCents: 2000, hours: 0 })).status, 400);
  assert.equal((await startAuction(seller, auctionId, { startCents: 2000, hours: 169 })).status, 400);

  const res = await startAuction(seller, auctionId, { startCents: 2000, hours: 24 });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.auction.startCents, 2000);
  assert.equal(res.body.auction.highCents, null);
  assert.equal(res.body.auction.bidCount, 0);
  assert.equal(res.body.auction.minNextCents, 2000);
  assert.equal(res.body.auction.ended, false);
});

test("another campus can't see or bid (looks like a missing listing)", async () => {
  const read = await bids(rival, auctionId);
  assert.equal(read.status, 404);
  assert.equal(read.body.error.code, "listing_not_found");
  const placed = await bid(rival, auctionId, { amountCents: 5000 });
  assert.equal(placed.status, 404);
  assert.equal(placed.body.error.code, "listing_not_found");
});

test("sellers can't bid on their own listing", async () => {
  const res = await bid(seller, auctionId, { amountCents: 5000 });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, "own_listing");
});

test("a bid below the minimum is rejected and the message names the minimum", async () => {
  const res = await bid(bidder, auctionId, { amountCents: 1999 });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "bid_too_low");
  assert.match(res.body.error.message, /\$20\b/);
  assert.equal((await bid(bidder, auctionId, { amountCents: 0 })).status, 400);
  assert.equal((await bid(bidder, auctionId, { amountCents: 20.5 })).status, 400);
});

test("forged bidder, campus and listing fields are ignored; bidders stay anonymous", async () => {
  const { data: rivalCampus } = await admin.from("campus_memberships").select("campus_id").eq("user_id", rival.userId).single();
  const res = await bid(bidder, auctionId, {
    amountCents: 2000,
    bidder_id: bidder2.userId,
    bidderId: bidder2.userId,
    campus_id: rivalCampus.campus_id,
    listing_id: fixedId,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.auction.highCents, 2000);
  assert.equal(res.body.auction.minNextCents, 2100); // $20 + max($1, 5% rounded up to a dollar)
  assert.equal(res.body.auction.leading, true);
  assert.equal(res.body.bids[0].bidder, "You");

  const { data: rows } = await admin.from("listing_bids").select("bidder_id, campus_id, listing_id").eq("listing_id", auctionId);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].bidder_id, bidder.userId);
  const { data: listing } = await admin.from("listings").select("campus_id").eq("id", auctionId).single();
  assert.equal(rows[0].campus_id, listing.campus_id);
  assert.equal((await admin.from("listing_bids").select("id").eq("listing_id", fixedId)).data.length, 0);

  const other = await bids(bidder2, auctionId);
  assert.equal(other.status, 200);
  assert.equal(other.body.bids[0].bidder, "Bidder 1");
  assert.equal(other.body.auction.leading, false);
  const text = JSON.stringify(other.body);
  for (const secret of [bidder.userId, bidder.email, "Sec Bidder"]) assert.ok(!text.includes(secret), `bids leak ${secret}`);
});

test("outbidding flips the lead; an auction with bids can't be restarted or bought at list price", async () => {
  assert.equal((await bid(bidder2, auctionId, { amountCents: 2099 })).status, 400);
  const res = await bid(bidder2, auctionId, { amountCents: 2100 });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.auction.leading, true);
  assert.equal(res.body.auction.bidCount, 2);
  assert.deepEqual(res.body.bids.map((b) => b.bidder), ["You", "Bidder 1"]);
  assert.equal((await bids(bidder, auctionId)).body.auction.leading, false);

  const restart = await startAuction(seller, auctionId, { startCents: 100, hours: 1 });
  assert.equal(restart.status, 409);
  assert.equal(restart.body.error.code, "auction_has_bids");

  const buy = await api("/api/checkout", { method: "POST", token: bidder.token, body: { listingId: auctionId } });
  assert.equal(buy.status, 409);
});

test("a bid in the last 2 minutes resets the clock to 2 minutes", async () => {
  await setEndsAt(auctionId, 30_000);
  const before = Date.now();
  const res = await bid(bidder, auctionId, { amountCents: 2300 });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.ok(Date.parse(res.body.auction.endsAt) >= before + 110_000, `clock not extended: ${res.body.auction.endsAt}`);
});

test("bids after the end are rejected", async () => {
  await setEndsAt(auctionId, -1000);
  const res = await bid(bidder2, auctionId, { amountCents: 10_000 });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "auction_ended");
  assert.equal((await bids(bidder2, auctionId)).body.auction.ended, true);
});

test("RLS: anonymous clients can't read listing_bids", async () => {
  const { count } = await admin.from("listing_bids").select("id", { count: "exact", head: true }).eq("listing_id", auctionId);
  assert.ok(count > 0, "expected bids to exist for this check");
  const anon = createClient(SUPABASE_URL, PUBLISHABLE, { auth: noSession });
  const { data, error } = await anon.from("listing_bids").select("*").limit(1);
  assert.ok(error || (data ?? []).length === 0, "listing_bids readable anonymously");
  const student = await asUser(bidder.token).from("listing_bids").select("*").eq("listing_id", auctionId);
  assert.ok(student.error || (student.data ?? []).length === 0, "listing_bids readable by a student");
});

test("RLS: nobody can write bids or call the bid functions with the publishable key", async () => {
  const anon = createClient(SUPABASE_URL, PUBLISHABLE, { auth: noSession });
  const db = asUser(bidder.token);
  const { data: listing } = await admin.from("listings").select("campus_id").eq("id", auctionId).single();
  const row = { listing_id: auctionId, campus_id: listing.campus_id, bidder_id: bidder.userId, amount_cents: 999_999 };

  assert.ok((await anon.from("listing_bids").insert(row)).error, "anonymous insert into listing_bids allowed");
  assert.ok((await db.from("listing_bids").insert(row)).error, "student insert into listing_bids allowed");
  assert.ok((await db.from("listing_bids").update({ amount_cents: 1 }).eq("listing_id", auctionId)).error);
  assert.ok((await db.from("listing_bids").delete().eq("listing_id", auctionId)).error);
  assert.ok((await db.from("listings").update({ auction_ends_at: null, auction_start_cents: null }).eq("id", auctionId)).error);
  assert.ok((await db.rpc("place_listing_bid", { p_listing_id: auctionId, p_bidder_id: bidder.userId, p_amount_cents: 999_999 })).error);
  assert.ok((await anon.rpc("place_listing_bid", { p_listing_id: auctionId, p_bidder_id: bidder.userId, p_amount_cents: 999_999 })).error);
  assert.ok((await db.rpc("start_listing_auction", { p_listing_id: auctionId, p_seller_id: seller.userId, p_start_cents: 100, p_hours: 1 })).error);
  // Even the secret key can only read bids: writes go through place_listing_bid (lock, minimum, clock).
  assert.ok((await admin.from("listing_bids").insert(row)).error, "service key can insert into listing_bids directly");
  assert.ok((await admin.from("listing_bids").update({ amount_cents: 1 }).eq("listing_id", auctionId)).error);
  assert.ok((await admin.from("listing_bids").delete().eq("listing_id", auctionId)).error);

  const { data } = await admin.from("listing_bids").select("amount_cents").eq("listing_id", auctionId).eq("amount_cents", 999_999);
  assert.equal(data.length, 0);
});
