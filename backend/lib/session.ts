import type { Session as SupabaseSession } from "@supabase/supabase-js";
import type { Session } from "@/lib/contracts/auth";

export function toSession(s: SupabaseSession): Session {
  return {
    accessToken: s.access_token,
    refreshToken: s.refresh_token,
    expiresAt: s.expires_at ?? Math.floor(Date.now() / 1000) + s.expires_in,
    tokenType: "bearer",
  };
}
