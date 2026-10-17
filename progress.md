# Bidd — Backend Progress

> **Read this file first at the start of every work session.** It is the single source of truth for what is done, what is in progress, and what is next.
> Source docs: `Bidd_Backend_Gameplan.md`, `vision.md`, `build.md` (in Rouan's Downloads).

**Date:** 2026-10-17 · **Submission:** 5:00 PM sharp · **Feature freeze:** 3:00 PM · **No merges to `main` after 4:15 without Rouan**

**Today's goal:** a working, deployed app where a student signs up with their school `.edu` email, verifies it with a one-time code, and sets up their account (campus is derived from the email, never chosen). Everything else stacks on top of that.

---

## Who owns what

| Person | Owns |
|---|---|
| **Rouan + Claude** | `backend/`: database, RLS, auth/verification, API routes, payments, QR, security, deploy |
| **Quinn** | `frontend/`: all real UI. Builds against the API contract in `backend/docs/API.md` |
| **Rowan** | Brand kit, seed content sheet, pitch, submission form |

---

## Architecture (decided)

```
BiddApp/
├── progress.md            ← this file
├── backend/               ← Next.js (App Router, TypeScript) — API only + a bare /dev test UI
│   ├── app/api/...        ← every business operation lives here
│   ├── app/dev/...        ← ugly test pages for us to click through (NOT the product UI)
│   ├── lib/supabase/      ← browser / server / admin (secret-key) clients, kept separate
│   ├── lib/contracts/     ← Zod schemas + TS types shared with Quinn
│   ├── lib/security/      ← rate limits, origin checks, auth guards
│   ├── supabase/migrations/  ← schema + RLS + functions (source of truth, no dashboard-only changes)
│   ├── supabase/seed.sql  ← synthetic demo data only
│   └── docs/              ← API.md (for Quinn), KEYS.md (setup), SECURITY.md
└── frontend/              ← Quinn's app (added by Quinn)
```

**How Quinn's frontend talks to the backend:**
- Frontend signs in through our API (`/api/auth/request-code`, `/api/auth/verify-code`). The backend returns the Supabase session.
- Every other call sends `Authorization: Bearer <access_token>`. The backend validates the token server-side on every request, then re-checks account status and campus membership in the database.
- Bearer tokens (not cookies) mean no CSRF surface and no cross-site cookie headaches. CORS only allows our own frontend origins.
- Quinn never gets the Supabase secret key. RLS is the real security boundary, so even a direct Supabase call from the browser can't read another campus's data.

**Security rules we never break:**
1. Campus comes from the **verified email domain** on the server. A `campus_id` in a request body is ignored.
2. Only exact allowlisted domains get in (`crimson.ua.edu` yes; `crimson.ua.edu.evil.com` no). Enforced at the Supabase Auth boundary (Before-User-Created hook), not just in the UI.
3. Every table has RLS on, deny by default. Secret key is only used server-side for privileged steps.
4. Prices, fees, seller, points, verification flags, roles are computed/owned by the server. Never trusted from the client.
5. No secrets in git, no secrets in chat. `.env.local` only; Vercel env vars for deploys.
6. Demo/impersonation login exists only when `DEMO_MODE=true` and never on the production deployment.
7. Badge reads **"School email verified"**, not "verified student".

---

## Task list

Status: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (reason noted)

### Phase 0 — Setup (target: by ~12:00)
- [x] Plan written, `progress.md` created
- [x] `backend/` folder, `.gitignore`, `.env.example`, `docs/KEYS.md`, `docs/OVERVIEW.md` (big picture)
- [x] `backend/supabase/` initialized (`config.toml`: 6-digit codes, 10-min expiry, 60s resend; `migrations/` ready)
- [x] Git author set to Rouan for this repo
- [x] GitHub repo connected: https://github.com/rowanhallua-bit/HB0001-contestant (`main` pushed)
- [ ] **Rouan:** add Quinn as collaborator, turn on 2FA
- [x] **Rouan:** create Supabase project (`xanamvujsuckcypoaavd`), put keys in `backend/.env.local`
- [x] Scaffold Next.js 16 + TypeScript in `backend/`, `@supabase/supabase-js`, `zod` (`@supabase/ssr` dropped: Bearer tokens, no cookies)
- [x] `GET /api/health` works locally (reports env + database status)
- [!] Deploy skeleton to Vercel (root directory = `backend`) — **on hold**: Rouan's Vercel plan doesn't cover collaborative projects; testing locally for now

### Phase 1 — Sign-up, verification, account setup (P0, top priority, target: ~1:30)
- [x] Migration 001 applied (`supabase/migrations/20261017130000_identity_and_campus.sql`): `campuses`, `campus_email_domains`, `profiles`, `campus_memberships`, `organizations`, `organization_memberships`, `audit_events`, `private.rate_limits` — RLS on everything, deny by default, SELECT-only policies
- [x] Seed applied (`supabase/seed.sql`): UA (crimson) + Ole Miss (red/blue), 4 domains, 8 chapters each
- [x] Before-User-Created hook `public.hook_before_user_created` enabled. Note: the admin API skips it, so `provision_user` is the real wall — a look-alike account gets no profile, no campus, no data (tested)
- [x] Email templates ("Magic Link" + "Confirm signup") show the code `{{ .Token }}`
- [x] `POST /api/auth/request-code` — normalize email, exact-domain check, rate limit, same response for new/existing accounts
- [x] `POST /api/auth/verify-code` — verify OTP, provision account, return session (+ `POST /api/auth/refresh`)
- [x] First verified login creates `profile` + `campus_membership` from the verified email (`provision_user`, service_role only)
- [x] `GET /api/me` — profile, campus + theme, memberships, "School email verified" badge
- [x] `POST /api/onboarding` — display name + chapter **request** (pending) · `GET /api/organizations` for the picker
- [x] `POST /api/auth/logout`
- [x] Rate limits on code requests/verification (per email + per IP, hashed buckets, Postgres counters, fail closed)
- [ ] Custom SMTP via Resend so codes reach real school inboxes  **← critical path, needs a domain**
- [x] Turnstile CAPTCHA on in Supabase; `/dev` sends the token and the API passes it through. Quinn's sign-in screen must send `captchaToken` too
- [x] `/dev` test UI: email → code → me → onboarding → refresh/logout
- [x] Security tests written (`npm run test:security`): unsupported + look-alike domains, hook, wrong code, bad/tampered tokens, forged `campus_id`/role, cross-campus reads by ID, self-edits of role/campus/chapter status, privileged RPCs, anon reads, bad origin. **17/17 security tests + 4/4 unit tests pass against the real project**
- [x] `docs/API.md` auth section + shared Zod types in `lib/contracts/auth.ts` for Quinn

### Phase 2 — Listings & feed (target: ~2:15)
- [x] Migration 002 applied (`supabase/migrations/20261017143000_listings_and_media.sql`): `closets`, `listings`, `listing_media`, private `listing-media` bucket. RLS: own campus only, drafts seller-only, SELECT-only; triggers pin listings to the seller's campus and cap 6 photos
- [x] Server-side photo upload (magic-byte check, 4 MB cap, re-encode to WebP ≤1600px, all EXIF/GPS stripped), 10-minute signed URLs
- [x] `GET /api/listings` (filters: tag, size, price range; cursor pagination), `GET /api/listings/:id`, `GET /api/me/listings`
- [x] `POST /api/listings`, `PATCH /api/listings/:id` (publish needs a photo; sold/reserved server-only), `POST/DELETE` photos
- [x] `/dev` Sell + Campus feed sections; `docs/API.md` listings section; `lib/contracts/listings.ts`
- [x] Listing security tests (`tests/security/listings.test.mjs`): **full suite 33/33 green** against the real project
- [ ] `POST /api/ai-listing` — deferred (no Anthropic key)
- [ ] Seed listings from Rowan's sheet — waiting on the sheet

### Phase 3 — Buy + QR handoff — **light pilot version, no payments, nothing external connected**
- [x] Migration 003 applied (`supabase/migrations/20261017153000_orders_and_handoffs.sql`): `orders`, `private.handoff_tokens` (hashes only), locked state-change functions (`create_order`, `create_handoff_token`, `confirm_handoff`, `cancel_order`), RLS buyer/seller-only
- [x] `POST /api/checkout` — reserves the listing atomically; server price + display-only buyer fee (5% + $0.50); `payment.collected: false` with the "pay in person" notice
- [x] `GET /api/orders`, `POST /api/orders/:id/cancel` (listing goes back on the feed)
- [x] `POST /api/orders/:id/handoff-token` (buyer, single use, 15 min, older tokens revoked), `POST /api/handoffs/confirm` (seller only) → order completed, listing sold
- [x] `/dev` Buy buttons + Orders/handoff section; `docs/API.md` checkout section; `lib/contracts/orders.ts`
- [x] Order security tests (`tests/security/orders.test.mjs`): **full suite 44/44 green**
- [ ] Post-pilot: Stripe Checkout + webhook, chapter closet access codes + drops

### Phase 4 — Closet Cup & moderation (light)
- [x] Migration 004 applied (`supabase/migrations/20261017160000_cup_and_moderation.sql`): `cup_events`, `reports`, `blocks`; `confirm_handoff` now awards 10 pts to the seller's **approved** chapter (once per order); aggregate standings functions; officer approval + report functions
- [x] `GET /api/cup` — campus chapter standings + conference campus totals, aggregates only
- [x] Chapter officers: `GET /api/chapter/requests`, `POST /api/chapter/requests/:id` (first officer via SQL snippet in `docs/API.md`)
- [x] `POST /api/listings/:id/report` (3 different students → auto-hidden), blocks (`/api/blocks`, feed hides blocked sellers), `POST /api/admin/listings/:id/remove` (campus admins)
- [x] Per-IP sign-in limits loosened for campus Wi-Fi (per-email limits unchanged)
- [x] `/dev` Cup, report/block buttons, officer section; `docs/API.md`; `lib/contracts/community.ts`
- [x] Community security tests (`tests/security/community.test.mjs`): **full suite 54/54 green**, no test data left behind
- [x] Final security pass: Supabase Security Advisor 0 errors (1 warning = leaked-password check, n/a: no passwords; 6 notes = intentional server-only tables); git history scanned, no secrets in any commit; `DEMO_MODE` can't start in production

### Phase 5 — Ship (light: no hosting yet)
- [x] README for judges/teammates (features, local run, migration order, tests, architecture)
- [x] `backend/docs/SECURITY.md` (security model + known pilot limits), `backend/docs/LAUNCH.md` (going-live checklist)
- [!] Vercel deploy, phone smoke test on the public URL — **deferred** (hosting/keys "for another day", see `LAUNCH.md`)
- [x] Migration 005 applied (`supabase/migrations/20261017170000_listing_bids.sql`, unchanged): `listing_bids` (service_role SELECT only), `start_listing_auction`, `place_listing_bid`, auction-aware `create_order`. Grants checked: all three functions service_role-only
- [~] `bidd-api` Vercel project (team `quinn-halls-projects`) created + linked from `backend/`; production env: Supabase URL, publishable key, `FRONTEND_ORIGINS`, `DEMO_MODE=false`
- [ ] **Quinn/Rouan:** `SUPABASE_SECRET_KEY` (dashboard → Settings → API keys) and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` on `bidd-api`; add `bidd-sage.vercel.app` to the Turnstile widget (CAPTCHA is on, so live sign-in fails without it)
- [x] First production deploy: https://bidd-api.vercel.app (build ok; `/api/health` = `env: error` until the secret key is set). `APP_BASE_URL` set
- [ ] Redeploy `bidd-api` after the keys, `/api/health` ok, `npm run test:security` (needs `backend/.env.local` with the secret key)
- [ ] `NEXT_PUBLIC_BIDD_API_URL` on `bidd`, storefront session redeploys

---

## Decisions log
- **2026-10-17** — Backend is its own Next.js app in `backend/`; Quinn's UI in `frontend/` calls it with Bearer tokens.
- **2026-10-17** — Allowed domains to start: `crimson.ua.edu`, `ua.edu` (UA); `go.olemiss.edu`, `olemiss.edu` (Ole Miss). Any other `.edu` gets "your school isn't on Bidd yet". Adding a school = one row in `campuses` + rows in `campus_email_domains`.
- **2026-10-17** — Email OTP code (not magic links): school email scanners often "click" links and burn them.
- **2026-10-17** — One Supabase project for today (hackathon). Demo login gated by `DEMO_MODE` and off in production.

- **2026-10-17** — Vercel hosting on hold (plan doesn't support collaborative projects). Develop and test on `localhost:3000`; GitHub is for code only.
- **2026-10-17** — Phases 3–5 are built "light": no API keys, no external services (no Stripe, no AI, no deploy). Phase 3 = pilot checkout that reserves the item and completes via a one-time QR handoff at the meetup; no money moves, every order says "pay in person". The QR handoff replaces a manual "Mark as sold", so sellers can't fake sales for Closet Cup points.
- **2026-10-17** — Local Node 22 on Rouan's machine via fnm + `node22.cmd` launcher (system Node 12 can't be removed without admin).
- **2026-10-17** — Live backend uses Rouan's project `xanamvujsuckcypoaavd` (Option A in `handoff/SUPABASE_SESSION.md`). Migrations 001–004 were pasted into the SQL editor, so the project's migration history lists only `listing_bids` (005).
- **2026-10-17** — Advisors after 005: security 0 errors (leaked-password warning n/a, codes not passwords; `listing_bids` joins the intentional no-policy, server-only tables). Performance: `listing_bids.campus_id` FK left unindexed like the other campus FKs (campuses are never deleted); "unused index" notes are expected with no traffic yet.
- **2026-10-17** — Backend hosted on Quinn's Vercel team as `bidd-api` (separate project from the storefront `bidd`).

## Blockers / waiting on Rouan
- Future migrations: paste into the Supabase SQL editor (the Supabase connector is signed in to a different account)
- Quinn added as collaborator on the repo
- A domain for Resend (needed to email codes to real `.edu` inboxes) — see `backend/docs/KEYS.md`

## Session log
- **~11:30** — Read gameplan/vision/build. Wrote this plan, created `backend/` with keys guide and env template. Waiting on GitHub repo + Supabase keys to start Phase 0 scaffolding.
- Connected git to https://github.com/rowanhallua-bit/HB0001-contestant and pushed the plan to `main`. Next: Supabase keys → scaffold Next.js in `backend/`.
- **~11:50** — Commit author fixed to Rouan (history rewritten + force-pushed while repo was fresh). Created `backend/supabase/`, wrote `docs/OVERVIEW.md`. Waiting on Rouan's go-ahead on the big picture.
- **~1:30** — Backend skeleton built: Next.js 16 API, env validation, Supabase clients, CORS proxy, rate limits, auth guard, all Phase 1 routes, `/dev` page, migration 001 + seed, security + unit tests, `docs/API.md`. Typecheck + production build pass; `/api/health` OK against the real project (database `not_migrated` until the SQL is applied). Next: apply SQL → dashboard switches → `npm run test:security` → real code email test.
- **~1:50** — Rouan applied migration 001 + seed, enabled the hook, code email templates and CAPTCHA. Security suite 17/17 green. Remaining for Phase 1: real inbox test (Resend SMTP, or invite own .edu to the Supabase team), push branch + PR for Quinn.
- **~2:40** — Phase 1 done end to end with a real `@crimson.ua.edu` inbox: Resend domain `bidd.day` verified, "Confirm sign up" template switched to the code (it still had the default link, which also tripped UA's spam filter). PR #1 open.
- **~2:45** — Phase 2 built on `rouan/listings`: migration 002, listing/photo/feed routes, `/dev` sell + feed, tests, docs. Typecheck + build pass. Waiting on migration 002 to run the listing tests.
- **~3:00** — Migration 002 applied; security suite 33/33 green (17 auth + 16 listings); no test leftovers. Phase 3 skipped for the pilot. Next: Phase 4 (Closet Cup + "Mark as sold", reports).
- **~3:05–3:45** — Phases 3–5 built light (no keys, nothing external): pilot checkout + QR handoff (migration 003), Closet Cup + officer approvals + reports + blocks + admin removal (migration 004), README/SECURITY/LAUNCH docs. All 4 migrations applied; **54/54 security tests**, 4/4 unit tests, build green. Branches stacked: `rouan/backend-skeleton` (PR #1) → `rouan/listings` (PR #2) → `rouan/orders` → `rouan/cup-and-moderation`.
- **~4:45** — Supabase session (Quinn's machine): migration 005 applied as written, grants verified, advisors run (see decisions). Created `bidd-api` on Vercel with the non-secret env vars and a first production deploy. Live mode not switched on before the 5:00 submission: it still needs the secret key, the Turnstile site key + hostname, and a storefront redeploy. Submission runs on mock data.
