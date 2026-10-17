export const money = (cents: number, decimals = cents % 100 !== 0) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 })}`;

/** Peer resale buyer fee: 5% + $0.50 (PRODUCT.md). Sellers pay 0%. */
export const buyerFee = (cents: number) => Math.round(cents * 0.05) + 50;

export const initials = (name: string) =>
  name
    .replace(/\./g, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

export const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });

/** Days since the Fall Cup started on Bid Day (mock season start). */
export const cupDay = (now = Date.now()) => Math.max(1, Math.floor((now - Date.parse("2026-08-16T00:00:00-05:00")) / 864e5) + 1);
