import type { AuthError } from "@supabase/supabase-js";
import { findCampusByDomain } from "@/lib/account";
import { RequestCodeBody, type RequestCodeResponse } from "@/lib/contracts/auth";
import { emailDomain, normalizeEmail } from "@/lib/email";
import { ApiError, handle, json, readJson } from "@/lib/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { publicClient } from "@/lib/supabase/server";

function mapSendError(err: AuthError): ApiError {
  switch (err.code) {
    case "captcha_failed":
      return new ApiError(400, "captcha_failed", "Complete the bot check and try again.");
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return new ApiError(429, "rate_limited", "Wait a minute before asking for another code.");
    case "email_address_not_authorized":
      return new ApiError(503, "email_delivery_unavailable", "Code emails can't reach this address yet (custom SMTP isn't set up).");
    default:
      return new ApiError(502, "code_send_failed", "We couldn't send a code right now. Try again in a minute.");
  }
}

// The response never says whether an account already exists for the address.
export const POST = handle(async (req) => {
  const body = await readJson(req, RequestCodeBody);
  const email = normalizeEmail(body.email);
  if (!email) throw new ApiError(400, "invalid_email", "Enter a valid school email address.");

  const ip = clientIp(req);
  // Per-IP is loose (campus Wi-Fi puts many students behind one IP); per-email is the tight limit.
  await enforceRateLimit([{ bucket: `request-code:ip:${ip}`, max: 100, windowSeconds: 600 }]);

  const campus = await findCampusByDomain(emailDomain(email));
  if (!campus) {
    throw new ApiError(400, "school_not_supported", "Bidd isn't at your school yet. Use your school email address.");
  }

  await enforceRateLimit([{ bucket: `request-code:email:${email}`, max: 5, windowSeconds: 600 }]);

  const { error } = await publicClient().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, captchaToken: body.captchaToken },
  });
  if (error) {
    console.error("[request-code] supabase rejected send", error.code, error.status, error.message);
    throw mapSendError(error);
  }

  return json<RequestCodeResponse>({
    sent: true,
    message: "Check your school inbox for a code. It expires in 10 minutes.",
    campus: { name: campus.name, shortName: campus.shortName },
  });
});
