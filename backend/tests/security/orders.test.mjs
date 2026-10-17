// Security acceptance tests for pilot checkout, orders and QR handoffs.
// Needs the dev server running and migrations 001-003 applied.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { admin, api, asUser, cleanupUsers, signIn } from "./helpers.mjs";

let seller; // UA
let buyer; // UA
let buyer2; // UA
let rival; // Ole Miss
const storagePaths = [];

async function publishedListing(owner, overrides = {}) {
  const created = await api("/api/listings", {
    method: "POST",
    token: owner.token,
    body: { title: "Formal gown", priceCents: 4500, size: "M", condition: "good", tags: ["formal"], ...overrides },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.listing.id;
  const img = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#9E1B32" } }).jpeg().toBuffer();
  const form = new FormData();
  form.append("photo", new Blob([img], { type: "image/jpeg" }), "p.jpg");
  assert.equal((await api(`/api/listings/${id}/media`, { method: "POST", token: owner.token, form })).status, 201);
  const pub = await api(`/api/listings/${id}`, { method: "PATCH", token: owner.token, body: { status: "active" } });
  assert.equal(pub.status, 200, JSON.stringify(pub.body));
  const { data } = await admin.from("listing_media").select("storage_path").eq("listing_id", id);
  storagePaths.push(...data.map((m) => m.storage_path));
  return id;
}

const checkout = (user, listingId, extra = {}) =>
  api("/api/checkout", { method: "POST", token: user.token, body: { listingId, ...extra } });
const listingStatus = async (id) => (await admin.from("listings").select("status").eq("id", id).single()).data.status;

before(async () => {
  const health = await api("/api/health");
  assert.equal(health.status, 200, `backend not ready: ${JSON.stringify(health.body)}`);
  const { error } = await admin.from("orders").select("id").limit(1);
  assert.ok(!error, "migration 003 not applied: run supabase/migrations/20261017153000_orders_and_handoffs.sql");

  seller = await signIn("crimson.ua.edu", "Sec Seller");
  buyer = await signIn("crimson.ua.edu", "Sec Buyer");
  buyer2 = await signIn("ua.edu", "Sec Buyer Two");
  rival = await signIn("go.olemiss.edu", "Sec Rival");
});

after(async () => {
  if (storagePaths.length) await admin.storage.from("listing-media").remove(storagePaths);
  await cleanupUsers();
});

let soldListing;
let order;

test("checkout needs sign-in, and sellers can't buy their own listing", async () => {
  soldListing = await publishedListing(seller);
  assert.equal((await api("/api/checkout", { method: "POST", body: { listingId: soldListing } })).status, 401);
  const own = await checkout(seller, soldListing);
  assert.equal(own.status, 409);
  assert.equal(own.body.error.code, "cannot_buy_own_listing");
});

test("another campus can't buy (looks like a missing listing)", async () => {
  const res = await checkout(rival, soldListing);
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, "listing_not_found");
});

test("checkout reserves the listing; price and fee come from the server; no payment taken", async () => {
  const res = await checkout(buyer, soldListing, { priceCents: 1, buyerFeeCents: 0, totalCents: 1, status: "completed" });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  order = res.body.order;
  assert.equal(order.priceCents, 4500);
  assert.equal(order.buyerFeeCents, 275); // 5% + $0.50
  assert.equal(order.totalCents, 4775);
  assert.equal(order.status, "pending_meetup");
  assert.equal(order.payment.collected, false);
  assert.equal(await listingStatus(soldListing), "reserved");

  const feed = await api("/api/listings", { token: buyer2.token });
  assert.ok(!feed.body.listings.some((l) => l.id === soldListing), "reserved listing still in the feed");
});

test("a reserved listing can't be bought twice or edited", async () => {
  const second = await checkout(buyer2, soldListing);
  assert.equal(second.status, 409);
  assert.equal(second.body.error.code, "listing_unavailable");
  const edit = await api(`/api/listings/${soldListing}`, { method: "PATCH", token: seller.token, body: { priceCents: 100000 } });
  assert.equal(edit.status, 409);
});

test("only the buyer can get a handoff QR", async () => {
  for (const user of [seller, buyer2, rival]) {
    const res = await api(`/api/orders/${order.id}/handoff-token`, { method: "POST", token: user.token });
    assert.equal(res.status, 404, `${user.email} got a token`);
  }
});

test("an older QR stops working once a new one is issued", async () => {
  const first = await api(`/api/orders/${order.id}/handoff-token`, { method: "POST", token: buyer.token });
  const second = await api(`/api/orders/${order.id}/handoff-token`, { method: "POST", token: buyer.token });
  assert.equal(second.status, 200);
  const res = await api("/api/handoffs/confirm", { method: "POST", token: seller.token, body: { token: first.body.qrPayload } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "invalid_handoff");
});

test("handoff: only the seller can confirm, exactly once", async () => {
  const { body } = await api(`/api/orders/${order.id}/handoff-token`, { method: "POST", token: buyer.token });
  assert.match(body.qrPayload, /^bidd:handoff:/);

  for (const user of [buyer, buyer2, rival]) {
    const res = await api("/api/handoffs/confirm", { method: "POST", token: user.token, body: { token: body.qrPayload } });
    assert.equal(res.status, 400, `${user.email} confirmed someone else's sale`);
  }
  assert.equal(await listingStatus(soldListing), "reserved");

  const ok = await api("/api/handoffs/confirm", { method: "POST", token: seller.token, body: { token: body.qrPayload } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(await listingStatus(soldListing), "sold");
  const { data } = await admin.from("orders").select("status").eq("id", order.id).single();
  assert.equal(data.status, "completed");

  const replay = await api("/api/handoffs/confirm", { method: "POST", token: seller.token, body: { token: body.qrPayload } });
  assert.equal(replay.status, 409);
  assert.equal(replay.body.error.code, "handoff_already_used");

  const after = await api(`/api/orders/${order.id}/handoff-token`, { method: "POST", token: buyer.token });
  assert.equal(after.status, 409);
});

test("made-up QR values are rejected", async () => {
  const res = await api("/api/handoffs/confirm", { method: "POST", token: seller.token, body: { token: "bidd:handoff:" + "A".repeat(43) } });
  assert.equal(res.status, 400);
});

test("cancelling puts the listing back on the feed", async () => {
  const listingId = await publishedListing(seller, { title: "Bid day tee", tags: ["bid_day"] });
  const res = await checkout(buyer2, listingId);
  assert.equal(res.status, 201);
  assert.equal((await api(`/api/orders/${res.body.order.id}/cancel`, { method: "POST", token: rival.token })).status, 404);
  assert.equal((await api(`/api/orders/${res.body.order.id}/cancel`, { method: "POST", token: buyer2.token })).status, 200);
  assert.equal(await listingStatus(listingId), "active");
  assert.equal((await api(`/api/orders/${res.body.order.id}/cancel`, { method: "POST", token: buyer2.token })).status, 409);
});

test("orders are visible only to their buyer and seller", async () => {
  const mine = await api("/api/orders", { token: buyer.token });
  assert.ok(mine.body.orders.some((o) => o.id === order.id && o.role === "buyer"));
  const sellers = await api("/api/orders", { token: seller.token });
  assert.ok(sellers.body.orders.some((o) => o.id === order.id && o.role === "seller"));
  const others = await api("/api/orders", { token: rival.token });
  assert.ok(!others.body.orders.some((o) => o.id === order.id));
  assert.deepEqual((await asUser(buyer2.token).from("orders").select("id").eq("id", order.id)).data ?? [], []);
});

test("RLS: nobody can write orders, read handoff tokens or call the order functions directly", async () => {
  const db = asUser(buyer.token);
  assert.ok((await db.from("orders").update({ status: "cancelled" }).eq("id", order.id)).error);
  assert.ok((await db.from("orders").insert({ listing_id: soldListing, buyer_id: buyer.userId })).error);
  assert.ok((await db.schema("private").from("handoff_tokens").select("*")).error);
  assert.ok((await db.rpc("create_order", { p_listing_id: soldListing, p_buyer_id: buyer.userId })).error);
  assert.ok((await db.rpc("confirm_handoff", { p_token_hash: "x", p_seller_id: seller.userId })).error);
  assert.ok((await db.rpc("cancel_order", { p_order_id: order.id, p_user_id: buyer.userId })).error);
});
