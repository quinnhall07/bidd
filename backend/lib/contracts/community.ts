// Shared contract for the Closet Cup, chapter approvals, reports and blocks.
import { z } from "zod";

export const REPORT_REASONS = ["prohibited_item", "scam_or_fraud", "offensive", "wrong_item", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const ReportBody = z.object({
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional(),
});
export type ReportBody = z.infer<typeof ReportBody>;

export const BlockBody = z.object({ userId: z.uuid() });
export type BlockBody = z.infer<typeof BlockBody>;

export const DecideRequestBody = z.object({ approve: z.boolean() });
export type DecideRequestBody = z.infer<typeof DecideRequestBody>;

/** Points per completed handoff, credited to the seller's approved chapter. */
export const CUP_POINTS_PER_SALE = 10;

export type CupResponse = {
  campus: {
    id: string;
    name: string;
    standings: Array<{ rank: number; organizationId: string; name: string; kind: string; points: number; sales: number }>;
  };
  conference: Array<{ rank: number; campusId: string; name: string; shortName: string; points: number; sales: number; isYourCampus: boolean }>;
};

export type ReportResponse = { ok: true; hidden: boolean };

export type ChapterRequestsResponse = {
  requests: Array<{
    id: string;
    organization: { id: string; name: string };
    user: { id: string; displayName: string | null };
    requestedAt: string;
  }>;
};
