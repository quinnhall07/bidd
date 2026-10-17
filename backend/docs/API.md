# Bidd API (for the frontend)

Base URL: `http://localhost:3000` locally (Vercel URL later). All bodies are JSON. Shared Zod schemas and
TypeScript types live in [`lib/contracts/auth.ts`](../lib/contracts/auth.ts): copy or import them instead of
retyping shapes.

## Conventions

- **Auth:** after sign-in, send `Authorization: Bearer <accessToken>` on every call. No cookies.
- **Errors** always look like `{ "error": { "code": "school_not_supported", "message": "Bidd isn't at your school yet..." } }`.
  Show `message` to the user and branch on `code`.
- **CORS:** only origins in `FRONTEND_ORIGINS` (e.g. `http://localhost:3001`) may call the API from a browser.
- **The server owns the truth.** Campus, roles, prices, points and statuses are never taken from the client.
  Extra fields like `campus_id` in a body are ignored.
- **Tokens expire after 1 hour.** Refresh with `/api/auth/refresh` a little before `session.expiresAt` (Unix seconds).

## Sign-up / sign-in flow

1. `POST /api/auth/request-code` with the school email. The student gets a code by email.
2. `POST /api/auth/verify-code` with the email + code. You get a `session`.
3. `GET /api/me`. If `user.onboarded` is false, show onboarding.
4. `GET /api/organizations` for the chapter picker, then `POST /api/onboarding`.

New and returning students use the same two calls; there is no separate "sign up".

---

### `POST /api/auth/request-code`

```json
{ "email": "jdoe@crimson.ua.edu", "captchaToken": "<turnstile token, once CAPTCHA is on>" }
```

`200`
```json
{ "sent": true, "message": "Check your school inbox for a code. It expires in 10 minutes.",
  "campus": { "name": "The University of Alabama", "shortName": "Alabama" } }
```

| Status | `code` | When |
|---|---|---|
| 400 | `invalid_email` | Not a valid address |
| 400 | `school_not_supported` | Domain isn't an exact match for a Bidd campus (`crimson.ua.edu.evil.com` fails) |
| 400 | `captcha_failed` | Turnstile token missing/invalid (once CAPTCHA is enabled) |
| 429 | `rate_limited` | Too many requests, or asked again within 60 seconds |
| 503 | `email_delivery_unavailable` | Custom SMTP isn't set up yet |

Supported domains today: `crimson.ua.edu`, `ua.edu` (Alabama), `go.olemiss.edu`, `olemiss.edu` (Ole Miss).

### `POST /api/auth/verify-code`

```json
{ "email": "jdoe@crimson.ua.edu", "code": "123456" }
```

`200`
```json
{ "session": { "accessToken": "...", "refreshToken": "...", "expiresAt": 1792260000, "tokenType": "bearer" },
  "needsOnboarding": true }
```

Errors: `400 invalid_code` (wrong/expired), `429 rate_limited`, `403 school_not_supported`.

### `POST /api/auth/refresh`

```json
{ "refreshToken": "..." }
```
`200` → `{ "session": { ... } }` · `401 invalid_refresh_token` → send the user back to sign-in.

### `POST /api/auth/logout`  (Bearer)

`200` → `{ "ok": true }`. Drop the tokens client-side too.

### `GET /api/me`  (Bearer)

```json
{
  "user": { "id": "uuid", "email": "jdoe@crimson.ua.edu", "displayName": "Jamie", "role": "student", "onboarded": true },
  "campus": { "id": "uuid", "slug": "ua", "name": "The University of Alabama", "shortName": "Alabama",
              "conference": "SEC", "theme": { "name": "crimson", "primary": "#9E1B32", "secondary": "#828A8F", "accent": "#FFFFFF" } },
  "memberships": [ { "id": "uuid", "status": "pending", "role": "member", "requestedAt": "...",
                     "organization": { "id": "uuid", "name": "Kappa Delta", "kind": "sorority" } } ],
  "badges": [ { "id": "school_email_verified", "label": "School email verified" } ]
}
```

Theme the UI from `campus.theme`. Show the badge text exactly as given ("School email verified", not "verified student").

