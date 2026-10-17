import { ApiError, handle, json } from "@/lib/http";
import { bearerToken } from "@/lib/security/auth";
import { adminClient } from "@/lib/supabase/admin";

// Revokes this session's refresh token. The access token stays valid until it expires (max 1h).
export const POST = handle(async (req) => {
  const token = bearerToken(req);
  if (!token) throw new ApiError(401, "unauthenticated", "Sign in first.");

  const { error } = await adminClient().auth.admin.signOut(token, "local");
  if (error && ![401, 403, 404].includes(error.status ?? 0)) {
    console.error("[logout] sign-out failed", error.code, error.status);
  }
  return json({ ok: true });
});
