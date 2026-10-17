// Shared contract between backend/ and frontend/. No server-only imports here:
// Quinn can copy or import these schemas and types as-is.
import { z } from "zod";

export const RequestCodeBody = z.object({
  email: z.string().trim().min(3).max(254),
  /** Cloudflare Turnstile token, required once CAPTCHA is turned on in Supabase. */
  captchaToken: z.string().min(1).max(4096).optional(),
});
export type RequestCodeBody = z.infer<typeof RequestCodeBody>;

export const VerifyCodeBody = z.object({
  email: z.string().trim().min(3).max(254),
  code: z
    .string()
    .trim()
    .regex(/^\d{6,10}$/, "Enter the code from your email."),
});
export type VerifyCodeBody = z.infer<typeof VerifyCodeBody>;

export const RefreshBody = z.object({
  refreshToken: z.string().min(10).max(4096),
});
export type RefreshBody = z.infer<typeof RefreshBody>;

export const OnboardingBody = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name needs at least 2 characters.")
    .max(40, "Display name can be at most 40 characters.")
    .regex(/^[\p{L}\p{M}\p{N} .'-]+$/u, "Use letters, numbers, spaces, periods, apostrophes or hyphens."),
  /** Chapter to request. Joining is pending until an officer approves it. */
  organizationId: z.uuid().optional(),
});
export type OnboardingBody = z.infer<typeof OnboardingBody>;

export type Session = {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. Refresh shortly before this. */
  expiresAt: number;
  tokenType: "bearer";
};

export type RequestCodeResponse = {
  sent: true;
  message: string;
  campus: { name: string; shortName: string };
};

export type VerifyCodeResponse = { session: Session; needsOnboarding: boolean };

export type RefreshResponse = { session: Session };

export type CampusTheme = { name?: string; primary?: string; secondary?: string; accent?: string };

export type Badge = { id: "school_email_verified"; label: "School email verified" };

export type MembershipStatus = "pending" | "active" | "rejected";

export type MeResponse = {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    role: "student" | "admin";
    onboarded: boolean;
  };
  campus: {
    id: string;
    slug: string;
    name: string;
    shortName: string;
    conference: string;
    theme: CampusTheme;
  };
  memberships: Array<{
    id: string;
    status: MembershipStatus;
    role: "member" | "officer";
    requestedAt: string;
    organization: { id: string; name: string; kind: string } | null;
  }>;
  badges: Badge[];
};

export type OrganizationsResponse = {
  organizations: Array<{ id: string; name: string; nationalOrg: string | null; kind: string }>;
};

export type OnboardingResponse = {
  ok: true;
  chapterRequest: { organizationId: string; status: MembershipStatus } | null;
};

export type ApiErrorBody = { error: { code: string; message: string } };
