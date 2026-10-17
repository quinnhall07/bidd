# Keys & accounts setup

Do these in order. **Never paste secret values into chat, Slack, or GitHub.** Put them in `backend/.env.local` (git-ignored) and later in Vercel → Project → Settings → Environment Variables.

Turn on 2FA on every account below.

---

## NOW — needed for sign-up + verification (today's goal)

### 1. GitHub repo
1. Create the repo: https://github.com/new
   - Name: `biddapp` (or anything), **Private** for now (flip to Public before submission if judges need it)
   - Do **not** add a README/.gitignore (we already have them)
2. Send Claude the repo URL (e.g. `https://github.com/<you>/biddapp`).
3. Add Quinn: `https://github.com/<you>/biddapp/settings/access` → **Add people** → Quinn's GitHub username → Write role.
4. 2FA: https://github.com/settings/security

### 2. Supabase (database + auth + storage)
1. Sign up / sign in: https://supabase.com/dashboard
2. **New project**: https://supabase.com/dashboard/new
   - Name `bidd`, region **East US (North Virginia)** (closest to Alabama), generate a strong DB password and store it in your password manager.
3. Copy keys from **Project Settings → API Keys**: https://supabase.com/dashboard/project/_/settings/api-keys
   - **Publishable key** (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (safe for browsers)
   - **Secret key** (`sb_secret_...`) → `SUPABASE_SECRET_KEY` (**server only**: bypasses all security rules)
4. Copy the **Project URL** from https://supabase.com/dashboard/project/_/settings/api → `NEXT_PUBLIC_SUPABASE_URL`
5. Tell Claude the project is created (or the project ref). Claude can apply migrations through the Supabase connector.

> The `_` in those links auto-selects your project after you log in.

### 3. Resend (sends the 6-digit codes to real school inboxes)
**Why:** Supabase's built-in email only delivers to your own team's addresses and ~2 emails/hour. Real `@crimson.ua.edu` sign-ups need custom SMTP.

**You need a domain you control** (e.g. `getbidd.com`). Codes will come from `no-reply@getbidd.com`.
- Already own one? Use it.
- Need one (~$10): Cloudflare Registrar https://dash.cloudflare.com/?to=/:account/domains/register or Namecheap https://www.namecheap.com

Then:
1. Sign up: https://resend.com/signup
2. Add + verify the domain: https://resend.com/domains → **Add Domain** → copy the DNS records (SPF, DKIM, MX) into your DNS provider. Usually verifies in a few minutes. **Start this early.**
3. Create an API key: https://resend.com/api-keys → permission **Sending access** → copy it once.
4. Paste into Supabase SMTP settings: https://supabase.com/dashboard/project/_/auth/smtp
   - Host `smtp.resend.com`, Port `465`, Username `resend`, Password = the Resend API key
   - Sender email `no-reply@<your-domain>`, Sender name `Bidd`
   - (This key lives inside Supabase, not in our `.env`.)

### 4. Cloudflare Turnstile (bot protection on sign-up)
1. Sign up / in: https://dash.cloudflare.com/sign-up
2. Turnstile → **Add widget**: https://dash.cloudflare.com/?to=/:account/turnstile
   - Hostnames: `localhost`, your Vercel domain (add later), your custom domain
   - Mode: **Managed**
3. **Site key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public)
4. **Secret key** → paste into Supabase Attack Protection: https://supabase.com/dashboard/project/_/auth/protection → Enable CAPTCHA → Provider **Turnstile**
   - Turn this on only once the test UI sends the token, or every sign-in will fail.

### 5. Vercel (public URL)
1. Sign in with GitHub: https://vercel.com/signup
2. Import the repo: https://vercel.com/new → set **Root Directory = `backend`**
3. Add the env vars from `.env.example` in Project → Settings → Environment Variables.
4. Afterwards add the Vercel URL to Supabase **Auth → URL Configuration**: https://supabase.com/dashboard/project/_/auth/url-configuration

---

## LATER TODAY — after sign-up works

### 6. Anthropic (AI listing from a photo) — optional
- API key: https://console.anthropic.com/settings/keys → `ANTHROPIC_API_KEY` (server only)
- Set a monthly spend limit: https://console.anthropic.com/settings/limits

### 7. Stripe (test-mode checkout)
1. Sign up: https://dashboard.stripe.com/register (stay in **Test mode / Sandbox**)
2. Secret key: https://dashboard.stripe.com/test/apikeys → `sk_test_...` → `STRIPE_SECRET_KEY` (server only)
3. Webhook: https://dashboard.stripe.com/test/webhooks → endpoint `https://<vercel-url>/api/stripe/webhook`, events `checkout.session.completed`, `checkout.session.expired` → signing secret `whsec_...` → `STRIPE_WEBHOOK_SECRET`
4. **No live keys today.** Real money stays off until Connect onboarding, refunds and disputes are handled.

### 8. Cron secret
Generate locally (no website needed):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
→ `CRON_SECRET`

---

## Where each value goes

| Variable | Public? | Where it comes from |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase → Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase → Settings → API Keys |
| `SUPABASE_SECRET_KEY` | **NO** | Supabase → Settings → API Keys |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | yes | Cloudflare Turnstile |
| Turnstile secret | **NO** | Goes into Supabase dashboard only |
| Resend API key | **NO** | Goes into Supabase SMTP settings only |
| `ANTHROPIC_API_KEY` | **NO** | Anthropic console |
| `STRIPE_SECRET_KEY` | **NO** | Stripe dashboard (test) |
| `STRIPE_WEBHOOK_SECRET` | **NO** | Stripe webhook endpoint |
| `CRON_SECRET` | **NO** | Generated locally |
| `APP_BASE_URL` | yes | Your Vercel/custom URL |
| `FRONTEND_ORIGINS` | yes | Quinn's frontend URL(s), comma-separated (CORS allowlist) |
| `DEMO_MODE` | yes | `true` locally only, never on production |

Anything starting with `NEXT_PUBLIC_` is shipped to browsers. Never put a secret behind that prefix.
