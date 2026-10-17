import { loadAccount, provisionAccount } from "@/lib/account";
import { audit } from "@/lib/audit";
import { VerifyCodeBody, type VerifyCodeResponse } from "@/lib/contracts/auth";
import { normalizeEmail } from "@/lib/email";
import { ApiError, handle, json, readJson } from "@/lib/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { toSession } from "@/lib/session";
import { adminClient } from "@/lib/supabase/admin";
import { publicClient } from "@/lib/supabase/server";

export const POST = handle(async (req) => {
  const body = await readJson(req, VerifyCodeBody);
  const email = normalizeEmail(body.email);
  if (!email) throw new ApiError(400, "invalid_email", "Enter a valid school email address.");

  await enforceRateLimit([
    // Per-IP is loose (campus Wi-Fi puts many students behind one IP); per-email is the tight limit.
    { bucket: `verify-code:ip:${clientIp(req)}`, max: 200, windowSeconds: 600 },
    { bucket: `verify-code:email:${email}`, max: 10, windowSeconds: 600 },
  ]);

  const { data, error } = await publicClient().auth.verifyOtp({ email, token: body.code, type: "email" });
  if (error || !data.session || !data.user) {
    if (error && (error.status ?? 0) >= 500) console.error("[verify-code] supabase error", error.code, error.status);
    throw new ApiError(400, "invalid_code", "That code is wrong or expired. Request a new one.");
  }

  // Campus comes from the verified address, server-side.
  let created: boolean;
  try {
    ({ created } = await provisionAccount(data.user.id));
  } catch (err) {
    await adminClient().auth.admin.signOut(data.session.access_token, "global");
    throw err;
  }

  const account = await loadAccount(data.user.id);
  await audit(data.user.id, "auth.code_verified", null, { newAccount: created });

  return json<VerifyCodeResponse>({
    session: toSession(data.session),
    needsOnboarding: !account?.profile.onboardedAt,
  });
});
