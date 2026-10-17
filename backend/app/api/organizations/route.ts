import type { OrganizationsResponse } from "@/lib/contracts/auth";
import { handle, json } from "@/lib/http";
import { requireUser } from "@/lib/security/auth";
import { userClient } from "@/lib/supabase/server";

type OrgRow = { id: string; name: string; national_org: string | null; kind: string };

// Chapters on the caller's campus (for the onboarding picker). RLS also limits this to their campus.
export const GET = handle(async (req) => {
  const ctx = await requireUser(req);

  const { data, error } = await userClient(ctx.accessToken)
    .from("organizations")
    .select("id, name, national_org, kind")
    .eq("campus_id", ctx.campus.id)
    .order("name");
  if (error) throw error;

  return json<OrganizationsResponse>({
    organizations: ((data ?? []) as OrgRow[]).map((o) => ({
      id: o.id,
      name: o.name,
      nationalOrg: o.national_org,
      kind: o.kind,
    })),
  });
});
