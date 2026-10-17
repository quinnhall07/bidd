# Prompt for ChatGPT: build the Bidd frontend (backend-dead, mock data)

> Copy everything below the line into ChatGPT.

---

You are a world-class product designer and senior frontend engineer. Build the **complete mobile frontend for
Bidd**, a real app with a finished backend. You are building it **"backend-dead"**: no server, no keys, no
network calls. Everything runs on a **mock API layer that behaves exactly like the real backend**, so that later we
flip one switch and the same UI talks to the real API with zero UI changes.

**You have complete creative freedom** over the look, feel, layout, navigation, motion, copywriting tone,
illustration style, component design and information architecture. Surprise me. Make it feel like the app every
sorority girl on campus would screenshot and send to her pledge class. The only hard rules are the **contract**
(section 4) and the **must-keeps** (section 3). Everything else is your call.

## 1. The product

**Bidd: the closet for SEC Greek life.** A campus-locked clothing marketplace for sorority and fraternity students
at SEC schools.

- Students sign in with their **school email** and a 6-digit code. Their campus comes from the email domain.
- They **sell** clothes: rush outfits, bid day tees, gameday fits, formal dresses. Photo-first listings.
- Classmates on the **same campus only** browse and **buy**. During the pilot **no payment is collected**: the
  buyer pays the seller in person at the meetup.
- They **meet on campus**. The buyer shows a **one-time QR code**; the seller scans it to complete the sale.
- Every completed sale gives the seller's **chapter 10 points** in the **Closet Cup**: a leaderboard of chapters on
  the campus, plus a ranking of SEC campuses against each other. School pride and chapter pride drive the app.
- Safety: report listings, block sellers, chapter officers approve who's in their chapter, campus admins remove listings.

Campuses at launch:
| Campus | Short name | Email domains | Colors |
|---|---|---|---|
| The University of Alabama | Alabama | crimson.ua.edu, ua.edu | crimson #9E1B32, gray #828A8F, white |
| University of Mississippi | Ole Miss | go.olemiss.edu, olemiss.edu | red #CE1126, navy #14213D, white |

Chapters (Alabama): Alpha Chi Omega, Alpha Delta Pi, Alpha Gamma Delta, Chi Omega, Delta Delta Delta, Kappa Delta,
Sigma Alpha Epsilon, Sigma Chi. (Ole Miss): Chi Omega, Delta Gamma, Kappa Delta, Kappa Kappa Gamma, Phi Mu,
Alpha Omicron Pi, Sigma Alpha Epsilon, Phi Delta Theta.

Audience: 18–22 year-old Greek-life students, on their phones, between classes, at rush week, before gameday.
They care about looking good, their chapter, and their school. The vibe can be fun, fashion-forward, a little
extra, but it must stay fast and dead-simple to list and buy.

## 2. Tech requirements

- **Next.js (App Router) + React + TypeScript** (strict). Styling, animation and component libraries are your choice
  (Tailwind, Framer Motion and similar are welcome).
- **Mobile-first**: design for 375–430px wide; must still look intentional on desktop (e.g. centered phone-width
  layout or a real responsive layout, your choice). Respect safe areas, thumb reach, `prefers-reduced-motion`.
- The dev server must run on **port 3001** (`next dev -p 3001`). The real backend lives on 3000.
- No backend, no database, no API keys, no external services. Images: bundled local placeholders or generated SVG/CSS
  art. Don't depend on random external image URLs that could break.
- Deliver **complete, runnable code**: every file, `package.json`, and a README with run instructions.

## 3. Must-keeps (non-negotiable)

1. **All data goes through one API module** (`lib/api/`) that exposes the functions in section 4 with **exactly** those
   names, inputs and outputs. Screens never fabricate data themselves and never import mock data directly.
2. That module has **two implementations behind one switch**: `NEXT_PUBLIC_API_MODE=mock` (default; everything in
   memory, persisted to `localStorage`) and `NEXT_PUBLIC_API_MODE=live` (real `fetch` to
   `NEXT_PUBLIC_API_BASE_URL`, e.g. `http://localhost:3000`). Implement the live client too, following section 4
   precisely. It's a thin wrapper and it's what makes the merge painless.
