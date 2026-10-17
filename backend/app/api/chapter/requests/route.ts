import type { ChapterRequestsResponse } from "@/lib/contracts/community";
import { handle, json } from "@/lib/http";
import { requireUser } from "@/lib/security/auth";
import { adminClient } from "@/lib/supabase/admin";

type RequestRow = {
  id: string;
  requested_at: string;
  user_id: string;
  organization: { id: string; name: string } | { id: string; name: string }[] | null;
  profile: { display_name: string | null } | { display_name: string | null }[] | null;
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

// Pending join requests for the chapters where the caller is an approved officer. Empty for everyone else.
export const GET = handle(async (req) => {
  const ctx = await requireUser(req);
  const admin = adminClient();

  const { data: offices, error: officeError } = await admin
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .eq("role", "officer");
  if (officeError) throw officeError;
  const orgIds = ((offices ?? []) as { organization_id: string }[]).map((o) => o.organization_id);
  if (orgIds.length === 0) return json<ChapterRequestsResponse>({ requests: [] });

  const { data, error } = await admin
    .from("organization_memberships")
    .select("id, requested_at, user_id, organization:organizations(id, name), profile:profiles!organization_memberships_user_id_fkey(display_name)")
    .in("organization_id", orgIds)
    .eq("status", "pending")
    .order("requested_at");
  if (error) throw error;

  return json<ChapterRequestsResponse>({
    requests: ((data ?? []) as RequestRow[]).map((r) => {
      const org = one(r.organization);
      return {
        id: r.id,
        organization: { id: org?.id ?? "", name: org?.name ?? "" },
        user: { id: r.user_id, displayName: one(r.profile)?.display_name ?? null },
        requestedAt: r.requested_at,
      };
    }),
  });
});
