import { RefreshBody, type RefreshResponse } from "@/lib/contracts/auth";
import { ApiError, handle, json, readJson } from "@/lib/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { toSession } from "@/lib/session";
import { publicClient } from "@/lib/supabase/server";

export const POST = handle(async (req) => {
  const body = await readJson(req, RefreshBody);
  await enforceRateLimit([{ bucket: `refresh:ip:${clientIp(req)}`, max: 60, windowSeconds: 600 }]);

  const { data, error } = await publicClient().auth.refreshSession({ refresh_token: body.refreshToken });
  if (error || !data.session) {
    throw new ApiError(401, "invalid_refresh_token", "Your session expired. Sign in again.");
  }
  return json<RefreshResponse>({ session: toSession(data.session) });
});
