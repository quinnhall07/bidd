import "server-only";
import { ApiError } from "@/lib/http";
import { adminClient } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/security/request";

export type RateRule = { bucket: string; max: number; windowSeconds: number };

/**
 * Counts one hit against each rule (fixed windows kept in Postgres) and throws 429 when any is over.
 * Bucket names are hashed so emails and IPs aren't stored. Fails closed if the counter is unavailable.
 */
export async function enforceRateLimit(rules: RateRule[]): Promise<void> {
  for (const rule of rules) {
    const { data, error } = await adminClient().rpc("rate_limit_hit", {
      p_bucket: sha256(rule.bucket),
      p_max: rule.max,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] counter unavailable", error.code, error.message);
      throw new ApiError(503, "rate_limit_unavailable", "Sign-in is temporarily unavailable. Try again shortly.");
    }
    if (data !== true) {
      throw new ApiError(429, "rate_limited", "Too many attempts. Wait a few minutes and try again.");
    }
  }
}
