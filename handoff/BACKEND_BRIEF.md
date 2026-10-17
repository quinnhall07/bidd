# Bidd backend brief: everything a frontend needs

> **How to use this file:** give it to your AI assistant (or read it yourself) before writing any frontend code.
> It describes the finished backend in `backend/`. The source of truth for exact types is
> `backend/lib/contracts/*.ts`; this file mirrors them.

---

## 1. What Bidd is

**Bidd: the closet for SEC Greek life.** A campus-locked clothing marketplace for sorority and fraternity students.

- Students sign in with their **school email** (6-digit code). Their campus is decided by that email domain.
- They **list clothes** (rush outfits, bid day tees, gameday fits, formal dresses) with photos.
- Classmates on the **same campus only** browse a feed and **buy**. **Pilot: no payments are collected.** The buyer
  pays the seller in person.
- They **meet on campus**. The buyer shows a **one-time QR code**; the seller scans it. That completes the sale.
- Every completed sale gives the seller's **chapter 10 points** in the **Closet Cup** (a campus leaderboard plus an
  SEC-wide campus ranking).
- Safety: report listings, block sellers, chapter officers approve members, campus admins remove listings.

Campuses live today: **The University of Alabama** and **University of Mississippi (Ole Miss)**.

---

## 2. Running it locally

```bash
cd backend
npm install
npm run dev          # API at http://localhost:3000
```

- Node 22+. Keys live in `backend/.env.local` (ask Rouan; never commit it).
- **Run the frontend on port 3001.** The API only accepts browser requests from origins listed in
  `FRONTEND_ORIGINS` (default `http://localhost:3001`). Another port means updating that env var in the backend.
- `http://localhost:3000/dev` is a bare test page that exercises every endpoint. Use it to see real responses.
- `GET http://localhost:3000/api/health` returns `{ ok: true, checks: { env: "ok", database: "ok" } }` when everything's up.

---

## 3. Golden rules for the frontend

1. **The frontend holds no business logic and no secrets.** It displays data and calls the API. Prices, fees,
   campus, roles, statuses and points are decided by the server.
2. **Never send fields that aren't in the contract.** Extra fields (like `campus_id`) are silently dropped anyway.
3. **Auth is a Bearer token, no cookies.** Send `Authorization: Bearer <accessToken>` on every authenticated call.
4. **Every error has the same shape:** `{ "error": { "code": "snake_case_code", "message": "Human sentence." } }`.
   Show `message` to the user and branch on `code`.
5. **Money is in whole cents.** `4500` = `$45.00`. Display with 2 decimals.
6. **Photo URLs expire after ~10 minutes.** Don't cache them long-term; re-fetch the listing/feed (or retry on image error).
7. **Theme the UI from the API**: `GET /api/me` returns the campus colors.
8. The verification badge text is exactly **"School email verified"** (never "verified student").
9. The checkout screen must show: **"Payments aren't available yet. Pay the seller in person at the meetup."**

---

## 4. Auth and sessions

### Sign-in flow (same for new and returning students)
1. User enters their school email. The frontend renders a **Cloudflare Turnstile** widget (bot check) and gets a token.
2. `POST /api/auth/request-code` with `{ email, captchaToken }`. A 6-digit code is emailed (subject "Your Bidd code: 123456").
3. User types the code. `POST /api/auth/verify-code` with `{ email, code }` returns a `session` and `needsOnboarding`.
4. If `needsOnboarding`: show onboarding (display name + optional chapter). Otherwise go to the feed.

### Turnstile (bot check) — required
- CAPTCHA is **on** in Supabase, so `request-code` fails with `captcha_failed` without a valid token.
- Site key: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public; same value as the backend's `.env.local`, ask Rouan).
- Load `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`, render the widget, take the token from
  its callback, send it as `captchaToken`. **Tokens are single use**: call `turnstile.reset(widgetId)` after each send.
- Disable the "Send code" button until the widget has produced a token.
- The frontend's hostname must be allowed in the Cloudflare widget settings (`localhost` already is).

