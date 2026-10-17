// Security acceptance tests for sign-up, verification, campus lock and RLS.
// Needs: the dev server running (npm run dev) and migration 001 + seed applied.
// Creates throwaway users via the admin API (no emails are sent) and deletes them afterwards.
//
//   npm run test:security            (against http://localhost:3000)
//   TEST_BASE_URL=... npm run test:security

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(fileURLToPath(new URL("../../.env.local", import.meta.url)));

const BASE = (process.env.TEST_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const noSession = { persistSession: false, autoRefreshToken: false };
const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: noSession });

const createdUserIds = [];
const tag = () => randomBytes(4).toString("hex");

async function api(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

function asUser(token) {
  return createClient(SUPABASE_URL, PUBLISHABLE, { auth: noSession, global: { headers: { Authorization: `Bearer ${token}` } } });
}

/** Creates a confirmed user, gets an OTP without sending mail, and signs in through our API. */
async function signIn(domain) {
  const email = `bidd-sectest-${tag()}@${domain}`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (createError) throw createError;
  createdUserIds.push(created.user.id);

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw linkError;

  const res = await api("/api/auth/verify-code", { method: "POST", body: { email, code: link.properties.email_otp } });
  assert.equal(res.status, 200, `verify-code failed: ${JSON.stringify(res.body)}`);
  return { email, userId: created.user.id, token: res.body.session.accessToken };
}

const ids = {};
let ua;
let om;

before(async () => {
  const health = await api("/api/health");
  assert.equal(health.status, 200, `backend not ready: ${JSON.stringify(health.body)}`);

  const { data: campuses, error } = await admin.from("campuses").select("id, slug");
  if (error) throw error;
  ids.ua = campuses.find((c) => c.slug === "ua")?.id;
  ids.olemiss = campuses.find((c) => c.slug === "olemiss")?.id;
  assert.ok(ids.ua && ids.olemiss, "seed missing: run supabase/seed.sql");

  const { data: orgs } = await admin.from("organizations").select("id, campus_id");
  ids.uaOrg = orgs.find((o) => o.campus_id === ids.ua)?.id;
  ids.omOrg = orgs.find((o) => o.campus_id === ids.olemiss)?.id;
  assert.ok(ids.uaOrg && ids.omOrg, "seed missing chapters");

  ua = await signIn("crimson.ua.edu");
  om = await signIn("go.olemiss.edu");
});

after(async () => {
  for (const id of createdUserIds) await admin.auth.admin.deleteUser(id);
});

// --- Domain allowlist -------------------------------------------------------

for (const email of ["student@gmail.com", "jdoe@crimson.ua.edu.attacker.example", "jdoe@evil.crimson.ua.edu", "jdoe@auburn.edu"]) {
  test(`request-code rejects unsupported domain: ${email}`, async () => {
    const res = await api("/api/auth/request-code", { method: "POST", body: { email } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "school_not_supported");
  });
}

test("request-code rejects malformed addresses", async () => {
  const res = await api("/api/auth/request-code", { method: "POST", body: { email: "a@b@crimson.ua.edu" } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "invalid_email");
});

test("a look-alike account gets no campus and no data, even if it exists in Supabase", async (t) => {
  // The Before-User-Created hook guards public sign-ups; the admin API may skip it. Either way the
  // database must refuse to give a look-alike address a campus.
  const email = `bidd-sectest-${tag()}@crimson.ua.edu.attacker.example`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) {
    t.diagnostic(`Supabase refused to create the user (${error.message}): hook active on the admin path too`);
    return;
  }
  createdUserIds.push(data.user.id);
  t.diagnostic("admin API created the user (hook not applied there); checking the database wall");

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw linkError;

  // Through our API: refused.
  const viaApi = await api("/api/auth/verify-code", { method: "POST", body: { email, code: link.properties.email_otp } });
  assert.equal(viaApi.status, 403, JSON.stringify(viaApi.body));
  assert.equal(viaApi.body.error.code, "school_not_supported");

  // Straight to Supabase with a fresh code: gets a session, but the API and RLS give it nothing.
  const { data: link2 } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const direct = await createClient(SUPABASE_URL, PUBLISHABLE, { auth: noSession }).auth.verifyOtp({
    email,
    token: link2.properties.email_otp,
    type: "email",
  });
  if (direct.error) {
    t.diagnostic(`direct verify refused: ${direct.error.message}`);
    return;
  }
  const token = direct.data.session.access_token;
  const me = await api("/api/me", { token });
  assert.equal(me.status, 403);
  assert.equal(me.body.error.code, "school_not_supported");

  const db = asUser(token);
  assert.deepEqual((await db.from("organizations").select("id")).data ?? [], []);
  assert.deepEqual((await db.from("profiles").select("id")).data ?? [], []);
  const { data: profile } = await admin.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  assert.equal(profile, null, "a profile was provisioned for a look-alike address");
});

// --- Verification + sessions -------------------------------------------------

test("verify-code rejects a wrong code", async () => {
  const res = await api("/api/auth/verify-code", { method: "POST", body: { email: ua.email, code: "000000" } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "invalid_code");
});

test("/api/me requires a valid token", async () => {
  assert.equal((await api("/api/me")).status, 401);
  assert.equal((await api("/api/me", { token: "not.a.jwt" })).status, 401);
  const tampered = ua.token.slice(0, -4) + (ua.token.endsWith("AAAA") ? "BBBB" : "AAAA");
  assert.equal((await api("/api/me", { token: tampered })).status, 401);
});

test("campus comes from the verified email domain", async () => {
  const uaMe = await api("/api/me", { token: ua.token });
  assert.equal(uaMe.status, 200);
  assert.equal(uaMe.body.campus.slug, "ua");
  assert.equal(uaMe.body.user.role, "student");
  assert.deepEqual(uaMe.body.badges, [{ id: "school_email_verified", label: "School email verified" }]);

  const omMe = await api("/api/me", { token: om.token });
  assert.equal(omMe.body.campus.slug, "olemiss");
});

// --- Forged input --------------------------------------------------------------

test("onboarding ignores a forged campus and rejects another campus's chapter", async () => {
  const res = await api("/api/onboarding", {
    method: "POST",
    token: ua.token,
    body: { displayName: "Sec Test", campus_id: ids.olemiss, campusId: ids.olemiss, role: "admin", organizationId: ids.omOrg },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "organization_not_found");

  const me = await api("/api/me", { token: ua.token });
  assert.equal(me.body.campus.slug, "ua");
  assert.equal(me.body.user.role, "student");
});

test("onboarding with an own-campus chapter creates a pending request only", async () => {
  const res = await api("/api/onboarding", {
    method: "POST",
    token: ua.token,
    body: { displayName: "Sec Test", organizationId: ids.uaOrg, status: "active", role: "officer" },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.chapterRequest.status, "pending");

  const me = await api("/api/me", { token: ua.token });
  assert.equal(me.body.user.onboarded, true);
  assert.equal(me.body.memberships.length, 1);
  assert.equal(me.body.memberships[0].status, "pending");
  assert.equal(me.body.memberships[0].role, "member");
});

// --- RLS: direct Supabase calls with a real user token ---------------------------

test("RLS: a UA student can't read Ole Miss data by ID", async () => {
  const db = asUser(ua.token);
  const orgs = await db.from("organizations").select("id").eq("id", ids.omOrg);
  assert.deepEqual(orgs.data ?? [], []);
  const allOrgs = await db.from("organizations").select("campus_id");
  assert.ok((allOrgs.data ?? []).every((o) => o.campus_id === ids.ua));
  const profiles = await db.from("profiles").select("id").eq("id", om.userId);
  assert.deepEqual(profiles.data ?? [], []);
  const memberships = await db.from("campus_memberships").select("user_id").eq("user_id", om.userId);
  assert.deepEqual(memberships.data ?? [], []);
});

test("RLS: domain allowlist, audit log and other tables are not readable", async () => {
  const db = asUser(ua.token);
  for (const table of ["campus_email_domains", "audit_events"]) {
    const { data, error } = await db.from(table).select("*").limit(1);
    assert.ok(error || (data ?? []).length === 0, `${table} was readable`);
  }
});

test("RLS: students can't edit their own role, campus, points or chapter status", async () => {
  const db = asUser(ua.token);

  const roleEdit = await db.from("profiles").update({ role: "admin" }).eq("id", ua.userId);
  assert.ok(roleEdit.error, "profiles update was allowed");
  const { data: profile } = await admin.from("profiles").select("role").eq("id", ua.userId).single();
  assert.equal(profile.role, "student");

  const campusMove = await db.from("campus_memberships").update({ campus_id: ids.olemiss }).eq("user_id", ua.userId);
  assert.ok(campusMove.error, "campus_memberships update was allowed");

  const selfApprove = await db.from("organization_memberships").update({ status: "active", role: "officer" }).eq("user_id", ua.userId);
  assert.ok(selfApprove.error, "organization_memberships update was allowed");

  const newOrg = await db.from("organizations").insert({ campus_id: ids.ua, slug: `x-${tag()}`, name: "Fake", kind: "other" });
  assert.ok(newOrg.error, "organizations insert was allowed");
});

test("RLS: privileged functions can't be called by students or anonymous users", async () => {
  const db = asUser(ua.token);
  assert.ok((await db.rpc("provision_user", { p_user_id: om.userId })).error);
  assert.ok((await db.rpc("rate_limit_hit", { p_bucket: "x", p_max: 1000, p_window_seconds: 60 })).error);
  assert.ok((await db.rpc("hook_before_user_created", { event: { user: { email: "a@crimson.ua.edu" } } })).error);
});

test("RLS: anonymous clients read nothing", async () => {
  const anon = createClient(SUPABASE_URL, PUBLISHABLE, { auth: noSession });
  for (const table of ["campuses", "organizations", "profiles", "campus_memberships", "organization_memberships"]) {
    const { data, error } = await anon.from(table).select("*").limit(1);
    assert.ok(error || (data ?? []).length === 0, `${table} readable anonymously`);
  }
});

// --- CORS --------------------------------------------------------------------------

test("API rejects writes from origins that aren't allowlisted", async () => {
  const res = await fetch(`${BASE}/api/auth/request-code`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({ email: "jdoe@crimson.ua.edu" }),
  });
  assert.equal(res.status, 403);
});