Errors: `401 unauthenticated` / `401 invalid_token` → sign in again; `403 account_suspended`.

### `GET /api/organizations`  (Bearer)

Chapters on the caller's campus only.
```json
{ "organizations": [ { "id": "uuid", "name": "Alpha Chi Omega", "nationalOrg": "Alpha Chi Omega", "kind": "sorority" } ] }
```

### `POST /api/onboarding`  (Bearer)

```json
{ "displayName": "Jamie", "organizationId": "uuid (optional)" }
```
`200` → `{ "ok": true, "chapterRequest": { "organizationId": "uuid", "status": "pending" } }`

Picking a chapter is a **request**: it shows as `pending` until an officer approves it. Can be called again to
change the display name.

Errors: `400 invalid_request` (name rules), `400 organization_not_found` (not a chapter on your campus),
`409 chapter_already_requested`.

### `GET /api/health`

`200 { "ok": true, "checks": { "env": "ok", "database": "ok" } }` or `503` with the failing check.

---

## Listings, photos and the campus feed

Shared schemas/types: [`lib/contracts/listings.ts`](../lib/contracts/listings.ts) (`LISTING_TAGS`, `LISTING_SIZES`,
`LISTING_CONDITIONS`, request schemas, response types). Every route below needs the Bearer token.

**Selling flow:** create a draft → upload 1–6 photos → `PATCH { "status": "active" }` to publish.

- Prices are **whole cents**, $1.00–$1,000.00 (`priceCents: 4500` = $45).
- Tags: `rush`, `bid_day`, `gameday`, `formal`. Sizes: `XXS`–`XXL`, `0`–`14`, `ONE_SIZE`.
  Conditions: `new_with_tags`, `like_new`, `good`, `fair`.
- Statuses: `draft` (only the seller sees it) → `active` (campus feed) → `reserved` / `sold` (set by checkout, Phase 3)
  or `removed`. The client can only set `active`, `draft` or `removed`.
- Photo URLs are **signed and expire after ~10 minutes**. Re-fetch the listing/feed instead of caching them.
- Everything is campus-locked: another school's listing is a `404`, even by ID.

### `GET /api/listings` — campus feed
Query: `tag`, `size`, `minPriceCents`, `maxPriceCents`, `limit` (1–48, default 24), `cursor`.
```json
{ "listings": [ { "id": "uuid", "title": "Gameday overalls", "priceCents": 4500, "size": "S", "condition": "like_new",
                  "tags": ["gameday"], "brand": null, "status": "active", "publishedAt": "...",
                  "coverUrl": "https://...signed...", "seller": { "id": "uuid", "displayName": "Jamie" } } ],
  "nextCursor": "opaque-string-or-null" }
```
Next page: same query plus `cursor=<nextCursor>`. `null` means the end.

### `POST /api/listings` — create a draft
```json
{ "title": "Crimson rush dress", "description": "Worn once", "brand": "Lulus",
  "priceCents": 4500, "size": "S", "condition": "like_new", "tags": ["rush"] }
```
`201` → `{ "listing": ListingDetail }`. Errors: `400 invalid_request`, `429 rate_limited` (20/hour).

### `GET /api/listings/:id`
`200` → `{ "listing": ListingDetail }` (adds `description`, `photos[]`, `isOwner`, `createdAt`, `updatedAt`). `404 listing_not_found`.

### `PATCH /api/listings/:id` — seller only
Any subset of the create fields, plus `status`: `"active"` (publish), `"draft"` (unpublish) or `"removed"`.
Errors: `404 listing_not_found` (not yours), `409 listing_needs_photo`, `409 listing_locked` (reserved/sold/removed).

### `POST /api/listings/:id/media` — upload one photo (seller only)
`multipart/form-data` with the file in field **`photo`**. JPEG, PNG or WebP, max **4 MB**, max **6 per listing**.
The server re-encodes it to WebP (max 1600px) and **strips all metadata, including GPS location**.
```js
const form = new FormData();
form.append("photo", file);
await fetch(`${API}/api/listings/${id}/media`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
```
`201` → `{ "photo": { "id", "position", "url", "width", "height" } }`.
Errors: `400 invalid_image`, `413 photo_too_large`, `409 too_many_photos`, `429 rate_limited` (60/hour).

