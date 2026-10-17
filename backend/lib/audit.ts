import "server-only";
import { adminClient } from "@/lib/supabase/admin";

/** Best-effort audit record. Never throws: a failed audit write must not break the request. */
export async function audit(
  actorId: string | null,
  event: string,
  subject: string | null = null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await adminClient()
    .from("audit_events")
    .insert({ actor_id: actorId, event, subject, metadata });
  if (error) console.error("[audit] failed to record", event, error.message);
}
