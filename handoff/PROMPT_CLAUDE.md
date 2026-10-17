# Prompt for Claude (Claude Code, Opus 5.5): art direction, graphics, and the real frontend

> Paste everything below the line into Claude Code, opened at the repo root (`Biddapp/`). Make sure the Higgsfield
> connector is enabled in the session.

---

You are the **creative director and lead frontend engineer** for **Bidd**. You have **complete creative freedom**
over the visual identity, graphics, motion and UI, and you're expected to use it. The goal: an app so good-looking
that students screenshot it, with **floating, dimensional graphics**, **school-specific color worlds**, and buttery
mobile motion. On top of that, it has to be **wired to a real, finished backend** without breaking a single rule of it.

Read these first (they're in this repo and are the source of truth):
- `handoff/BACKEND_BRIEF.md`: every endpoint, field, error code, rule and screen.
- `backend/lib/contracts/auth.ts`, `listings.ts`, `orders.ts`, `community.ts`: exact request/response types.
- `backend/docs/API.md` and `backend/docs/SECURITY.md`: details and the security model.
- `progress.md`: project status and decisions.

## 1. The product in one breath

**Bidd: the closet for SEC Greek life.** Students sign in with their school email, list their rush, bid day,
gameday and formal clothes, buy from classmates **on their own campus only**, meet on campus where a **one-time QR**
completes the sale (pilot: **no payments**, pay in person), and every sale earns their **chapter 10 points** in the
**Closet Cup**: a chapter leaderboard per campus and an SEC campus-vs-campus ranking.

Campuses now: **The University of Alabama** (crimson `#9E1B32`, gray `#828A8F`, white) and **Ole Miss** (red `#CE1126`,
navy `#14213D`, white). More SEC schools get added later as data, so the design system must be **theme-driven from
`GET /api/me` → `campus.theme`**, never hard-coded per school.

Audience: 18–22-year-old sorority and fraternity students on their phones. Culture cues: rush week outfits, bid day
reveals and matching tees, gameday dressing, tailgates, formal season, big/little gifts, chapter pride, school pride.

## 2. Where you're starting from

- `backend/` is finished and tested (54 security tests). **Don't change backend behavior.** Run it with
  `cd backend && npm run dev` (port 3000). `http://localhost:3000/dev` shows every real response.
- `frontend/` may already contain a **mock-data UI built by another AI**, with an API module in `frontend/lib/api/`
  and a `NEXT_PUBLIC_API_MODE=mock|live` switch. If it exists: keep what's good, then **elevate the visuals** and
  **make live mode real**. If it doesn't exist: build the frontend yourself (Next.js App Router, React, strict TypeScript,
  port **3001**).

## 3. Art direction (your call, here's the brief)

**Concept seed** (feel free to replace with something better): *"Your closet, floating."* Garments, accessories and
chapter-life objects drift in soft 3D space behind clean, editorial UI, like a fashion campaign shot in your school
colors. Premium, playful, never cluttered. Fast to list, fast to buy.

**Floating graphics.** Build a reusable "floating layer" system:
- Transparent, dimensional objects (generated with Higgsfield, section 4) such as a ruffled rush dress on a hanger,
  white sneakers, pearls, hair bows, a gameday bow in school colors, sunglasses, a tote, a corsage, a formal heel, a
  disposable camera, a bid day balloon, confetti, ribbon swirls, stars and sparkles.
- Layered parallax (depth via scale + blur + speed), gentle idle drift and rotation, reacting subtly to scroll and
  device tilt where supported. Hero moments on Welcome, Onboarding, an empty feed, Closet Cup, and the sale-completed
  celebration.
- Respect `prefers-reduced-motion` (static composition). Keep 60fps on a mid-range phone: transform/opacity only,
  WebP/AVIF assets, lazy-load, cap simultaneous floaters, no layout thrash.

**School-specific "semi colors".** Don't slap raw school colors everywhere. Derive a full **tinted palette** from
`campus.theme`: soft tints (washes, glass panels, chips), deep shades (text, headers), gradients, and accents.
- Alabama world: crimson → blush/rose tints, warm gray, cream; houndstooth-inspired texture (a pattern, not a logo).
- Ole Miss world: red + navy → powder blue and soft coral tints; magnolia and "Grove" tailgate warmth.
- Build it as CSS variables computed from the theme at runtime (e.g. OKLCH mixing), so a third school just works.
- Check contrast (WCAG AA) for text in both worlds; tints for surfaces, shades for type.

**Hard brand rules.**
- **No official logos, mascots, wordmarks, seals, or Greek-organization crests/letters as graphics.** Colors,
  original art and plain text names only. Chapter names appear as text.
- No real people's faces or likenesses. Fashion items, still life, abstract and illustrated figures are fine.
- The badge text is exactly **"School email verified"**. The checkout shows **"Payments aren't available yet. Pay the
  seller in person at the meetup."**

**Type and UI.** Your choice, but aim for editorial fashion meets campus spirit: one expressive display face plus one
very readable UI face. Big tappable targets (≥44px), safe areas, bottom-reachable primary actions, haptic-feeling
micro-interactions, skeletons not spinners, delightful empty states, and a real celebration when a QR handoff completes
("+10 for your chapter!").

## 4. Asset pipeline with Higgsfield

Use the **Higgsfield tools** (e.g. `generate_image`, `remove_background`, `upscale_image`, and `generate_video` for
optional loops) to create original assets. If the tools are deferred, load them first. Before generating, show me a
short **asset plan** (list, purpose, size, style), then generate in batches.