### `DELETE /api/listings/:id/media/:photoId` — seller only
`200 { "ok": true }`. `409 listing_needs_photo` if it's the last photo of a published listing.

### `GET /api/me/listings`
The caller's listings, drafts included: `{ "listings": ListingSummary[] }`.

---

## Checkout, orders and the meetup handoff (pilot: no payments)

Shared types: [`lib/contracts/orders.ts`](../lib/contracts/orders.ts). **No money is collected.** Every order has
`payment: { collected: false, message: "Payments aren't available yet. Pay the seller in person at the meetup." }`
(also exported as `PAYMENT_NOTICE`). Show that message on the Buy screen.

**Flow:** Buy → listing becomes `reserved`, order `pending_meetup` → students meet on campus → buyer opens
"Show QR" → seller scans it → order `completed`, listing `sold`. Either side can cancel before the meetup.

### `POST /api/checkout`
`{ "listingId": "uuid" }` → `201 { "order": Order }`. Price and the buyer fee (5% + $0.50, display only) come from the server.
Errors: `404 listing_not_found` (incl. other campuses), `409 listing_unavailable` (already claimed), `409 cannot_buy_own_listing`.

### `GET /api/orders`
`{ "orders": Order[] }`: orders where you're the buyer or seller. `Order.role` is `"buyer"` or `"seller"`.

### `POST /api/orders/:id/cancel`
Buyer or seller, while `pending_meetup`. The listing goes back to `active`. `409 order_not_open` after completion.

### `POST /api/orders/:id/handoff-token` (buyer only)
`200 { "qrPayload": "bidd:handoff:...", "expiresAt": "..." }`. Render `qrPayload` as a QR code. It's single use,
expires in 15 minutes, and asking again revokes the previous one.

### `POST /api/handoffs/confirm` (seller only)
`{ "token": "<scanned qrPayload>" }` → `200 { "ok": true, "orderId": "uuid" }`.
Errors: `400 invalid_handoff` (bad token, or you're not this order's seller), `409 handoff_already_used`, `410 handoff_expired`.

---

## Closet Cup, chapters, reports and blocks

Shared types: [`lib/contracts/community.ts`](../lib/contracts/community.ts).

### `GET /api/cup`
Aggregates only (no buyers or sellers):
```json
{ "campus": { "id": "uuid", "name": "The University of Alabama",
              "standings": [ { "rank": 1, "organizationId": "uuid", "name": "Kappa Delta", "kind": "sorority", "points": 40, "sales": 4 } ] },
  "conference": [ { "rank": 1, "campusId": "uuid", "name": "...", "shortName": "Alabama", "points": 120, "sales": 12, "isYourCampus": true } ] }
```
Scoring: each completed QR handoff gives **10 points** to the seller's **approved** chapter. Pending requests don't score.

### Chapter officers
- `GET /api/chapter/requests`: pending join requests for chapters where you're an approved officer (empty otherwise).
- `POST /api/chapter/requests/:id` `{ "approve": true | false }` → `200`. `404 request_not_found` if you're not an officer
  of that chapter, `409 request_not_pending` if already decided.

**Making the first officer** (run once per chapter in the Supabase SQL editor, after that person picked the chapter in onboarding):
```sql
update public.organization_memberships
   set status = 'active', role = 'officer', decided_at = now()
 where user_id = (select id from public.profiles where email = 'officer@crimson.ua.edu');
```

### `POST /api/listings/:id/report`
`{ "reason": "prohibited_item" | "scam_or_fraud" | "offensive" | "wrong_item" | "other", "details": "optional, ≤500 chars" }`
→ `200 { "ok": true, "hidden": false }`. One report per student per listing; **3 different students hide it**.
Errors: `404` (not your campus), `409 cannot_report_own_listing`.

### Blocks
`GET /api/blocks` → `{ "blockedUserIds": [] }` · `POST /api/blocks { "userId": "uuid" }` · `DELETE /api/blocks/:userId`.
Blocked sellers' listings disappear from your feed. Use `listing.seller.id` from the feed.

