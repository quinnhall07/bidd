import type { CupResponse } from "@/lib/contracts/community";
import { handle, json } from "@/lib/http";
import { requireUser } from "@/lib/security/auth";
import { adminClient } from "@/lib/supabase/admin";

type ChapterRow = { organization_id: string; name: string; kind: string; points: number; sales: number };
type CampusRow = { campus_id: string; slug: string; name: string; short_name: string; points: number; sales: number };

// Aggregates only: chapter totals on your campus and campus totals across the conference.
// No buyers, sellers or individual sales are exposed.
export const GET = handle(async (req) => {
  const ctx = await requireUser(req);
  const admin = adminClient();
  const [chapters, campuses] = await Promise.all([
    admin.rpc("cup_campus_standings", { p_campus_id: ctx.campus.id }),
    admin.rpc("cup_conference_standings"),
  ]);
  if (chapters.error) throw chapters.error;
  if (campuses.error) throw campuses.error;

  return json<CupResponse>({
    campus: {
      id: ctx.campus.id,
      name: ctx.campus.name,
      standings: ((chapters.data ?? []) as ChapterRow[]).map((c, i) => ({
        rank: i + 1,
        organizationId: c.organization_id,
        name: c.name,
        kind: c.kind,
        points: Number(c.points),
        sales: Number(c.sales),
      })),
    },
    conference: ((campuses.data ?? []) as CampusRow[]).map((c, i) => ({
      rank: i + 1,
      campusId: c.campus_id,
      name: c.name,
      shortName: c.short_name,
      points: Number(c.points),
      sales: Number(c.sales),
      isYourCampus: c.campus_id === ctx.campus.id,
    })),
  });
});
