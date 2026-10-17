# Supabase session handoff: make Bidd's backend live

> **For the Claude Code session that sets up Supabase.** Written 2026-10-17 by the session that built the storefront.
> That session is still running and owns `storefront/`. You own `backend/` and the Supabase project.

## Opening prompt (paste this into the new session)

```
Read C:\Users\danie\GitHub\bidd\handoff\SUPABASE_SESSION.md and do it end to end.
Use Option ___ (A = Rouan's existing project, B = my own new Supabase project).
Ask me only for things you can't do yourself (dashboard toggles, logins, keys).
```

Start Claude Code in `C:\Users\danie\GitHub\bidd`. That folder has the Supabase MCP server config (`.mcp.json`)
and the Supabase agent skills (`.agents/skills/supabase`). Load the `supabase` and `supabase-postgres-best-practices`
skills before touching the database.

---

## 1. Goal

Today the deployed site, https://bidd-sage.vercel.app (custom domain **https://bidd.day** once its DNS records are in; Vercel project `bidd`, team `quinn-halls-projects`), runs on
**mock data**. Every storefront call already has a live path that turns on when `NEXT_PUBLIC_BIDD_API_URL` is set,
and falls back to mock if the API fails. Your job:

1. A Supabase project with every migration applied and the auth settings configured.
2. The backend deployed as a **second Vercel project, `bidd-api`**, with its env vars.
3. The storefront project `bidd` pointed at it (`NEXT_PUBLIC_BIDD_API_URL`), then redeployed.
4. Proof that it works: health check, security tests and the Supabase advisors.

Submission is today. If something looks like more than ~30 minutes of work, stop and tell Quinn. The mock site is the safe fallback.

## 2. Where things are

| What | Path |
|---|---|
| Git source of truth | `C:\Users\danie\GitHub\HB0001-contestant`, branch **`quinn/merge`** (remote: `rowanhallua-bit/HB0001-contestant`) |
| Backend (you own this) | `C:\Users\danie\GitHub\HB0001-contestant\backend` |
| Final deploy folder (storefront, owned by the other session) | `C:\Users\danie\GitHub\bidd` |
| Backend contract for frontends | `handoff/BACKEND_BRIEF.md`, `backend/docs/API.md`, `backend/lib/contracts/*.ts` |
| Keys guide / launch checklist / security model | `backend/docs/KEYS.md`, `backend/docs/LAUNCH.md`, `backend/docs/SECURITY.md` |
| History and decisions | `progress.md` (repo root) |

**File ownership (avoids clobbering the other session):**
- You edit only `HB0001-contestant/backend/**` and `progress.md`. Don't edit `storefront/`, `mock/` or `brand/`, in either folder.
- The other session syncs `storefront/`, `mock/` and `brand/` into `bidd/` and no longer copies `backend/`. When you're done, tell Quinn,
  and the other session will copy the final `backend/` into `bidd/`.
- Don't commit or push unless Quinn asks. Never commit `.env*` files. Never print secret values in chat or logs.

## 3. Migrations (apply in this order)

All in `backend/supabase/migrations/`, then `backend/supabase/seed.sql`:

1. `20261017130000_identity_and_campus.sql`: campuses, email domains, profiles, memberships, orgs, audit, rate limits, the `hook_before_user_created` function, `provision_user`
2. `20261017143000_listings_and_media.sql`: closets, listings, listing_media, private `listing-media` bucket
3. `20261017153000_orders_and_handoffs.sql`: orders, QR handoff tokens, `create_order`
4. `20261017160000_cup_and_moderation.sql`: Closet Cup, chapter approvals, reports, blocks
5. `20261017170000_listing_bids.sql`: **new today and never run against a database.** Live ascending bids: `listing_bids`,
   `start_listing_auction`, `place_listing_bid`, and a redefined `create_order` that blocks buying an auction at list price.
   Expect possible small SQL fixes; fix them in the file, keep the security properties (row lock, campus check,
   service_role-only execute, no client writes to `listing_bids`) and note what you changed.

Seed: UA (`crimson.ua.edu`, `ua.edu`) and Ole Miss (`go.olemiss.edu`, `olemiss.edu`), with 8 chapters each. Only these exact domains can sign in.

## 4. Option A: Rouan's existing project (`xanamvujsuckcypoaavd`), preferred

Migrations 1–4, the seed, the hook, the email templates, Turnstile CAPTCHA and Resend SMTP (domain `bidd.day`) are **already done** there.
1. Quinn needs access to Rouan's Supabase org. Then run `/mcp` → supabase → Authenticate (already configured for this ref).
2. Apply **only migration 5** (`apply_migration`), then run `get_advisors` (security + performance) and fix anything new.
3. Keys: `NEXT_PUBLIC_SUPABASE_URL` and the publishable key come from MCP (`get_project_url`, `get_publishable_keys`). The **secret key**
   (`sb_secret_...`) comes from the dashboard (Settings → API keys); Quinn or Rouan pastes it into the env file and Vercel themselves.