### `POST /api/admin/listings/:id/remove` (campus admins)
Admins are set in the database (`profiles.role = 'admin'`), never by the client. Only works on the admin's own campus.

---

## Testing without the product UI

`http://localhost:3000/dev` is a bare click-through of the whole flow (hidden on the production deployment).

---

## Bids (live auctions on resale listings)

Shared types: [`lib/contracts/bids.ts`](../lib/contracts/bids.ts). Needs migration `20261017170000_listing_bids.sql`.
The storefront's `components/live-bid.tsx` already speaks this contract.

A listing is an auction while it has an end time. Bids are open (everyone on the campus sees the high bid) and
**anonymous**: your own bids show as `"You"`, everyone else's as `"Bidder 1"`, `"Bidder 2"`... numbered by when each
other bidder first bid on that listing. Names, emails and ids are never returned. (Drops use sealed bids, which are
not part of this API yet.)

```ts
type Auction = { listingId: string; startCents: number; highCents: number | null; bidCount: number;
                 minNextCents: number; endsAt: string; leading: boolean; ended: boolean };
type Bid = { amountCents: number; at: string; bidder: string }; // "You" | "Bidder N"
```

- **Minimum next bid** = `startCents` with no bids, otherwise `highCents + max($1, 5% of highCents rounded up to a
  whole dollar)`. Always show `minNextCents` from the server; the database enforces it.
- **Anti-sniping:** a bid in the last 2 minutes moves `endsAt` to 2 minutes after that bid. Poll `GET .../bids`
  (about every 5 seconds) while the page is open.
- `leading`: you hold the high bid. `ended`: the clock ran out or the listing is no longer active.
- While an auction is running, or after it ended with bids, `POST /api/checkout` on that listing answers
  `409 listing_unavailable`. An auction that ended with **no** bids is a normal fixed-price listing again (or the
  seller can start a new auction).
- **Not built yet:** turning the winning bid into an order (settlement), and auction fields on the feed/detail
  responses. Until then, call `GET .../bids` and treat `400 not_an_auction` as "fixed price".

### `POST /api/listings/:id/auction` — seller only
`{ "startCents": 2000, "hours": 24 }` (start $1–$1,000, 1–168 hours) → `200 { "auction": Auction }`.
Only on an **active** listing with **no bids yet**; calling it again re-times an auction nobody has bid on.
Errors: `400 invalid_request`, `404 listing_not_found` (not yours, or another campus), `409 listing_not_active`,
`409 auction_has_bids`, `429 rate_limited` (20/hour).

### `GET /api/listings/:id/bids`
→ `200 { "auction": Auction, "bids": Bid[] }`: the latest 20 bids, newest first. Own campus only.
Errors: `404 listing_not_found`, `400 not_an_auction`.

### `POST /api/listings/:id/bids`
`{ "amountCents": 2100 }` → `201 { "auction": Auction, "bids": Bid[] }` (same shape as `GET`, including your bid).
Bidder and campus come from your session; any other fields in the body (`bidder_id`, `campus_id`, ...) are ignored.

| Status | `code` | When |
|---|---|---|
| 404 | `listing_not_found` | Missing, removed, or another campus's listing |
| 400 | `not_an_auction` | Fixed-price listing |
| 409 | `auction_ended` | The clock ran out, or the listing was reserved/sold |
| 403 | `own_listing` | You're the seller |
| 400 | `bid_too_low` | Below `minNextCents`. `message` names the minimum ("Bid $23 or more."); re-`GET` and retry |
| 429 | `rate_limited` | More than 10 bids a minute on one listing, or 120 an hour overall |

```json
{ "auction": { "listingId": "uuid", "startCents": 2000, "highCents": 2100, "bidCount": 2, "minNextCents": 2300,
               "endsAt": "2026-10-18T18:00:00.000Z", "leading": true, "ended": false },
  "bids": [ { "amountCents": 2100, "at": "2026-10-17T18:02:11.000Z", "bidder": "You" },
            { "amountCents": 2000, "at": "2026-10-17T17:58:40.000Z", "bidder": "Bidder 1" } ] }
```
