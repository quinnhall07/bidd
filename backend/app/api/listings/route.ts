import { audit } from "@/lib/audit";
import { CreateListingBody, FeedQuery, type FeedResponse, type ListingResponse } from "@/lib/contracts/listings";
import { ApiError, handle, json, readJson } from "@/lib/http";
import { LISTING_COLUMNS, LISTING_WITH_MEDIA, ensurePersonalCloset, summarize, toDetail, type ListingRow } from "@/lib/listings";
import { requireUser } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminClient } from "@/lib/supabase/admin";
import { userClient } from "@/lib/supabase/server";

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function encodeCursor(publishedAt: string, id: string): string {
  return Buffer.from(JSON.stringify([publishedAt, id])).toString("base64url");
}

// Strictly validated before it reaches a PostgREST filter.
function decodeCursor(cursor: string): { publishedAt: string; id: string } {
  try {
    const [publishedAt, id] = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown[];
    if (typeof publishedAt === "string" && typeof id === "string" && ISO.test(publishedAt) && UUID.test(id)) {
      return { publishedAt, id };
    }
  } catch {
    // fall through
  }
  throw new ApiError(400, "invalid_cursor", "That page link is invalid. Reload the feed.");
}

// Campus feed: active listings on the caller's campus, newest first. RLS also enforces the campus.
export const GET = handle(async (req) => {
  const ctx = await requireUser(req);
  const parsed = FeedQuery.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) throw new ApiError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid filters.");
  const q = parsed.data;

  let query = userClient(ctx.accessToken)
    .from("listings")
    .select(LISTING_WITH_MEDIA)
    .eq("campus_id", ctx.campus.id)
    .eq("status", "active")
    .not("published_at", "is", null);
  if (q.tag) query = query.contains("tags", [q.tag]);
  if (q.size) query = query.eq("size", q.size);
  if (q.minPriceCents !== undefined) query = query.gte("price_cents", q.minPriceCents);
  if (q.maxPriceCents !== undefined) query = query.lte("price_cents", q.maxPriceCents);
  // Hide sellers I've blocked. IDs come from the database, so they're safe to inline.
  const { data: blocks, error: blockError } = await userClient(ctx.accessToken).from("blocks").select("blocked_id");
  if (blockError) throw blockError;
  const blocked = ((blocks ?? []) as { blocked_id: string }[]).map((b) => b.blocked_id).filter((id) => UUID.test(id));
  if (blocked.length) query = query.filter("seller_id", "not.in", `(${blocked.join(",")})`);
  if (q.cursor) {
    const c = decodeCursor(q.cursor);
    query = query.or(`published_at.lt."${c.publishedAt}",and(published_at.eq."${c.publishedAt}",id.lt.${c.id})`);
  }

  const { data, error } = await query
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(q.limit + 1);
  if (error) throw error;

  const rows = (data ?? []) as ListingRow[];
  const page = rows.slice(0, q.limit);
  const last = page[page.length - 1];
  return json<FeedResponse>({
    listings: await summarize(page),
    nextCursor: rows.length > q.limit && last?.published_at ? encodeCursor(last.published_at, last.id) : null,
  });
});

// Creates a draft. Seller, campus, closet and status are set here; anything else in the body is ignored.
export const POST = handle(async (req) => {
  const ctx = await requireUser(req);
  const body = await readJson(req, CreateListingBody);
  await enforceRateLimit([{ bucket: `listings:create:${ctx.userId}`, max: 20, windowSeconds: 3600 }]);

  const closetId = await ensurePersonalCloset(ctx);
  const { data, error } = await adminClient()
    .from("listings")
    .insert({
      campus_id: ctx.campus.id,
      closet_id: closetId,
      seller_id: ctx.userId,
      title: body.title,
      description: body.description,
      brand: body.brand ?? null,
      price_cents: body.priceCents,
      size: body.size,
      condition: body.condition,
      tags: body.tags,
      status: "draft",
    })
    .select(LISTING_COLUMNS)
    .single();
  if (error) throw error;

  const row = { ...(data as ListingRow), listing_media: [] };
  await audit(ctx.userId, "listing.created", row.id);
  return json<ListingResponse>({ listing: await toDetail(row, ctx.userId) }, 201);
});
