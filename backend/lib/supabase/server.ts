import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } as const;

/** Publishable-key client with no stored session: used for the OTP send/verify/refresh calls. */
export function publicClient(): SupabaseClient {
  return createClient(env().supabaseUrl, env().publishableKey, { auth: noSession });
}

/** Acts as the signed-in user, so every query is filtered by RLS. Prefer this for reads. */
export function userClient(accessToken: string): SupabaseClient {
  return createClient(env().supabaseUrl, env().publishableKey, {
    auth: noSession,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
