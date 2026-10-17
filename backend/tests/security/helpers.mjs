// Shared helpers for the security suites. Loads backend/.env.local; never prints secrets.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(fileURLToPath(new URL("../../.env.local", import.meta.url)));

export const BASE = (process.env.TEST_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const noSession = { persistSession: false, autoRefreshToken: false };
export const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: noSession });
export const tag = () => randomBytes(4).toString("hex");

const createdUserIds = [];

export async function api(path, { method = "GET", body, token, form } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

export function asUser(token) {
  return createClient(SUPABASE_URL, PUBLISHABLE, { auth: noSession, global: { headers: { Authorization: `Bearer ${token}` } } });
}

/** Creates a confirmed user, gets an OTP without sending mail, signs in through our API, onboards. */
export async function signIn(domain, displayName = "Sec Test") {
  const email = `bidd-sectest-${tag()}@${domain}`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (createError) throw createError;
  createdUserIds.push(created.user.id);

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw linkError;

  const res = await api("/api/auth/verify-code", { method: "POST", body: { email, code: link.properties.email_otp } });
  assert.equal(res.status, 200, `verify-code failed: ${JSON.stringify(res.body)}`);
  const token = res.body.session.accessToken;
  await api("/api/onboarding", { method: "POST", token, body: { displayName } });
  return { email, userId: created.user.id, token };
}

/** Deletes every user this run created (their listings, closets and photo rows cascade). */
export async function cleanupUsers() {
  for (const id of createdUserIds.splice(0)) await admin.auth.admin.deleteUser(id);
}
