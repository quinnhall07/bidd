import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

/** Caller IP. On Vercel the first x-forwarded-for entry is set by the platform. */
export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