3. **Copy the TypeScript types in section 4 verbatim** into `lib/api/types.ts`. Don't rename fields.
4. **No business logic in the UI.** Prices, fees, campus, roles, statuses, points and permissions come from the API.
   The mock implements the rules (section 5) so the UI behaves realistically, but screens only render what the API returns.
5. **Never send fields that aren't in the contract.** In particular, never send a campus, role, status or price
   anywhere it isn't listed.
6. **Theme from data**: campus colors come from `me.campus.theme`. Never hard-code a campus. Alabama and Ole Miss must
   each feel like their own school, and a third school added later must just work.
7. Verification badge text is exactly **"School email verified"**.
8. The buy/checkout flow shows: **"Payments aren't available yet. Pay the seller in person at the meetup."**
9. Money is integer **cents** in the API. Display as dollars with 2 decimals.
10. Errors are `{ error: { code, message } }`. Show `message` and branch on `code` (e.g. go to sign-in on `invalid_token`).
11. Sign-in includes a **bot-check step** (Cloudflare Turnstile in live mode). In mock mode, render a convincing
    placeholder "Verify you're human" widget that produces a fake token after a tap. In live mode, load
    `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` with `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
    Tokens are single use: reset the widget after each send. "Send code" stays disabled until there's a token.
12. **No real school logos, mascots, wordmarks or Greek-organization crests.** Use the colors, original art and text.

## 4. The API contract (mirror this exactly)

### 4.1 Types (`lib/api/types.ts`, copy verbatim)

```ts
// ---------- shared ----------
export type ApiErrorBody = { error: { code: string; message: string } };
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

// ---------- auth ----------
export type Session = {
  accessToken: string;   // send as "Authorization: Bearer <token>"; valid 1 hour
  refreshToken: string;  // rotates: every refresh returns a new one, always replace the stored one
  expiresAt: number;     // unix SECONDS
  tokenType: "bearer";
};
export type RequestCodeBody = { email: string; captchaToken?: string };
export type RequestCodeResponse = { sent: true; message: string; campus: { name: string; shortName: string } };
export type VerifyCodeBody = { email: string; code: string };          // code: 6 digits
export type VerifyCodeResponse = { session: Session; needsOnboarding: boolean };
export type RefreshResponse = { session: Session };

export type CampusTheme = { name?: string; primary?: string; secondary?: string; accent?: string };
export type Badge = { id: "school_email_verified"; label: "School email verified" };
export type MembershipStatus = "pending" | "active" | "rejected";
export type MeResponse = {
  user: { id: string; email: string; displayName: string | null; role: "student" | "admin"; onboarded: boolean };
  campus: { id: string; slug: string; name: string; shortName: string; conference: string; theme: CampusTheme };
  memberships: Array<{
    id: string; status: MembershipStatus; role: "member" | "officer"; requestedAt: string;
    organization: { id: string; name: string; kind: string } | null;
  }>;
  badges: Badge[];
};
export type OrganizationsResponse = {
  organizations: Array<{ id: string; name: string; nationalOrg: string | null; kind: string }>; // kind: sorority | fraternity | brand | other
};
export type OnboardingBody = { displayName: string; organizationId?: string };
export type OnboardingResponse = { ok: true; chapterRequest: { organizationId: string; status: MembershipStatus } | null };

// ---------- listings ----------
export const LISTING_TAGS = ["rush", "bid_day", "gameday", "formal"] as const;            // Rush, Bid Day, Gameday, Formal
export const LISTING_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "0", "2", "4", "6", "8", "10", "12", "14", "ONE_SIZE"] as const;
export const LISTING_CONDITIONS = ["new_with_tags", "like_new", "good", "fair"] as const;  // New with tags, Like new, Good, Fair
export const MAX_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export type ListingTag = (typeof LISTING_TAGS)[number];
export type ListingSize = (typeof LISTING_SIZES)[number];
export type ListingCondition = (typeof LISTING_CONDITIONS)[number];
export type ListingStatus = "draft" | "active" | "reserved" | "sold" | "removed";

