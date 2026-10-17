# Bidd security model

Short version: **the verified email decides the campus, the database enforces it, and the server owns everything
worth stealing.** Each rule below is covered by `npm run test:security` (54 tests against the real database).

## Identity
- Sign-in is a 6-digit email code (no passwords, no magic links: school mail scanners "click" links and burn them).
- Only **exact** allowlisted domains are accepted (`crimson.ua.edu` yes; `x.crimson.ua.edu` and
  `crimson.ua.edu.evil.com` no). Checked in the API, in a Supabase Before-User-Created hook, and again by
  `provision_user`, which refuses to give any other address a profile or campus.
- Code requests: Cloudflare Turnstile CAPTCHA, per-email and per-IP rate limits (Postgres counters, hashed bucket
  keys, fail closed), and the same response whether or not an account exists.
- Every API request re-validates the Bearer token with Supabase Auth and re-checks the account in the database
  (active, campus active, email still on that campus's domain).
- The badge says **"School email verified"**: a code proves mailbox access, not enrollment.

## Data access
- **Row-level security is on for every table and denies by default.** Students only ever get `SELECT` policies:
  their own profile/orders/blocks, and their own campus's chapters and published listings.
- Server-only tables have RLS on with **no** policies (Supabase's advisor lists these as "RLS Enabled No Policy";
  that's intentional): email domains, audit log, rate limits, handoff tokens, Cup events, reports.
- All writes go through the API with the secret key, or through `SECURITY DEFINER` functions that only
  `service_role` can execute. Triggers keep listings and chapter memberships on the owner's verified campus.
- Another campus's listing, order or chapter returns the same `404` as one that doesn't exist.

## Server-owned values
Campus, seller, price, fees, order status, roles, chapter status and Cup points are computed or set by the server.
Request bodies are validated with Zod and unknown fields (e.g. a forged `campus_id`) are dropped.

## Photos
Server-side upload only: real file type checked from the bytes, 4 MB cap, re-encoded to WebP (max 1600px) with **all
EXIF/GPS metadata removed**. Stored in a private bucket; clients get 10-minute signed URLs and can't read or write
storage directly.

## Sales and the Closet Cup
- Checkout locks the listing row, so an item can't be bought twice. The pilot collects no payment.
- The meetup QR token is 256 bits, stored only as a SHA-256 hash, single use, expires in 15 minutes, and only the
  order's seller can redeem it. Issuing a new one revokes the old one.
- Cup points are awarded inside the same database transaction as the handoff, at most once per order, and only to a
  chapter the seller was **approved** into by an officer.

## Secrets
- Secrets live in `backend/.env.local` (git-ignored) and, later, in Vercel's environment settings.
- The Resend key and Turnstile secret live only inside Supabase's dashboard.
- `NEXT_PUBLIC_*` values are shipped to browsers; never put a secret behind that prefix.
- `DEMO_MODE=true` refuses to start on the production deployment.

## Known pilot limits
- Two friends could trade the same item back and forth to farm Cup points. Mitigations for later: cap points per
  buyer-seller pair, or require distinct buyers.
- Auto-hide after 3 reports has no restore flow yet; an admin would fix the row in the database.
- Access tokens stay valid until they expire (max 1 hour) after logout; the refresh token is revoked immediately.
