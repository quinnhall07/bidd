import type { OrdersResponse } from "@/lib/contracts/orders";
import { handle, json } from "@/lib/http";
import { ORDER_COLUMNS, toOrder, type OrderRow } from "@/lib/orders";
import { requireUser } from "@/lib/security/auth";
import { userClient } from "@/lib/supabase/server";

// Orders where the caller is the buyer or the seller (RLS-filtered), newest first.
export const GET = handle(async (req) => {
  const ctx = await requireUser(req);
  const { data, error } = await userClient(ctx.accessToken)
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return json<OrdersResponse>({ orders: ((data ?? []) as OrderRow[]).map((o) => toOrder(o, ctx.userId)) });
});