export type ListingPhoto = { id: string; position: number; url: string | null; width: number | null; height: number | null };
export type ListingSummary = {
  id: string; title: string; priceCents: number; size: ListingSize; condition: ListingCondition;
  tags: ListingTag[]; brand: string | null; status: ListingStatus; publishedAt: string | null;
  coverUrl: string | null;                                  // in live mode: signed URL that expires in ~10 min
  seller: { id: string; displayName: string | null };       // never an email
};
export type ListingDetail = ListingSummary & {
  description: string; photos: ListingPhoto[]; isOwner: boolean; createdAt: string; updatedAt: string;
};
export type CreateListingBody = {
  title: string;            // 3–80 chars
  description?: string;     // ≤1000
  brand?: string | null;    // ≤60
  priceCents: number;       // integer 100–100000 ($1–$1,000)
  size: ListingSize; condition: ListingCondition;
  tags?: ListingTag[];      // ≤4, unique
};
export type UpdateListingBody = Partial<Omit<CreateListingBody, "tags">> & {
  tags?: ListingTag[];
  status?: "draft" | "active" | "removed";  // publish / unpublish / remove. Clients can NEVER set reserved or sold.
};
export type FeedQuery = {
  tag?: ListingTag; size?: ListingSize; minPriceCents?: number; maxPriceCents?: number;
  cursor?: string; limit?: number;          // limit 1–48, default 24
};
export type FeedResponse = { listings: ListingSummary[]; nextCursor: string | null };
export type MyListingsResponse = { listings: ListingSummary[] };
export type ListingResponse = { listing: ListingDetail };
export type PhotoResponse = { photo: ListingPhoto };

// ---------- orders (pilot: no payments) ----------
export type OrderStatus = "pending_meetup" | "completed" | "cancelled";
export const PAYMENT_NOTICE = "Payments aren't available yet. Pay the seller in person at the meetup.";
export type Order = {
  id: string; status: OrderStatus; role: "buyer" | "seller";
  priceCents: number;
  buyerFeeCents: number;    // display only (5% + $0.50), NOT charged during the pilot
  totalCents: number;
  payment: { collected: false; message: string };
  listing: { id: string; title: string } | null;
  createdAt: string; completedAt: string | null; cancelledAt: string | null;
};
export type CheckoutResponse = { order: Order };
export type OrdersResponse = { orders: Order[] };
export type HandoffTokenResponse = { qrPayload: string; expiresAt: string }; // qrPayload looks like "bidd:handoff:<43 chars>"
export type ConfirmHandoffResponse = { ok: true; orderId: string };

