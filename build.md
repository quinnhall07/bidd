# Bidd: Hackathon Build Plan

**Submission is due at 5:00 PM sharp.** Submit: team name and members, project name (**Bidd**), track (**Marketplace**), short description, GitHub and demo link, and a 3–5 minute pitch.
**Judging:** innovation (weighted most), multi-tenant, campus-verified, cross-campus, actually works, plus functionality, new-campus deploy, polish.

---

## What we demo (build only what this needs)
1. **Hook:** "$19,373 for one week of rush outfits."
2. Sign in with a **ua.edu** email → crimson theme → pick a chapter.
3. **Sell:** upload a photo of a dress → AI fills in title, size, condition and price → posted to the feed.
4. **Chapter closet:** enter access code → **"White Fox × [chapter]" drop** countdown → pre-order a size → philanthropy tag shown.
5. **Buy** a resale item → buyer fee shown → pick **QR Exchange** → QR code → scan confirms the handoff.
6. **Closet Cup:** the leaderboard updates → switch to the **SEC view** (same national chapter, Alabama vs Ole Miss).
7. Sign in with an **olemiss.edu** email → different theme, same app. This is the new-campus deploy.

## Scope
**P0 (must work)**
- [ ] .edu sign-in; the campus comes from the email domain
- [ ] Choose a chapter on onboarding
- [ ] Feed with filters (moment tags: Rush, Bid Day, Gameday, Formal)
- [ ] Listing detail page
- [ ] Sell flow with AI auto-fill
- [ ] Chapter closet page with access-code lock
- [ ] Drop page: countdown, sizes, pre-order, stock counter
- [ ] Checkout (Stripe test mode, or a mock with the buyer fee) → QR handoff
- [ ] Closet Cup leaderboard (campus view and SEC view)
- [ ] Two campus tenants seeded (UA and Ole Miss)
- [ ] Deployed to a public URL

**P1 (only if P0 is done by 3:00)**
- [ ] CSV export of drop orders (sizes and totals)
- [ ] Mock "Ship to MSC" option with a fake label and tracking
- [ ] Points (earned on completed sale, shown on profile)
- [ ] Estimated lbs kept out of landfill on each listing and chapter

**Cut (roadmap slide only):** rentals, Career Closet, move-out drive, away games, lockers, DMs, any social features.

---

## Stack
| Layer | Tool | Why |
|---|---|---|
| App | **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** | One codebase. The shadcn/ui components make it look polished quickly. |
| Data, auth, files | **Supabase** | Postgres, email sign-in codes, photo storage, realtime for stock and the leaderboard |
| AI | Vision LLM API (e.g. Claude) | One route: photo → JSON listing |
| Payments | **Stripe test mode** (or mock) | The checkout looks real |
| QR | `qrcode.react` + a `/scan/[code]` page | Handoff confirmation |
| Hosting | **Vercel** | Deploys automatically on every push to main |

> **Demo-safe auth:** real email codes can be slow on hackathon Wi-Fi. Build a **"demo login" dropdown** (pick a seeded user) as a backup and hide it behind `?demo=1`.

## Data model (Supabase)
```
campuses   id, slug, name, email_domain, primary_color, secondary_color, conference
chapters   id, campus_id, national_org, name, philanthropy, join_code
profiles   id (auth uid), campus_id, chapter_id, name, email, msc_code, points
closets    id, campus_id, type[personal|chapter|brand], owner_id, chapter_id,
           name, slug, logo_url, visibility[public|code], access_code, verified
listings   id, closet_id, campus_id, title, description, category, size, condition,
           price_cents, tags[], photo_urls[], status[active|sold], drop_id null, stock
drops      id, closet_id, name, starts_at, ends_at, licensed_vendor, philanthropy_pct
orders     id, listing_id, buyer_id, seller_id, price_cents, buyer_fee_cents,
           size, handoff[qr|msc], qr_code, status[paid|handed_off], created_at
cup_scores VIEW: chapter_id, campus_id, national_org, season, sales_count, gmv
```
**Multi-tenant rule:** every query filters by `campus_id` from the signed-in user. A new campus is **one row** in `campuses`, plus its chapters.

## Pages
| Route | What |
|---|---|
| `/login` | Email → code (plus demo login) |
| `/onboarding` | Pick a chapter (join code optional) |
| `/` | Feed with tag filters and a drops banner |
| `/item/[id]` | Listing detail → Buy |
| `/sell` | Photo upload → AI fill → edit → post |
| `/c/[slug]` | Closet (personal, chapter or brand), with access-code gate |
| `/drop/[id]` | Countdown, size picker, stock, pre-order |
| `/checkout/[id]` | Price + buyer fee → pay → choose handoff |
| `/order/[id]` | QR code and status |
| `/scan/[code]` | Confirms handoff → marks order as handed off → updates Closet Cup |
| `/cup` | Leaderboard: campus tab and SEC tab |

---

## Team split
### 🟥 Rouan: backend, data and the hard parts
- Create the Supabase project, schema and storage bucket. Write the `cup_scores` view.
- Auth: email codes, domain → campus lookup, demo login.
- Next.js project setup, shared layout, theme loaded from `campuses` colors.
- **AI listing API route** (`/api/ai-listing`): image → JSON `{title, category, size, condition, price, tags}`.
- Checkout, orders, buyer fee, QR handoff and `/scan`.
- Drops logic: start and end window, stock decrement, realtime updates.
- Vercel deploy and environment variables. Reviews and merges everyone's work.

