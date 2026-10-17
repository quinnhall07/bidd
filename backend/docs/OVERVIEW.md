# Bidd backend: the big picture

Read this before touching code. Details live in `progress.md` (task list) and `KEYS.md` (accounts).

## What we're building
A campus-locked clothing marketplace for Greek life. Everything is a **closet** (personal, chapter, brand). Students sell and buy within their own campus, meet on campus to swap (QR scan confirms the handoff), and every completed sale scores points for their chapter in the **Closet Cup**.

Today's must-have: **a student signs up with a school email, proves they own it with a 6-digit code, and sets up an account that's locked to their campus.** Everything else is built on that.

## The pieces

```
 Quinn's frontend  ──HTTPS + Bearer token──►  backend/ (Next.js API on Vercel)
 (UI only)                                       │
                                                 ├─► Supabase Auth      (email codes, sessions)
                                                 ├─► Supabase Postgres  (data + RLS security rules)
                                                 ├─► Supabase Storage   (listing photos, private)
                                                 ├─► Resend             (delivers the code emails)
                                                 ├─► Stripe (test mode) (checkout)
                                                 └─► Claude vision      (photo → listing draft)
```

- **Frontend (Quinn):** displays things and calls our API. It holds no business rules and no secrets.
- **Backend (us):** every action that matters (sign up, post a listing, buy, confirm handoff) goes through an API route that checks who you are and whether you're allowed.
- **Database:** Postgres with Row-Level Security. Even if someone bypasses our API and calls Supabase directly, the database itself refuses to show a UA student Ole Miss data or let anyone edit their own points.

## Sign-up flow (today's goal)
1. Student types `jdoe@crimson.ua.edu`.
2. Backend lowercases it and checks the **exact domain** against `campus_email_domains`. Unknown school → "Bidd isn't at your school yet." Look-alikes such as `crimson.ua.edu.evil.com` fail.
3. Supabase emails a 6-digit code (through Resend, from our domain). It expires in 10 minutes and can be resent after 60 seconds. Requests are rate-limited and CAPTCHA-protected.
4. Student enters the code. Supabase verifies it and issues a session.
5. On the server, the backend reads the **verified** email, maps domain → campus, and creates the profile plus campus membership. The browser never gets to say which campus it's in.
6. Onboarding: display name + pick a chapter. Picking a chapter is a **request**. It doesn't grant membership until an officer approves it (or the demo seed does).
7. `GET /api/me` returns profile, campus theme (crimson vs. Ole Miss red/blue), badges. Quinn's UI themes itself from that.

Second line of defense: a Supabase **Before-User-Created hook** blocks non-allowlisted domains inside Supabase itself, so the API can't be skipped.

## Multi-tenant = "a new school is one row"
`campuses` holds name, slug, colors and conference. `campus_email_domains` maps domains → campus. Adding Auburn = insert one campus row + its email domains + its chapters. No code changes. This is a judging criterion ("new-campus deploy").

## Security model in one breath
Verified email decides campus → RLS on every table, deny by default → the server computes anything worth stealing (price, fees, points, roles, paid status) → secret key never leaves the server → rate limits + CAPTCHA on auth → one-time, seller-only QR tokens → no secrets in git → demo login off in production.

## What gets built, in order
| # | Phase | Proves |
|---|---|---|
| 0 | Repo, Next.js skeleton, Supabase project, Vercel | A public URL exists |
| 1 | **Auth + campus + onboarding** | Real `.edu` sign-up works; wrong domains and forged campuses fail |
| 2 | Listings, photos, feed, AI draft | One student posts, a campus-mate sees it, the other campus doesn't |
| 3 | Checkout (Stripe test), orders, QR handoff, drops | Two accounts complete a sandbox sale; replayed QR fails |
| 4 | Closet Cup leaderboard (campus + SEC), reports | Scores move after a handoff |
| 5 | Hardening, deploy, rehearsal | Works on a phone at the public URL |

If a phase isn't done by 3:00 PM, we ship a clearly labeled mock of it rather than a broken real one.

## What we are NOT building today
DMs, social feed posts, rentals, shipping, real money, enrollment verification (an email code proves mailbox access, not enrollment).