// ---------- community ----------
export const REPORT_REASONS = ["prohibited_item", "scam_or_fraud", "offensive", "wrong_item", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const CUP_POINTS_PER_SALE = 10;
export type CupResponse = {
  campus: { id: string; name: string;
    standings: Array<{ rank: number; organizationId: string; name: string; kind: string; points: number; sales: number }> };
  conference: Array<{ rank: number; campusId: string; name: string; shortName: string; points: number; sales: number; isYourCampus: boolean }>;
};
export type ReportResponse = { ok: true; hidden: boolean };
export type ChapterRequestsResponse = {
  requests: Array<{ id: string; organization: { id: string; name: string }; user: { id: string; displayName: string | null }; requestedAt: string }>;
};
```

### 4.2 Functions (`lib/api/index.ts`) and the real HTTP route each one maps to

🔒 = live mode sends `Authorization: Bearer <accessToken>`. All bodies JSON except photo upload.

| Function | Live HTTP | Returns |
|---|---|---|
| `requestCode(body: RequestCodeBody)` | `POST /api/auth/request-code` | `RequestCodeResponse` |
| `verifyCode(body: VerifyCodeBody)` | `POST /api/auth/verify-code` | `VerifyCodeResponse` |
| `refresh(refreshToken: string)` | `POST /api/auth/refresh` body `{ refreshToken }` | `RefreshResponse` |
| `logout()` 🔒 | `POST /api/auth/logout` | `{ ok: true }` |
| `getMe()` 🔒 | `GET /api/me` | `MeResponse` |
| `getOrganizations()` 🔒 | `GET /api/organizations` | `OrganizationsResponse` |
| `onboard(body: OnboardingBody)` 🔒 | `POST /api/onboarding` | `OnboardingResponse` |
| `getFeed(q: FeedQuery)` 🔒 | `GET /api/listings?tag&size&minPriceCents&maxPriceCents&limit&cursor` | `FeedResponse` |
| `createListing(body: CreateListingBody)` 🔒 | `POST /api/listings` (201) | `ListingResponse` |
| `getListing(id)` 🔒 | `GET /api/listings/:id` | `ListingResponse` |
| `updateListing(id, body: UpdateListingBody)` 🔒 | `PATCH /api/listings/:id` | `ListingResponse` |
| `uploadPhoto(listingId, file: File)` 🔒 | `POST /api/listings/:id/media`, **multipart/form-data, field `photo`** (201). Don't set Content-Type manually. | `PhotoResponse` |
| `deletePhoto(listingId, photoId)` 🔒 | `DELETE /api/listings/:id/media/:photoId` | `{ ok: true }` |
| `getMyListings()` 🔒 | `GET /api/me/listings` | `MyListingsResponse` |
| `reportListing(id, body: { reason: ReportReason; details?: string })` 🔒 | `POST /api/listings/:id/report` | `ReportResponse` |
| `checkout(listingId)` 🔒 | `POST /api/checkout` body `{ listingId }` (201) | `CheckoutResponse` |
| `getOrders()` 🔒 | `GET /api/orders` | `OrdersResponse` |
| `cancelOrder(orderId)` 🔒 | `POST /api/orders/:id/cancel` | `{ ok: true }` |
| `getHandoffToken(orderId)` 🔒 | `POST /api/orders/:id/handoff-token` | `HandoffTokenResponse` |
| `confirmHandoff(token: string)` 🔒 | `POST /api/handoffs/confirm` body `{ token }` | `ConfirmHandoffResponse` |
| `getCup()` 🔒 | `GET /api/cup` | `CupResponse` |
| `getChapterRequests()` 🔒 | `GET /api/chapter/requests` | `ChapterRequestsResponse` |
| `decideChapterRequest(id, approve: boolean)` 🔒 | `POST /api/chapter/requests/:id` body `{ approve }` | `{ ok: true; status: "active" \| "rejected" }` |
| `getBlocks()` 🔒 | `GET /api/blocks` | `{ blockedUserIds: string[] }` |
| `blockUser(userId)` 🔒 | `POST /api/blocks` body `{ userId }` | `{ ok: true }` |
| `unblockUser(userId)` 🔒 | `DELETE /api/blocks/:userId` | `{ ok: true }` |
| `adminRemoveListing(id)` 🔒 | `POST /api/admin/listings/:id/remove` | `{ ok: true }` |

Every non-2xx response has body `ApiErrorBody`. The client throws `new ApiError(status, code, message)`.

### 4.3 Session handling (shared by both modes)
- After `verifyCode`, store the session (access token in memory and refresh token in `localStorage` is fine for the pilot).
- Refresh ~60s before `expiresAt`, or once when a call fails with `401 invalid_token`; on `401 invalid_refresh_token`
  clear everything and go to sign-in. **The refresh token rotates**: always save the new one.
- `logout()` then clear local state.

### 4.4 Error codes the UI must handle (with the real messages)
| Status | code | Message / UX |
|---|---|---|
| 400 | `invalid_email` | "Enter a valid school email address." |
| 400 | `school_not_supported` | "Bidd isn't at your school yet. Use your school email address." (a fun "we're coming to your campus" moment) |
| 400 | `captcha_failed` | "Complete the bot check and try again." |
| 400 | `invalid_code` | "That code is wrong or expired. Request a new one." |
| 429 | `rate_limited` | "Too many attempts. Wait a few minutes and try again." / "Wait a minute before asking for another code." |
| 401 | `unauthenticated`, `invalid_token`, `invalid_refresh_token` | Session gone: back to sign-in. |
| 403 | `account_suspended` | "This account is suspended." |
| 403 | `campus_inactive` | "Bidd is paused at your school right now." |
| 400 | `organization_not_found` | "Pick a chapter from your campus." |
| 409 | `chapter_already_requested` | "You've already requested a chapter." |
| 404 | `listing_not_found` | "That listing doesn't exist." |
| 409 | `listing_needs_photo` | "Add at least one photo before publishing." |
| 409 | `listing_locked` | "This listing can't be changed anymore." |
| 400 | `invalid_image` | "Upload a JPEG, PNG or WebP photo." |
| 413 | `photo_too_large` | "Photos can be at most 4 MB." |
| 409 | `too_many_photos` | "A listing can have at most 6 photos." |
| 409 | `listing_unavailable` | "Someone already claimed this item." |
| 409 | `cannot_buy_own_listing` | "You can't buy your own listing." |
| 404 | `order_not_found` | "That order doesn't exist." |
| 409 | `order_not_open` | "This order is already completed or cancelled." |
| 400 | `invalid_handoff` | "That QR code isn't valid for your sale." |
| 409 | `handoff_already_used` | "That QR code was already used." |
| 410 | `handoff_expired` | "That QR code expired. Ask the buyer to refresh it." |
| 409 | `cannot_report_own_listing` | "You can't report your own listing." |
| 400 | `cannot_block_self` | "You can't block yourself." |
| 404 | `request_not_found` · 409 `request_not_pending` | Officer actions. |
| 403 | `forbidden` | "Only admins can do that." |
| 500 | `internal_error` | "Something went wrong. Try again." |
| 404 | `photo_not_found` · `user_not_found` | Stale photo/user ID: refresh the screen. |
| 400 | `invalid_cursor` | Feed page link went stale: reload the feed from the top. |
| 400/413/415 | `invalid_request` · `invalid_json` · `payload_too_large` · `unsupported_media_type` | Show `message` (validation). |
| 403 | `email_not_verified` · `campus_mismatch` | Treat as signed out: back to sign-in. |
| 502/503 | `code_send_failed` · `email_delivery_unavailable` · `rate_limit_unavailable` | "We couldn't send a code right now. Try again in a minute." |
| 403 | `origin_not_allowed` | Live-mode setup problem (frontend not on an allowed origin). Show a dev-facing hint. |

## 5. Rules the mock must enforce (so the UI behaves like production)

- **Sign-in**: only exact domains `crimson.ua.edu`, `ua.edu` → Alabama; `go.olemiss.edu`, `olemiss.edu` → Ole Miss.
  Lowercase + trim the email. Anything else → `school_not_supported`. Mock code is always **`123456`**; show that hint
  only in mock mode. Enforce a 60-second resend cooldown (`rate_limited`). Require a captcha token.
  New emails → `needsOnboarding: true`. Store multiple mock accounts so I can sign in as different students.
- **Campus lock**: a user only ever sees listings, chapters, orders and Cup standings of **their** campus. Another
  campus's listing ID → `listing_not_found`.
- **Onboarding**: display name 2–40 chars (letters, numbers, spaces, `.` `'` `-`). Chapter request starts `pending`.
  One chapter per user (`chapter_already_requested`). Seed one officer per chapter so approvals can be demoed;
  add a mock-only "dev menu" to switch accounts (e.g. a seller, a buyer, an officer, an admin, an Ole Miss student).
- **Listings**: create → `draft` (only the owner sees drafts). Publishing needs ≥1 photo. Max 6 photos, ≤4 MB, image
  types only. Feed = `active` only, newest first, filters, cursor pagination (opaque string), 24 per page.
  `reserved`/`sold` are visible on the detail page but not in the feed. Owners can't buy their own.
  `reserved`/`sold`/`removed` listings can't be edited (`listing_locked`).
- **Checkout**: listing → `reserved`, order `pending_meetup`, `buyerFeeCents = round(price * 0.05) + 50`,
  `totalCents = price + fee`, `payment = { collected: false, message: PAYMENT_NOTICE }`. Second buyer →
  `listing_unavailable`. Cancel (buyer or seller) → order `cancelled`, listing back to `active`.
- **QR handoff**: buyer gets `qrPayload = "bidd:handoff:" + 43 random URL-safe chars`, valid 15 min; a new one revokes
  the old. Only the seller of that order can confirm, exactly once. Success → order `completed`, listing `sold`,
  and if the seller's chapter membership is `active`, that chapter gets **+10 Cup points**.
- **Closet Cup**: campus standings list every sorority/fraternity on the campus (zero-point ones too), ranked by
  points then name. Conference = campus totals. Seed believable non-zero points so it looks alive.
- **Reports**: one per user per listing (repeats ignored); 3 distinct reporters → listing becomes `removed` (`hidden: true`).
- **Blocks**: blocked sellers vanish from the blocker's feed only.
- **Admins** can remove any `draft`/`active` listing on their campus.
- Add small artificial latency (150–600 ms) so loading states are real, and a mock-only toggle to simulate errors.

## 6. Screens and flows to design (layout and navigation are up to you)

1. **Welcome / sign in**: email → bot check → send code → 6-digit code input (auto-advance, paste support, resend
   countdown) → in. Unsupported school gets a delightful "Bidd isn't at your school yet" state.
2. **Onboarding**: display name, chapter picker (grouped sororities / fraternities), clear "pending approval" status,
   skippable chapter step. This is the moment the app first wears the campus colors.
3. **Feed**: photo-first, filter chips for Rush / Bid Day / Gameday / Formal, size and price filters, infinite scroll,
   pull-to-refresh, empty state, skeleton loading. The campus identity should be felt everywhere.
4. **Listing detail**: photo carousel, price, size, condition, tags, brand, description, seller display name (+ chapter
   if you like, from your own data), Buy, Report (reason sheet), Block seller. States: Reserved, Sold.
   The owner sees Edit / Unpublish / Remove; admins see Remove.
5. **Sell**: a fast flow (photos → details → price → tags → publish), with draft saving, photo add/remove, inline
   validation using the limits above, and helpful errors.
6. **My closet**: my listings grouped Drafts / Live / Reserved / Sold.
7. **Orders**: Buying (status, the pay-in-person notice, **Show QR** with a big scannable code + countdown + refresh,
   Cancel) and Selling (**Scan QR** via camera with a **paste-code fallback**, Cancel). A satisfying celebration on a
   completed handoff ("+10 for your chapter!").
8. **Closet Cup**: campus chapter leaderboard and SEC campus ranking. Highlight the user's chapter and campus. Make
   this the most fun screen in the app.
9. **Profile**: name, campus, "School email verified" badge, chapter + status, blocked sellers, log out.
10. **Officer** (only for active officers): approve/reject join requests.
11. Every screen: loading, empty and error states; accessible labels; ≥44px touch targets; good contrast in both
    campus themes; dark mode if you want it.

Live-mode notes (implement now, it only activates later):
- Photo URLs come from `https://xanamvujsuckcypoaavd.supabase.co` and expire after ~10 minutes. Use plain `<img>` or
  allow that host in `next.config` `images.remotePatterns`. On image error, re-fetch the listing.
- Resize big photos client-side (max ~2000px, JPEG ~0.85) before upload to stay under 4 MB.
- QR: generate with a library like `qrcode`; scan with `@zxing/browser` or `html5-qrcode`.

## 7. Mock content

Seed rich, believable data for **both** campuses: ~20–30 listings each across all four tags, sizes, conditions and
prices ($8–$350), several sellers with display names, a few reserved/sold items, some orders for the default
account, and Cup points. Use local placeholder imagery (original illustrations, gradients, SVG garment silhouettes,
or bundled images). No real people's photos, no real logos.

## 8. Deliverables

1. The complete project (every file), runnable with `npm install && npm run dev` on port 3001.
2. `README.md`: how to run it, how to switch to live mode (`NEXT_PUBLIC_API_MODE=live`,
   `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY=...`), the mock accounts and the
   mock code `123456`.
3. A short design note: the concept, palette strategy per campus, type, motion and key UX decisions.

Take full ownership of the design. Be bold, polished and specific. Ship the whole thing.
