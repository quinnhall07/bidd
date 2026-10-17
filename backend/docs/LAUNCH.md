# Going live checklist

Everything here is **for later**. The pilot runs locally today with nothing extra connected.

## 1. Host the backend (Vercel)
- [ ] Import the GitHub repo at https://vercel.com/new, **Root Directory = `backend`**.
- [ ] Environment variables (Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
      `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `APP_BASE_URL` (the Vercel URL),
      `FRONTEND_ORIGINS` (Quinn's deployed URL), `DEMO_MODE=false`.
- [ ] Deploy, then open `https://<vercel-url>/api/health` and expect `{"ok":true,...}`.
- [ ] `/dev` returns 404 on the production deployment (expected).

## 2. Point the services at the new URL
- [ ] Supabase → Auth → URL Configuration: add the Vercel URL and the frontend URL.
- [ ] Cloudflare Turnstile widget: add the Vercel and frontend hostnames.
- [ ] Resend: `bidd.day` stays verified (no change).

## 3. Verify on the real deployment
- [ ] `TEST_BASE_URL=https://<vercel-url> npm run test:security` from `backend/` (all green).
- [ ] Phone test: sign in with a UA address and an Ole Miss address; each sees only its own campus.
- [ ] Sell → buy → QR handoff → Closet Cup moves.

## 4. People and roles
- [ ] Make the first officer for each chapter (SQL in [`API.md`](API.md#chapter-officers)).
- [ ] Make campus admins: `update public.profiles set role = 'admin' where email = '...';`

## 5. Turning on what the pilot skipped
- [ ] Payments: Stripe Checkout + webhook (signature check, idempotent by event ID), then flip
      `orders.payment_status` beyond `not_collected`. Use test mode first.
- [ ] AI listing drafts from a photo (Anthropic key, per-user quota).
- [ ] Chapter closet drops with access codes.
- [ ] Seed listings from Rowan's sheet.

## 6. Before a public launch
- [ ] Re-run Supabase Security Advisor (expected: only "RLS Enabled No Policy" notes on server-only tables, and the
      leaked-password warning, which doesn't apply because there are no passwords).
- [ ] Rotate the Supabase secret key if it was ever pasted anywhere outside `.env.local` / Vercel.
- [ ] Turn on 2FA for every account in [`KEYS.md`](KEYS.md).
