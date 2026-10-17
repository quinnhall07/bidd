// Live-auction helpers shared by server pages and components/live-bid.tsx. Plain module (no "use client"),
// so server components like the item page can call isAuctionListing() to choose bid vs buy.

/** FNV-1a: a small stable hash for deterministic mock data. */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Which resale listings run as live auctions in the mock (stable per id). */
export const isAuctionListing = (id: string) => hash(id) % 3 === 0;

/** Mock hours left for an auction listing (2–5), shared by the card badge and the bid box. */
export const mockHours = (id: string) => 2 + (hash(id + ":h") % 4);

const roundUpDollar = (cents: number) => Math.ceil(cents / 100) * 100;
/** Contract: minNext = start when no bids, else high + max($1, 5% of high rounded up to a dollar). */
export const minNextCents = (startCents: number, highCents: number | null) =>
  highCents == null ? startCents : highCents + Math.max(100, roundUpDollar(highCents * 0.05));
