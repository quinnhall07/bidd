import { audit } from "@/lib/audit";
import { OnboardingBody, type MembershipStatus, type OnboardingResponse } from "@/lib/contracts/auth";
import { ApiError, handle, json, readJson } from "@/lib/http";
import { requireUser } from "@/lib/security/auth";
import { adminClient } from "@/lib/supabase/admin";

// Sets the display name and (optionally) requests a chapter. Any campus_id/role/status in the
// body is stripped by the schema; the campus always comes from the verified account.
export const POST = handle(async (req) => {
  const ctx = await requireUser(req);
  const body = await readJson(req, OnboardingBody);
  const admin = adminClient();

  let chapterRequest: OnboardingResponse["chapterRequest"] = null;
  let insertRequest = false;

  if (body.organizationId) {
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .select("id")
      .eq("id", body.organizationId)
      .eq("campus_id", ctx.campus.id)
      .eq("is_active", true)
      .maybeSingle();
    if (orgError) throw orgError;
    // Same answer whether the chapter is on another campus or doesn't exist.
    if (!org) throw new ApiError(400, "organization_not_found", "Pick a chapter from your campus.");

    const { data: existing, error: existingError } = await admin
      .from("organization_memberships")
      .select("organization_id, status")
      .eq("user_id", ctx.userId)
      .neq("status", "rejected");
    if (existingError) throw existingError;

    const rows = (existing ?? []) as { organization_id: string; status: MembershipStatus }[];
    if (rows.some((m) => m.organization_id !== body.organizationId)) {
      throw new ApiError(409, "chapter_already_requested", "You've already requested a chapter.");
    }
    const same = rows.find((m) => m.organization_id === body.organizationId);
    insertRequest = !same;
    chapterRequest = { organizationId: body.organizationId, status: same?.status ?? "pending" };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      display_name: body.displayName,
      onboarded_at: ctx.profile.onboardedAt ?? new Date().toISOString(),
    })
    .eq("id", ctx.userId);
  if (profileError) throw profileError;

  if (insertRequest && chapterRequest) {
    const { error: requestError } = await admin
      .from("organization_memberships")
      .insert({ organization_id: chapterRequest.organizationId, user_id: ctx.userId, status: "pending", role: "member" });
    if (requestError) throw requestError;
    await audit(ctx.userId, "chapter.requested", chapterRequest.organizationId);
  }

  await audit(ctx.userId, "account.onboarded");
  return json<OnboardingResponse>({ ok: true, chapterRequest });
});