### Session object
```ts
type Session = {
  accessToken: string;   // JWT, valid 1 hour. Send as Bearer.
  refreshToken: string;  // Rotates: every refresh returns a NEW one. Always replace the stored value.
  expiresAt: number;     // Unix SECONDS.
  tokenType: "bearer";
};
```
- Refresh with `POST /api/auth/refresh` about 60 seconds before `expiresAt`, or once after a `401 invalid_token`.
  If refresh returns `401 invalid_refresh_token`, send the user back to sign-in.
- Suggested storage for the pilot: access token in memory, refresh token in `localStorage`.
- Resend: Supabase allows a new code for the same email every 60 seconds (you'll get `429 rate_limited` sooner).

### Who can sign in
Exact domains only: `crimson.ua.edu`, `ua.edu` (Alabama), `go.olemiss.edu`, `olemiss.edu` (Ole Miss).
Anything else returns `400 school_not_supported` ("Bidd isn't at your school yet."). Look-alikes like
`crimson.ua.edu.evil.com` fail too.

---

## 5. API reference

Base URL: `http://localhost:3000` (a Vercel URL later). All bodies are JSON unless noted. 🔒 = needs Bearer token.

### Errors that can come from any 🔒 route
| Status | code | Meaning / what to do |
|---|---|---|
| 401 | `unauthenticated` | No token. Go to sign-in. |
| 401 | `invalid_token` | Expired/invalid. Refresh once, then sign-in. |
| 403 | `email_not_verified` | Shouldn't happen after verify-code. Sign-in again. |
| 403 | `account_suspended` | Show a blocking screen. |
| 403 | `campus_inactive` | "Bidd is paused at your school right now." |
| 403 | `campus_mismatch` | Sign-in again. |
| 400 | `invalid_request` / `invalid_json` | Validation failed; `message` says what. |
| 415 | `unsupported_media_type` | Wrong Content-Type. |
| 413 | `payload_too_large` | JSON body over 16 KB. |
| 429 | `rate_limited` | "Too many attempts. Wait a few minutes." |
| 403 | `origin_not_allowed` | Frontend origin isn't in `FRONTEND_ORIGINS`. |
| 500 | `internal_error` | Generic failure; offer retry. |

### 5.1 Auth

**`POST /api/auth/request-code`**
```json
{ "email": "jdoe@crimson.ua.edu", "captchaToken": "<turnstile token>" }
```
200 →
```json
{ "sent": true, "message": "Check your school inbox for a code. It expires in 10 minutes.",
  "campus": { "name": "The University of Alabama", "shortName": "Alabama" } }
```
Errors: `400 invalid_email`, `400 school_not_supported`, `400 captcha_failed`, `429 rate_limited`,
`502 code_send_failed`, `503 email_delivery_unavailable`, `503 rate_limit_unavailable`.

**`POST /api/auth/verify-code`**
```json
{ "email": "jdoe@crimson.ua.edu", "code": "123456" }
```
200 → `{ "session": Session, "needsOnboarding": true }`
Errors: `400 invalid_code` ("That code is wrong or expired. Request a new one."), `403 school_not_supported`, `429`.

**`POST /api/auth/refresh`** `{ "refreshToken": "..." }` → `{ "session": Session }` · `401 invalid_refresh_token`.

**`POST /api/auth/logout`** 🔒 → `{ "ok": true }`. Then clear tokens locally.

### 5.2 Account

**`GET /api/me`** 🔒
```json
{
  "user": { "id": "uuid", "email": "jdoe@crimson.ua.edu", "displayName": "Jamie", "role": "student", "onboarded": true },
  "campus": { "id": "uuid", "slug": "ua", "name": "The University of Alabama", "shortName": "Alabama",
              "conference": "SEC", "theme": { "name": "crimson", "primary": "#9E1B32", "secondary": "#828A8F", "accent": "#FFFFFF" } },
  "memberships": [ { "id": "uuid", "status": "pending", "role": "member", "requestedAt": "ISO",
                     "organization": { "id": "uuid", "name": "Kappa Delta", "kind": "sorority" } } ],
  "badges": [ { "id": "school_email_verified", "label": "School email verified" } ]
}
```
- `role`: `"student"` | `"admin"`. Admins see "Remove listing" on listings.
- `memberships[].status`: `"pending"` (waiting for an officer) | `"active"` | `"rejected"`. `role`: `"member"` | `"officer"`.
- `organization` can be `null`.

**`GET /api/organizations`** 🔒: chapters on **your** campus, for the onboarding picker.
```json
{ "organizations": [ { "id": "uuid", "name": "Alpha Chi Omega", "nationalOrg": "Alpha Chi Omega", "kind": "sorority" } ] }
```
`kind`: `"sorority"` | `"fraternity"` | `"brand"` | `"other"`.

**`POST /api/onboarding`** 🔒
```json
{ "displayName": "Jamie", "organizationId": "uuid (optional)" }
```
200 → `{ "ok": true, "chapterRequest": { "organizationId": "uuid", "status": "pending" } | null }`
- `displayName`: 2–40 chars; letters, numbers, spaces, `.` `'` `-`.
- Picking a chapter is a **request** (shown as pending until an officer approves). One chapter per student.
- Can be called again later to change the display name.
- Errors: `400 invalid_request`, `400 organization_not_found`, `409 chapter_already_requested`.

### 5.3 Listings

**Enums**
```ts
const LISTING_TAGS = ["rush", "bid_day", "gameday", "formal"];                 // labels: Rush, Bid Day, Gameday, Formal
const LISTING_SIZES = ["XXS","XS","S","M","L","XL","XXL","0","2","4","6","8","10","12","14","ONE_SIZE"]; // ONE_SIZE → "One size"
const LISTING_CONDITIONS = ["new_with_tags","like_new","good","fair"];         // New with tags, Like new, Good, Fair
type ListingStatus = "draft" | "active" | "reserved" | "sold" | "removed";
// Limits: title 3–80 chars, description ≤1000, brand ≤60, price $1.00–$1,000.00 (100–100000 cents),
// ≤4 unique tags, 1–6 photos (JPEG/PNG/WebP, ≤4 MB each).
```

**Types**
```ts
type ListingPhoto = { id: string; position: number; url: string | null; width: number | null; height: number | null };
type ListingSummary = {
  id: string; title: string; priceCents: number; size: ListingSize; condition: ListingCondition;
  tags: ListingTag[]; brand: string | null; status: ListingStatus; publishedAt: string | null;
  coverUrl: string | null;                                   // signed, ~10 min
  seller: { id: string; displayName: string | null };        // never an email
};
type ListingDetail = ListingSummary & {
  description: string; photos: ListingPhoto[]; isOwner: boolean; createdAt: string; updatedAt: string;
};
```

**`GET /api/listings`** 🔒: the campus feed (active listings on your campus, newest first, blocked sellers hidden).
Query: `tag`, `size`, `minPriceCents`, `maxPriceCents`, `limit` (1–48, default 24), `cursor`.
200 → `{ "listings": ListingSummary[], "nextCursor": "opaque" | null }`. Next page: same query + `cursor=nextCursor`.
Errors: `400 invalid_cursor` (reload the feed).

**`POST /api/listings`** 🔒: create a **draft**.
```json
{ "title": "Crimson rush dress", "description": "Worn once", "brand": "Lulus",
  "priceCents": 4500, "size": "S", "condition": "like_new", "tags": ["rush"] }
```
201 → `{ "listing": ListingDetail }` (status `draft`, no photos yet). `429` after 20/hour.

**`GET /api/listings/:id`** 🔒 → `{ "listing": ListingDetail }`. `404 listing_not_found` for other campuses, other
people's drafts and removed listings. Reserved/sold listings are still viewable (show a "Sold"/"Reserved" state).

**`PATCH /api/listings/:id`** 🔒 (seller only): any subset of the create fields, plus `"status"`:
`"active"` (publish), `"draft"` (unpublish) or `"removed"` (delete for the seller). → `{ "listing": ListingDetail }`.
Errors: `404 listing_not_found` (not yours), `409 listing_needs_photo` (publish needs ≥1 photo),
`409 listing_locked` (reserved/sold/removed can't change).

**`POST /api/listings/:id/media`** 🔒 (seller only): upload **one** photo per request.
`multipart/form-data`, file field name **`photo`**. Don't set Content-Type yourself; let `fetch` + `FormData` do it.
```js
const form = new FormData();
form.append("photo", file);
await fetch(`${API}/api/listings/${id}/media`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
```
201 → `{ "photo": ListingPhoto }`. The server re-encodes to WebP (max 1600px) and strips GPS/EXIF.
Errors: `400 invalid_image`, `413 photo_too_large`, `409 too_many_photos` (max 6), `409 listing_locked`, `429` (60/hour).
Tip: resize big phone photos client-side (e.g. canvas, max 2000px, JPEG 0.85) before upload to stay under 4 MB.

**`DELETE /api/listings/:id/media/:photoId`** 🔒 (seller) → `{ "ok": true }`.
`404 photo_not_found`, `409 listing_needs_photo` if it's the last photo of a published listing.

**`GET /api/me/listings`** 🔒 → `{ "listings": ListingSummary[] }`: your listings incl. drafts, reserved and sold (not removed).

**`POST /api/listings/:id/report`** 🔒
```json
{ "reason": "prohibited_item" | "scam_or_fraud" | "offensive" | "wrong_item" | "other", "details": "optional, ≤500" }
```
200 → `{ "ok": true, "hidden": false }`. One report per student per listing (repeats are ignored);
**3 different students' reports hide the listing**. Errors: `404 listing_not_found`, `409 cannot_report_own_listing`.

### 5.4 Checkout, orders and the meetup QR (pilot: no payments)

```ts
type OrderStatus = "pending_meetup" | "completed" | "cancelled";
type Order = {
  id: string; status: OrderStatus; role: "buyer" | "seller";
  priceCents: number;
  buyerFeeCents: number;    // display only (5% + $0.50); NOT charged during the pilot
  totalCents: number;
  payment: { collected: false; message: "Payments aren't available yet. Pay the seller in person at the meetup." };
  listing: { id: string; title: string } | null;   // fetch /api/listings/:id for photos
  createdAt: string; completedAt: string | null; cancelledAt: string | null;
};
```

**Flow:** Buy → listing `reserved` + order `pending_meetup` → meet on campus → buyer taps "Show QR" →
seller scans → order `completed`, listing `sold`, chapter gets Cup points. Either side can cancel before the meetup.

**`POST /api/checkout`** 🔒 `{ "listingId": "uuid" }` → 201 `{ "order": Order }`.
Errors: `404 listing_not_found`, `409 listing_unavailable` ("Someone already claimed this item."), `409 cannot_buy_own_listing`.

**`GET /api/orders`** 🔒 → `{ "orders": Order[] }` (where you're buyer or seller, newest first).

**`POST /api/orders/:id/cancel`** 🔒 (buyer or seller, while `pending_meetup`) → `{ "ok": true }`. Listing goes back on the feed.
Errors: `404 order_not_found`, `409 order_not_open`.

**`POST /api/orders/:id/handoff-token`** 🔒 (buyer only) → `{ "qrPayload": "bidd:handoff:<43 chars>", "expiresAt": "ISO" }`.
Render `qrPayload` as a QR code (e.g. the `qrcode` npm package). Single use, expires in **15 minutes**; asking again
revokes the previous code (offer a "Refresh code" button and a countdown).

**`POST /api/handoffs/confirm`** 🔒 (seller only) `{ "token": "<the scanned qrPayload>" }` → `{ "ok": true, "orderId": "uuid" }`.
Scan with the camera (e.g. `@zxing/browser` or `html5-qrcode`) and **always offer a "paste code" fallback**.
Errors: `400 invalid_handoff` ("That QR code isn't valid for your sale."), `409 handoff_already_used`,
`410 handoff_expired` ("Ask the buyer to refresh it."), `409 order_not_open`.

### 5.5 Closet Cup

**`GET /api/cup`** 🔒
```json
{
  "campus": { "id": "uuid", "name": "The University of Alabama",
              "standings": [ { "rank": 1, "organizationId": "uuid", "name": "Kappa Delta", "kind": "sorority", "points": 40, "sales": 4 } ] },
  "conference": [ { "rank": 1, "campusId": "uuid", "name": "The University of Alabama", "shortName": "Alabama",
                    "points": 120, "sales": 12, "isYourCampus": true } ]
}
```
Scoring: **10 points per completed QR handoff**, credited to the seller's **approved** chapter. Aggregates only.
`standings` includes zero-point chapters (sororities + fraternities).

### 5.6 Chapter officers

**`GET /api/chapter/requests`** 🔒 → pending join requests for chapters where you're an approved officer (empty for everyone else).
```json
{ "requests": [ { "id": "uuid", "organization": { "id": "uuid", "name": "Kappa Delta" },
                  "user": { "id": "uuid", "displayName": "Jamie" }, "requestedAt": "ISO" } ] }
```
**`POST /api/chapter/requests/:id`** 🔒 `{ "approve": true | false }` → `{ "ok": true, "status": "active" | "rejected" }`.
Errors: `404 request_not_found`, `409 request_not_pending`.
Show an "Officer" area only when the user is an active officer (`me.memberships` has `role: "officer"`, `status: "active"`)
or when this list is non-empty.

### 5.7 Blocks

`GET /api/blocks` 🔒 → `{ "blockedUserIds": ["uuid"] }` · `POST /api/blocks` 🔒 `{ "userId": "uuid" }` → `{ "ok": true }`
· `DELETE /api/blocks/:userId` 🔒 → `{ "ok": true }`. Use `listing.seller.id`. Blocked sellers vanish from the feed.
`400 cannot_block_self`, `404 user_not_found`. The API returns only IDs; keep the seller's display name locally
if you want to show a "Blocked sellers" list.

### 5.8 Admin

`POST /api/admin/listings/:id/remove` 🔒 (only when `me.user.role === "admin"`, own campus) → `{ "ok": true }`.
`403 forbidden`, `404 listing_not_found`.

### 5.9 Health

`GET /api/health` → `200 { ok: true, ... }` or `503`.

---

## 6. Campus data (seeded)

| Campus | slug | Email domains | Theme |
|---|---|---|---|
| The University of Alabama ("Alabama") | `ua` | `crimson.ua.edu`, `ua.edu` | crimson `#9E1B32`, gray `#828A8F`, white |
| University of Mississippi ("Ole Miss") | `olemiss` | `go.olemiss.edu`, `olemiss.edu` | red `#CE1126`, navy `#14213D`, white |

Chapters: **Alabama**: Alpha Chi Omega, Alpha Delta Pi, Alpha Gamma Delta, Chi Omega, Delta Delta Delta,
Kappa Delta (sororities); Sigma Alpha Epsilon, Sigma Chi (fraternities).
**Ole Miss**: Chi Omega, Delta Gamma, Kappa Delta, Kappa Kappa Gamma, Phi Mu, Alpha Omicron Pi (sororities);
Sigma Alpha Epsilon, Phi Delta Theta (fraternities).

More schools can be added later as data, so **never hard-code campuses**. Always theme from `me.campus.theme`.

---

## 7. Screens the API supports

1. **Sign in**: email → Turnstile → send code → 6-digit code entry (paste-friendly, resend after 60s).
2. **Onboarding**: display name, chapter picker (from `/api/organizations`), "pending approval" note.
3. **Feed**: campus-themed, filter chips (Rush / Bid Day / Gameday / Formal), size and price filters, infinite scroll.
4. **Listing detail**: photo carousel, price, size, condition, tags, brand, seller display name, Buy, Report, Block seller.
   Reserved/Sold badges. Owner sees Edit / Unpublish / Remove instead of Buy. Admin sees Remove.
5. **Sell**: create draft → add 1–6 photos (reorder isn't supported; order = upload order) → publish.
6. **My closet**: `/api/me/listings` grouped by status (Drafts, Live, Reserved, Sold).
7. **Orders**: buying (Show QR, Cancel) and selling (Scan QR, Cancel), with the payment notice.
8. **Closet Cup**: campus chapter leaderboard + SEC campus ranking, highlight the user's chapter and campus.
9. **Profile**: name, campus, "School email verified" badge, chapter + status, blocked sellers, logout.
10. **Officer** (conditional): approve/reject chapter join requests.

---

## 8. Rate limits (so the UI can explain them)

| Action | Limit |
|---|---|
| Request code | 5 per email / 10 min (plus Supabase's 60s between sends) |
| Verify code | 10 per email / 10 min |
| Create listing | 20 / hour |
| Upload photo | 60 / hour |
| Checkout | 30 / hour |
| QR code | 30 / hour (generate) · 20 confirms / 10 min |
| Report | 20 / hour |

---

## 9. Merging a separately built frontend

If the UI was built "backend-dead" with mock data:
1. Put it in `frontend/` at the repo root. Run it on port **3001**.
2. It should talk to the API through **one** client module whose function names and return types match section 5.
   Swap the mock implementation for real `fetch` calls to `NEXT_PUBLIC_API_BASE_URL` (`http://localhost:3000`).
3. Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and render the real Turnstile widget on sign-in.
4. Allow `https://xanamvujsuckcypoaavd.supabase.co` as an image host (photo URLs are Supabase signed URLs).
5. Walk every screen against the running backend. `/dev` shows the expected real responses for comparison.

---

## 10. Bids (live auctions on resale listings)

Types: `backend/lib/contracts/bids.ts`. Database: migration `20261017170000_listing_bids.sql`.
The storefront's `components/live-bid.tsx` already implements the client side.

- **Resale listings** can run as **live ascending auctions** (open high bid, anonymous bidders). **Drops** use sealed
  bids, which aren't in the API yet.
- A seller starts an auction on an **active** listing with no bids: start price ($1–$1,000) and duration (1–168 hours).
- **Minimum next bid:** the start price with no bids, otherwise high bid + max($1, 5% of the high bid rounded up to a
  whole dollar). Always show the server's `minNextCents`.
- **Anti-sniping:** a bid in the last 2 minutes resets the clock to 2 minutes. Poll the bids endpoint about every 5s.
- **Anonymous:** the viewer's bids say `"You"`; others say `"Bidder 1"`, `"Bidder 2"`... by first-bid order. No names or ids.
- Checkout is blocked (`409 listing_unavailable`) while an auction runs or after it ends with bids. An auction that
  ends with no bids is a normal fixed-price listing again.
- **Not built yet:** settlement (winning bid → order) and auction fields on feed/detail. Treat `400 not_an_auction`
  from `GET .../bids` as "fixed price".

```ts
type Auction = { listingId: string; startCents: number; highCents: number | null; bidCount: number;
                 minNextCents: number; endsAt: string; leading: boolean; ended: boolean };
type Bid = { amountCents: number; at: string; bidder: string }; // "You" | "Bidder N"
```

**`POST /api/listings/:id/auction`** 🔒 (seller only) `{ "startCents": 2000, "hours": 24 }` → `{ "auction": Auction }`.
Errors: `400 invalid_request`, `404 listing_not_found`, `409 listing_not_active`, `409 auction_has_bids`, `429 rate_limited`.

**`GET /api/listings/:id/bids`** 🔒 → `{ "auction": Auction, "bids": Bid[] }` (latest 20, newest first, own campus only).
Errors: `404 listing_not_found`, `400 not_an_auction`.

**`POST /api/listings/:id/bids`** 🔒 `{ "amountCents": 2100 }` → 201 `{ "auction": Auction, "bids": Bid[] }`.
Bidder and campus come from the session; other body fields are ignored.
Errors: `404 listing_not_found`, `400 not_an_auction`, `409 auction_ended`, `403 own_listing`,
`400 bid_too_low` (message names the minimum, e.g. "Bid $23 or more."; re-fetch and retry), `429 rate_limited`.

| Action | Limit |
|---|---|
| Start/re-time an auction | 20 / hour |
| Place a bid | 10 / minute per listing · 120 / hour overall |
