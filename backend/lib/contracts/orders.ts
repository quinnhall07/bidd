// Shared contract for checkout, orders and QR handoffs. Pilot: no payments are collected.
import { z } from "zod";

export const CheckoutBody = z.object({ listingId: z.uuid() });
export type CheckoutBody = z.infer<typeof CheckoutBody>;

export const ConfirmHandoffBody = z.object({
  /** The value from the buyer's QR code (with or without the "bidd:handoff:" prefix). */
  token: z.string().trim().min(20).max(200),
});
export type ConfirmHandoffBody = z.infer<typeof ConfirmHandoffBody>;

export type OrderStatus = "pending_meetup" | "completed" | "cancelled";

export const PAYMENT_NOTICE = "Payments aren't available yet. Pay the seller in person at the meetup.";

export type Order = {
  id: string;
  status: OrderStatus;
  role: "buyer" | "seller";
  priceCents: number;
  /** Shown for transparency; nothing is charged during the pilot. */
  buyerFeeCents: number;
  totalCents: number;
  payment: { collected: false; message: string };
  listing: { id: string; title: string } | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
};

export type CheckoutResponse = { order: Order };
export type OrdersResponse = { orders: Order[] };

export type HandoffTokenResponse = {
  /** Render this string as a QR code for the seller to scan. Single use. */
  qrPayload: string;
  expiresAt: string;
};

export type ConfirmHandoffResponse = { ok: true; orderId: string };
