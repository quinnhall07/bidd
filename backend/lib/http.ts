import { NextResponse, type NextRequest } from "next/server";
import type { ZodType } from "zod";

/** An error that is safe to show the client: status, stable code, human message. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

function errorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/** Wraps a route so every failure becomes `{ error: { code, message } }` and internals are never leaked. */
export function handle<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) return errorResponse(err.status, err.code, err.message);
      console.error("[api] unhandled error", req.method, req.nextUrl.pathname, err);
      return errorResponse(500, "internal_error", "Something went wrong. Try again.");
    }
  };
}

const MAX_BODY_BYTES = 16 * 1024;

/** Reads a JSON body and validates it. Unknown keys (e.g. a forged `campus_id`) are stripped. */
export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Send the request body as JSON.");
  }
  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    throw new ApiError(413, "payload_too_large", "Request body is too large.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ApiError(400, "invalid_json", "Request body isn't valid JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid request.");
  }
  return parsed.data;
}