4. **Turnstile:** the hostnames `bidd.day`, `www.bidd.day` and `bidd-sage.vercel.app` must be added to Rouan's Cloudflare Turnstile widget, or live sign-in fails
   with `captcha_failed`. Only Rouan can do that. The site key is `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public, same value as the backend's).

## 5. Option B: Quinn's own new Supabase project

1. Create a project on the **Free** plan (supabase.com/dashboard). Don't enable anything paid.
2. Point MCP at it: `claude mcp add --scope local --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<NEW_REF>&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching"`
   (remove the old local entry first with `claude mcp remove supabase -s local`), then `/mcp` → Authenticate. A restart may be needed.
3. Apply migrations 1→5 with `apply_migration` (one call per file, using the file name as the migration name), then run `seed.sql` with `execute_sql`.
4. Dashboard toggles (Quinn clicks these; give exact paths):
   - **Auth → Hooks:** enable **Before User Created** → Postgres function `public.hook_before_user_created`.
   - **Auth → Email templates:** "Magic Link" **and** "Confirm signup" must show the code `{{ .Token }}`, not a link. The subject is `Your Bidd code: {{ .Token }}`.
   - **Auth → Providers → Email:** OTP length 6, expiry 600 seconds (matches `backend/supabase/config.toml`).
   - **CAPTCHA:** leave it **off**. The backend only passes the token along, and the storefront only renders Turnstile when
     `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set, so leave that unset in both projects.
5. **Email delivery caveat:** Supabase's built-in email only reaches **members of the Supabase team** and is limited to a few per hour. For the demo,
   invite the presenter's own `@crimson.ua.edu` address to the Supabase org. Real school-inbox delivery needs custom SMTP (Resend), which is out of scope today.
6. Run `get_advisors` (security + performance) and fix anything flagged.

## 6. Deploy the backend to Vercel (both options)

From `C:\Users\danie\GitHub\HB0001-contestant\backend` (Vercel CLI is installed and logged in as `quinnhall07`):
```
vercel project add bidd-api
vercel link --yes --project bidd-api
vercel project update bidd-api --framework nextjs --node-version 24.x --yes
```
Env vars for **production** on `bidd-api` (pipe values through stdin, `--sensitive` for secrets, never `--value` with a secret):
| Var | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` (**sensitive**; Quinn adds it via the dashboard if you can't get it safely) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Option A only |
| `APP_BASE_URL` | the `bidd-api` production URL |
| `FRONTEND_ORIGINS` | `https://bidd.day,https://www.bidd.day,https://bidd-sage.vercel.app,http://localhost:3001` |
| `DEMO_MODE` | `false` (the app refuses to start in production otherwise) |

Then run `vercel deploy --prod --yes` and check that `GET https://<bidd-api>/api/health` returns `{"ok":true,"checks":{"env":"ok","database":"ok"}}`.

For local testing, create `backend/.env.local` (git-ignored) with the same values and run `npm install && npm run test:security`. The suite should
pass, including the new `tests/security/bids.test.mjs`. Report the pass count.

## 7. Point the storefront at it

On Vercel project **`bidd`** (production):
- `NEXT_PUBLIC_BIDD_API_URL` = the `bidd-api` production URL
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = Option A only

`NEXT_PUBLIC_*` values are baked in at build time, so `bidd` must be **redeployed** afterwards. **Don't redeploy `bidd` yourself.** Tell Quinn
"backend live, env set". The storefront session redeploys after syncing its latest code (or use `SendMessage` to that session if it's listed in `ListAgents`).

What the storefront does in live mode (already built; read-only for you): `storefront/lib/api.ts` (client, token refresh), sign-in and onboarding,
sell (create listing → upload photo → activate → optional `POST /api/listings/:id/auction`), checkout → order → QR handoff, Cup overlay,
live bidding (`GET/POST /api/listings/:id/bids`). Any live failure falls back to mock, so a half-working backend never breaks the demo.

## 8. Done means

- [ ] Migrations 1–5 applied (Option A: just 5), seed present, advisors clean or explained
- [ ] `bidd-api` deployed, `/api/health` ok
- [ ] `npm run test:security` pass count reported
- [ ] `NEXT_PUBLIC_BIDD_API_URL` set on `bidd`; Quinn told to have the storefront session redeploy
- [ ] One real sign-in tested with a team member's school email, end to end (code arrives, onboarding, a listing posts)
- [ ] `progress.md` updated (session log + decisions), with no secrets in it