Style lock (put this in every prompt so the set is consistent): *studio product photography, soft diffused daylight
from upper left, subtle contact shadow, high detail fabric texture, pastel-clean background, 3/4 angle, centered,
no text, no logos, no people.* Then cut out with `remove_background` → transparent PNG.

Generate at least:
1. **Floater set (neutral)**: 12–16 objects listed above, cut out, 1024px+.
2. **Campus-tinted variants**: the same hero objects recolored for each campus world (e.g. a gameday bow and a tote in
   Alabama crimson/cream and in Ole Miss red/navy). Generate from the theme colors so new schools can follow the recipe.
3. **Tag art**: one hero visual each for **Rush**, **Bid Day**, **Gameday**, **Formal** (filter chips and category headers).
4. **Closet Cup trophy**: an original, non-branded trophy/cup with ribbon, in neutral + per-campus tints.
5. **Empty and state art**: empty feed, empty closet, no orders yet, unsupported school ("Bidd isn't at your school
   yet"), offline/error, and sale-complete confetti.
6. **Welcome hero**: a layered composition (separate cut-out layers so it can parallax). Optionally a short seamless
   loop via `generate_video` for the splash.
7. **Listing placeholders** for mock/dev: garment flat-lays per tag (never shown as real listings in live mode).

Export: WebP (plus AVIF if easy), multiple sizes, under `frontend/public/brand/` with a `manifest.json` (id, purpose,
campus or neutral, sizes, the prompt used). Use `upscale_image` only where an asset is shown large.

## 5. Wiring to the real backend (non-negotiable correctness)

Everything below is in `handoff/BACKEND_BRIEF.md` in full. These are the rules most likely to bite:

- **One API module** (`frontend/lib/api/`) with the function names and types from the contracts. Screens never call
  `fetch` directly. Live base URL: `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`.
- **Run the frontend on port 3001.** The backend's CORS only allows `FRONTEND_ORIGINS` (default `http://localhost:3001`).
- **Auth = Bearer token, no cookies.** Sign-in: email → **Cloudflare Turnstile** (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
  script `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`, single-use tokens, reset after each
  send, button disabled until a token exists) → `POST /api/auth/request-code` → 6-digit code →
  `POST /api/auth/verify-code` → `session` + `needsOnboarding`.
- Session: `accessToken` (1h), `refreshToken` (**rotates**: save the new one every refresh), `expiresAt` (unix
  seconds). Refresh ~60s early or once after `401 invalid_token`; `401 invalid_refresh_token` → sign-in.
- Allowed school domains: `crimson.ua.edu`, `ua.edu`, `go.olemiss.edu`, `olemiss.edu` (exact). Others →
  `school_not_supported`: make that a lovely screen, not an error toast.
- Errors are always `{ error: { code, message } }`: show `message`, branch on `code`.
- **Never send fields outside the contract** (no campus, role, status or price where they don't belong). Money is cents.
- Photos: `POST /api/listings/:id/media`, `multipart/form-data`, field **`photo`**, one per request, JPEG/PNG/WebP ≤4 MB,
  max 6. Resize client-side (~2000px, JPEG ~0.85) first. Photo URLs are **Supabase signed URLs** from
  `https://xanamvujsuckcypoaavd.supabase.co` that **expire in ~10 minutes**: allow that image host, don't cache long,
  re-fetch on image error.
- Listing lifecycle: draft → (≥1 photo) → `PATCH {status:"active"}`; clients may only set `active` / `draft` / `removed`.
  Feed shows `active` only; detail can show `reserved` / `sold`.
- Checkout → `reserved` + order `pending_meetup`. The **buyer** gets `POST /api/orders/:id/handoff-token` →
  `qrPayload` (render as QR, 15-min countdown, refresh revokes the old one). The **seller** scans → 
  `POST /api/handoffs/confirm {token}` (camera **plus a paste fallback**). Then order `completed`, listing `sold`,
  +10 Cup points if the seller's chapter membership is approved.
- Closet Cup: `GET /api/cup` (campus standings + conference). Officers: `GET/POST /api/chapter/requests`.
  Reports: `POST /api/listings/:id/report` (3 reporters auto-hide). Blocks: `/api/blocks`. Admins: `me.user.role === "admin"`
  → `POST /api/admin/listings/:id/remove`.

## 6. How to work

1. Read the files in the header. Run the backend and click through `/dev` to see real data.
2. Inspect `frontend/` (if present) and write a short plan: what to keep, what to redo, the design system, the asset
   plan. Show it to me before generating assets.
3. Build the design system: theme-derived palette, type scale, spacing, radii, elevation, motion tokens, floating layer.
4. Generate and integrate assets.
5. Implement or upgrade every screen from `BACKEND_BRIEF.md` section 7, in live mode, against the running backend.
6. Verify end to end with two real accounts on the same campus (sell → buy → QR handoff → Cup moves) and one on the other
   campus (sees nothing of the first). Run the backend's `npm run test:security` to confirm you changed nothing there.
7. Check mobile performance (Lighthouse mobile ≥ 85 on the feed), accessibility (labels, contrast, focus, reduced motion)
   and both campus themes. Then commit on a `frontend/…` branch and summarize what you made, with screenshots.

Never commit keys or `.env.local`. Never weaken a backend rule to make the UI easier: if something seems impossible
with the API, tell me instead.
