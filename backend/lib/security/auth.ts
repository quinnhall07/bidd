import "server-only";
import type { NextRequest } from "next/server";
import { loadAccount, provisionAccount, type Account } from "@/lib/account";
import { emailDomain } from "@/lib/email";
import { ApiError } from "@/lib/http";
import { publicClient } from "@/lib/supabase/server";

export type AuthContext = Account & { userId: string; email: string; accessToken: string };

const BEARER = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

export function bearerToken(req: NextRequest): string | null {
  return BEARER.exec(req.headers.get("authorization") ?? "")?.[1] ?? null;
}

/**
 * Validates the Bearer token with Supabase Auth on every request, then re-checks the account
 * in the database: active, campus active, verified email still on the campus's domain.
 */
export async function requireUser(req: NextRequest): Promise<AuthContext> {
  const token = bearerToken(req);
  if (!token) throw new ApiError(401, "unauthenticated", "Sign in first.");

  const { data, error } = await publicClient().auth.getUser(token);
  const user = data?.user;
  if (error || !user) throw new ApiError(401, "invalid_token", "Your session expired. Sign in again.");
  if (!user.email || !user.email_confirmed_at) {
    throw new ApiError(403, "email_not_verified", "Verify your school email first.");
  }

  let account = await loadAccount(user.id);
  if (!account) {
    // e.g. the user verified by calling Supabase directly instead of our API.
    await provisionAccount(user.id);
    account = await loadAccount(user.id);
  }
  if (!account) throw new Error("account missing after provisioning");

  if (account.profile.status !== "active") {
    throw new ApiError(403, "account_suspended", "This account is suspended.");
  }
  if (!account.campusActive) {
    throw new ApiError(403, "campus_inactive", "Bidd is paused at your school right now.");
  }
  const email = user.email.toLowerCase();
  if (emailDomain(email) !== account.verifiedDomain) {
    throw new ApiError(403, "campus_mismatch", "Your email doesn't match your campus. Sign in again.");
  }

  return { ...account, userId: user.id, email, accessToken: token };
}
