import type { MeResponse, MembershipStatus } from "@/lib/contracts/auth";
import { handle, json } from "@/lib/http";
import { requireUser } from "@/lib/security/auth";
import { userClient } from "@/lib/supabase/server";

type MembershipRow = {
  id: string;
  status: MembershipStatus;
  role: "member" | "officer";
  requested_at: string;
  organization: { id: string; name: string; kind: string } | { id: string; name: string; kind: string }[] | null;
};

export const GET = handle(async (req) => {
  const ctx = await requireUser(req);

  // Read through RLS as the user: only their own memberships come back.
  const { data, error } = await userClient(ctx.accessToken)
    .from("organization_memberships")
    .select("id, status, role, requested_at, organization:organizations(id, name, kind)")
    .order("requested_at", { ascending: false });
  if (error) throw error;

  const memberships = ((data ?? []) as MembershipRow[]).map((m) => ({
    id: m.id,
    status: m.status,
    role: m.role,
    requestedAt: m.requested_at,
    organization: Array.isArray(m.organization) ? (m.organization[0] ?? null) : m.organization,
  }));

  return json<MeResponse>({
    user: {
      id: ctx.userId,
      email: ctx.email,
      displayName: ctx.profile.displayName,
      role: ctx.profile.role,
      onboarded: ctx.profile.onboardedAt !== null,
    },
    campus: ctx.campus,
    memberships,
    badges: [{ id: "school_email_verified", label: "School email verified" }],
  });
});
