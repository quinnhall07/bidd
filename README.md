# Bidd

**The closet for SEC Greek life.** Resell your rush wardrobe, shop your chapter's drops, and every sale counts for your chapter.

Bidd is a campus-locked clothing marketplace. Students sign in with their school email, list clothes with photos,
buy from classmates, meet on campus to swap (a one-time QR code confirms the handoff), and every completed sale
scores points for their chapter in the **Closet Cup**.

> **Pilot status:** no payments are collected. Checkout reserves the item and the buyer pays the seller in person.

| Folder | What | Owner |
|---|---|---|
| `backend/` | Next.js API, Supabase schema + security rules, auth, orders | Rouan |
| `frontend/` | Product UI | Quinn |

- Progress + task list: [`progress.md`](progress.md)
- API for the frontend: [`backend/docs/API.md`](backend/docs/API.md)
- Security model: [`backend/docs/SECURITY.md`](backend/docs/SECURITY.md)
- Keys & account setup: [`backend/docs/KEYS.md`](backend/docs/KEYS.md)
- Going live: [`backend/docs/LAUNCH.md`](backend/docs/LAUNCH.md)
- **Building the frontend:** [`handoff/BACKEND_BRIEF.md`](handoff/BACKEND_BRIEF.md) (give this to your AI), plus ready-made
  prompts for [ChatGPT](handoff/PROMPT_CHATGPT.md) (mock-data UI) and [Claude Code](handoff/PROMPT_CLAUDE.md) (graphics + live wiring)

## What works today

| Feature | How |
|---|---|
| **School-email sign-in** | 6-digit code to a `.edu` inbox. Only exact allowlisted domains (`crimson.ua.edu`, `ua.edu`, `go.olemiss.edu`, `olemiss.edu`). Campus comes from the verified email, never from the app. |
| **Onboarding** | Display name + chapter request (pending until a chapter officer approves). |
| **Listings** | Draft → up to 6 photos → publish. Photos are re-encoded server-side with all GPS/EXIF data stripped. |
| **Campus feed** | Your campus only, newest first, filter by Rush / Bid Day / Gameday / Formal, size and price. |
| **Checkout (pilot)** | Reserves the item, no money moves. Buyer shows a one-time QR at the meetup, seller scans it, sale complete. |
| **Closet Cup** | 10 points per completed handoff to the seller's approved chapter. Campus leaderboard + SEC campus totals. |
| **Safety** | Report listings (3 reports auto-hide), block sellers, chapter officers approve members, campus admins remove listings. |

Adding a school is data, not code: one row in `campuses`, its email domains and its chapters.

## Run it locally

Requirements: Node 22+, a Supabase project (see [`KEYS.md`](backend/docs/KEYS.md)).

```bash
cd backend
npm install
cp .env.example .env.local   # then fill in the Supabase URL + keys
npm run dev                  # http://localhost:3000
```

Database: run these in order in the Supabase SQL editor (each once), then the seed:

1. `backend/supabase/migrations/20261017130000_identity_and_campus.sql`
2. `backend/supabase/migrations/20261017143000_listings_and_media.sql`
3. `backend/supabase/migrations/20261017153000_orders_and_handoffs.sql`
4. `backend/supabase/migrations/20261017160000_cup_and_moderation.sql`
5. `backend/supabase/seed.sql` (Alabama + Ole Miss, domains, chapters; safe to re-run)

Then open **http://localhost:3000/dev**, a bare click-through of every feature (hidden on production).

## Tests

```bash
cd backend
npm run typecheck
npm run test:unit        # email parsing
npm run test:security    # 54 end-to-end security tests against the running server + real database
```

The security suite creates throwaway users through the admin API (no emails are sent) and deletes them at the end.

## Architecture

```
frontend (Quinn) ──HTTPS + Bearer token──► backend/ (Next.js API)
                                            ├─► Supabase Auth (email codes, sessions)
                                            ├─► Supabase Postgres (data + row-level security)
                                            ├─► Supabase Storage (private listing photos)
                                            └─► Resend (code emails, via Supabase SMTP)
```

The frontend holds no business rules and no secrets. Every action goes through an API route that checks who you are;
the database's row-level security is the final wall even if someone skips the API.

## Git workflow
1. `git pull` before starting.
2. `git checkout -b your-name/feature`
3. Commit small, `git push`, open a pull request. Rouan merges.
4. Never commit `.env.local` or any key.