### 🟨 Quinn: frontend
Builds UI against the components and data helpers Rouan sets up. Owns the look and feel in the app, using Rowan's brand kit.
- Feed (`/`) with listing cards and tag filters.
- Listing detail (`/item/[id]`).
- Sell form UI (`/sell`): calls Rouan's AI route and fills the form.
- Closet page (`/c/[slug]`) with the access-code gate.
- Drop page (`/drop/[id]`) with countdown and size picker.
- Closet Cup leaderboard (`/cup`), campus and SEC tabs.

### 🟩 Rowan: marketing and branding (no code needed)
- **Brand kit by 12:00** (Quinn needs it for the UI): "Bidd" wordmark and logo, 1 accent color plus neutrals, a font pairing (Google Fonts), favicon, and the tagline "The closet for SEC Greek life." Canva or Figma is fine.
- **Hallway interviews (11:30–12:00, HM Comer):** ask 5 students: "Where did you last sell clothes? How does your org order merch? Meet up or drop off?" Write down the best quotes **word for word** for the pitch.
- **Seed content** in a Google Sheet that Rouan imports as CSV. This is the marketing face of the demo, so make it look real:
  - 2 campuses (UA, Ole Miss) with colors.
  - 6–8 chapters per campus, with the **same national orgs on both** so the SEC leaderboard works.
  - 30+ listings with good photos (shoot your own clothes and teammates' clothes), catchy titles, prices and moment tags.
  - The "White Fox × [chapter]" brand closet and drop: name, description, banner image.
- **Pitch deck** (5–7 slides): Problem ($19K) → Product (closets + drops + Cup) → Demo → Business model → Why us / SEC go-to-market → Roadmap.
- **Launch marketing mockups** for the roadmap slide (shows judges how we'd get users): an Instagram post for a Bid Day drop, a "Closet Cup standings" story, and a one-line pitch to a chapter president.
- **Copy:** README one-liner, the project description for the submission, and the empty-state and button text Quinn asks for.
- **Click-test everything** after 3:00 and report bugs to Quinn (UI) or Rouan (anything that breaks).
- **Own the submission form** (done by 4:45) and **lead the pitch**. Practice the demo click path until it's smooth.

---

## Timeline
| Time | Rouan (backend) | Quinn (frontend) | Rowan (marketing/brand) |
|---|---|---|---|
| **11:00–11:30** | Repo, Next.js, Supabase, schema, Vercel deploy of the skeleton | Install, run locally, learn the shadcn/ui components, sketch the pages | Logo, colors, fonts (brand kit) |
| **11:30–12:00** | Auth + campus lookup + demo login | Feed and listing card with fake data | **Hallway interviews.** Deliver the brand kit to Quinn. |
| **12:00–12:30** | 🍕 **Brunch: 5-minute standup** | | |
| **12:30–2:00** | AI listing route, data helpers, seed import | Apply the brand kit; feed and detail pages on real data, sell form | Seed sheet (30+ listings, photos, White Fox drop) |
| **2:00–3:00** | Checkout, orders, QR scan, drops logic | Closet + access code, drop page | Deck draft, Instagram and story mockups |
| **3:00** | ✅ **Feature freeze check: is P0 working end-to-end?** | | |
| **3:00–4:00** | Cup view, realtime, P1 if green | Cup leaderboard, polish, mobile layout | Click-test, bug list, screenshots for the deck |
| **4:00–4:30** | Bug fixes only, final deploy | Polish only | Deck final, pitch rehearsal |
| **4:30–4:45** | **Two full demo rehearsals** on the deployed URL | | |
| **4:45** | Submit (Rowan owns it) | | |

**Rules:** nobody merges to `main` after 4:15 without Rouan. If something isn't working by 3:00, **mock it**. A clean fake is better than a broken real one.

## Git workflow (Quinn)
1. `git pull` before starting anything.
2. `git checkout -b your-name/feature`
3. Commit small: `git add . && git commit -m "feed cards"`
4. `git push`, open a pull request, and Rouan merges.
5. Stuck for more than 15 minutes? **Ask.** Mentors roam all day.

## AI listing prompt (starter)
```
You are listing a clothing item for a college resale marketplace.
From the photo, return JSON only:
{"title": str (<=60 chars), "category": one of [dress, top, bottoms, outerwear, shoes, accessory, set],
 "size": best guess or "Unknown", "condition": one of [new, like new, good, fair],
 "price": suggested USD resale price (int),
 "tags": subset of [Rush, Bid Day, Gameday, Formal, Casual, Philanthropy],
 "brand": best guess or null,
 "has_greek_letters_or_school_marks": bool}
```
If `has_greek_letters_or_school_marks` is true, show a "Licensed merch? Resale only" notice. That shows judges we thought about licensing.

## Pitch outline (3–5 min)
1. **Hook (20s):** "$19,373. One week of rush outfits. Worn once."
2. **Problem (30s):** clothes worn once, chapter merch runs on Google Forms and Venmo, and resale apps left Greek life (Curtsy started at Ole Miss and moved away from sororities).
3. **Demo (2 min):** follow the click path above.
4. **Model (30s):** 0% seller fee and a buyer fee; 10% on drops; 15–20% on brand co-drops.
5. **Why it wins (30s):** chapters bring their members, the Cup drives listings, SEC status flows down to smaller schools, and a new campus is one config row.
6. **Close:** roadmap one-liner, then "Bidd."

## Pre-submit checklist
- [ ] Deployed URL works on a phone
- [ ] ua.edu and olemiss.edu logins both work (or demo login)
- [ ] AI listing works on 3 test photos (have a backup photo ready)
- [ ] Drop countdown is set so it's **live during judging**
- [ ] Leaderboard has seeded scores so it isn't empty
- [ ] GitHub repo is public with a README (name, one-liner, screenshots, stack)
- [ ] Submission form complete
