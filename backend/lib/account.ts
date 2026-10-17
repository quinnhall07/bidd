import "server-only";
import type { CampusTheme } from "@/lib/contracts/auth";
import { ApiError } from "@/lib/http";
import { adminClient } from "@/lib/supabase/admin";

export type Campus = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  conference: string;
  theme: CampusTheme;
};

export type Profile = {
  id: string;
  email: string;
  displayName: string | null;
  status: "active" | "suspended";
  role: "student" | "admin";
  onboardedAt: string | null;
};

export type Account = {
  profile: Profile;
  campus: Campus;
  campusActive: boolean;
  verifiedDomain: string;
};

type CampusRow = {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  conference: string;
  theme: CampusTheme | null;
  is_active: boolean;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  status: Profile["status"];
  role: Profile["role"];
  onboarded_at: string | null;
  membership: MembershipRow | MembershipRow[] | null;
};

type MembershipRow = { verified_domain: string; campus: CampusRow | CampusRow[] | null };

const CAMPUS_COLUMNS = "id, slug, name, short_name, conference, theme, is_active";

// PostgREST returns embedded to-one relations as an object, but be tolerant of arrays.
function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function toCampus(row: CampusRow): Campus {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.short_name,
    conference: row.conference,
    theme: row.theme ?? {},
  };
}

/** Campus for an exact, allowlisted email domain, or null. Inactive campuses count as unsupported. */
export async function findCampusByDomain(domain: string): Promise<Campus | null> {
  const { data, error } = await adminClient()
    .from("campus_email_domains")
    .select(`campus:campuses!inner(${CAMPUS_COLUMNS})`)
    .eq("domain", domain)
    .maybeSingle();
  if (error) throw error;
  const campus = one((data as { campus: CampusRow | CampusRow[] } | null)?.campus);
  return campus && campus.is_active ? toCampus(campus) : null;
}

export async function loadAccount(userId: string): Promise<Account | null> {
  const { data, error } = await adminClient()
    .from("profiles")
    .select(
      `id, email, display_name, status, role, onboarded_at,
       membership:campus_memberships(verified_domain, campus:campuses(${CAMPUS_COLUMNS}))`,
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  const row = data as ProfileRow | null;
  const membership = one(row?.membership);
  const campus = one(membership?.campus);
  if (!row || !membership || !campus) return null;

  return {
    profile: {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      status: row.status,
      role: row.role,
      onboardedAt: row.onboarded_at,
    },
    campus: toCampus(campus),
    campusActive: campus.is_active,
    verifiedDomain: membership.verified_domain,
  };
}

/**
 * Creates the profile + campus membership from the user's *verified* email (privileged DB function).
 * Idempotent. The campus is never taken from the request.
 */
export async function provisionAccount(userId: string): Promise<{ campusId: string; created: boolean }> {
  const { data, error } = await adminClient().rpc("provision_user", { p_user_id: userId });
  if (error) {
    const reason = error.message ?? "";
    if (reason.includes("domain_not_allowed")) {
      throw new ApiError(403, "school_not_supported", "Bidd isn't at your school yet.");
    }
    if (reason.includes("email_not_verified")) {
      throw new ApiError(403, "email_not_verified", "Verify your school email first.");
    }
    if (reason.includes("campus_mismatch")) {
      throw new ApiError(403, "campus_mismatch", "Your email doesn't match your campus. Contact support.");
    }
    throw error;
  }
  const result = data as { campus_id: string; created: boolean };
  return { campusId: result.campus_id, created: result.created };
}
