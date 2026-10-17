import { ReportBody, type ReportResponse } from "@/lib/contracts/community";
import { ApiError, handle, json, readJson } from "@/lib/http";
import { requireUuid } from "@/lib/listings";
import { requireUser } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

// One report per student per listing. Three different students' reports hide the listing.
export const POST = handle<Ctx>(async (req, { params }) => {
  const ctx = await requireUser(req);
  const id = requireUuid((await params).id);
  const body = await readJson(req, ReportBody);
  await enforceRateLimit([{ bucket: `report:${ctx.userId}`, max: 20, windowSeconds: 3600 }]);

  const { data, error } = await adminClient().rpc("report_listing", {
    p_listing_id: id,
    p_reporter_id: ctx.userId,
    p_reason: body.reason,
    p_details: body.details ?? null,
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("listing_not_found")) throw new ApiError(404, "listing_not_found", "That listing doesn't exist.");
    if (msg.includes("cannot_report_own_listing")) throw new ApiError(409, "cannot_report_own_listing", "You can't report your own listing.");
    throw error;
  }
  return json<ReportResponse>({ ok: true, hidden: Boolean((data as { hidden: boolean }).hidden) });
});
