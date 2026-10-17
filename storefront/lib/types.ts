// Row shapes, matching the Supabase tables in build.md (snake_case columns).
// A few mock-only columns are marked; Rouan can add them or drop them.

export const MOMENTS = ["Rush", "Bid Day", "Gameday", "Formal", "Casual", "Philanthropy"] as const;
export type Moment = (typeof MOMENTS)[number];

export type Campus = {
  slug: string;
  name: string;
  full_name: string;
  email_domains: string[];
  primary_color: string;
  secondary_color: string;
  city: string;
  state: string;
  greek_members: number | null;
  conference: string;
  logo_url: string | null; // needs adding to the campuses table
  logo_url_dark: string | null; // needs adding to the campuses table
};

export type Chapter = {
  id: string;
  campus_id: string;
  national_org: string;
  letters: string; // mock: shown only with the lab's names=letters
  kind: "sorority" | "fraternity";
  name: string;
  philanthropy: string;
  join_code: string;
  slug: string;
  members: number; // mock
};

export type Profile = {
  id: string;
  campus_id: string;
  chapter_id: string;
  name: string;
  email: string;
  msc_code: string;
  points: number;
};

export type Closet = {
  id: string;
  campus_id: string;
  type: "personal" | "chapter" | "brand";
  owner_id: string | null;
  chapter_id: string | null;
  name: string;
  slug: string;
  handle?: string;
  logo_url: string | null;
  visibility: "public" | "code";
  access_code: string | null;
  verified: boolean;
  bio: string; // mock
  sold_count: number; // mock: derive from orders later
  active_label: string; // mock: derive from last activity later
  demo?: boolean;
};

export type Listing = {
  id: string;
  closet_id: string;
  campus_id: string;
  title: string;
  description: string;
  category: string;
  brand: string;
  size: string;
  condition: "new" | "like new" | "good" | "fair";
  price_cents: number;
  tags: Moment[];
  photo_urls: string[];
  dominant_color?: string;
  status: "active" | "sold";
  drop_id: string | null;
  stock: number | null;
  created_at: string;
};

export type DropSize = { size: string; total: number; stock: number };

export type Auction = {
  pieces: number;
  min_bid_cents: number;
  bid_count: number;
  bids_cents: number[]; // mock: the sealed bids, highest first; never shown to buyers
};

export type Drop = {
  id: string;
  slug: string;
  kind: "preorder" | "auction";
  closet_id: string;
  campus_id: string;
  chapter_id: string;
  name: string;
  description: string;
  starts_at: string;
  ends_at: string;
  licensed_vendor: string;
  philanthropy_pct: number;
  brand_partner: string | null;
  university_licensed: boolean; // the drop carries the university license (shown in the collab lockup)
  company: { name: string; role: "brand" | "vendor" }; // the company in the collab: a brand partner, or the licensed vendor
  auction: Auction | null; // sealed-bid drops only
  price_cents: number; // auction: the minimum bid
  photo_url: string;
  banner_url: string;
  sizes: DropSize[]; // mock: per-size stock; in Supabase this is stock on the drop's listings
  raised_cents: number;
};

export type CupRow = {
  chapter_id: string;
  campus_id: string;
  national_org: string;
  season: string;
  sales_count: number;
  gmv_cents: number;
  points: number;
};

export type DropPhase = "upcoming" | "live" | "low" | "soldout" | "ended";
