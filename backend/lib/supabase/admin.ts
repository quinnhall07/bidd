import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let admin: SupabaseClient | undefined;

/**
 * Secret-key client. It bypasses RLS, so use it only for privileged server steps
 * (provisioning, rate limits, audit, validated writes) and never with unchecked client input.
 */
export function adminClient(): SupabaseClient {
  admin ??= createClient(env().supabaseUrl, env().secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return admin;
}
