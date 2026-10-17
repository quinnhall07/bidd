import { env } from "@/lib/env";
import { handle, json } from "@/lib/http";
import { adminClient } from "@/lib/supabase/admin";

type Check = "ok" | "error" | "not_migrated" | "skipped";

export const GET = handle(async () => {
  let envCheck: Check = "ok";
  let hint: string | undefined;
  try {
    env();
  } catch (err) {
    envCheck = "error";
    hint = err instanceof Error ? err.message : String(err);
  }

  let database: Check = "skipped";
  if (envCheck === "ok") {
    // A plain GET: HEAD requests to a missing table come back without an error body.
    const { error } = await adminClient().from("campuses").select("id").limit(1);
    if (!error) database = "ok";
    else if (error.code === "PGRST205" || error.code === "42P01") database = "not_migrated";
    else {
      database = "error";
      console.error("[health] database check failed", error.code, error.message);
    }
  }

  const ok = envCheck === "ok" && database === "ok";
  // env() errors name the variable and the rule, never the value, so they're safe to show in production too.
  const showHint = hint && (envCheck === "error" || process.env.VERCEL_ENV !== "production");
  return json(
    {
      ok,
      service: "bidd-backend",
      time: new Date().toISOString(),
      checks: { env: envCheck, database },
      ...(showHint ? { hint } : {}),
    },
    ok ? 200 : 503,
  );
});
