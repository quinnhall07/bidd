# Merge handoff: storefront + backend

Written 2026-10-17, 3:55 PM, for the next session. Submission is due at **5:00 PM** (Rowan submits at 4:45), and `build.md` says nothing merges to `main` after 4:15 without Rouan.

## Where things are

Branch **`quinn/storefront`** = Rouan's `origin/main` plus Quinn's work, which was never committed before. Nothing here has been merged into `main`.

| Folder | What | Owner |
|---|---|---|
| `backend/` | Rouan's Next.js API + Supabase (migrations, auth, listings, photos, onboarding, security tests). Docs: `backend/docs/OVERVIEW.md`, `backend/docs/API.md` | Rouan |
| `storefront/` | Quinn's UI on mock data (Next 16, Tailwind v4). Its README covers routes, the lab panel and the data swap | Quinn |
| `brand/` | Brand kit: logo, `theme/campus.ts`, `theme/bidd.css`, React logo | Quinn |
| `mock/` | Mock rows shaped like the tables (`generate.mjs` makes them); 46 licensed stock photos. `mock/logos/` is gitignored | Quinn |
| `tools/shots/` | `matrix.mjs` screenshot matrix (all schools × pages × states), `shot.mjs` for quick shots | Quinn |
| `PRODUCT.md`, `DESIGN.md`, `build.md`, `vision.md`, `docs/` | Product truth, design system, plan, research | Team |

There are **two Next apps** today. Rouan's README expects the UI in `frontend/`; the UI lives in `storefront/`.

## What the merge has to do

1. **Pick the shape.** Either move the storefront's `app/`, `components/` and `lib/` into one app with Rouan's `app/api` (one deploy, same-origin auth), or keep two apps and have the storefront call the backend's API (two deploys, cross-origin tokens). One app is simpler for a demo; check `backend/proxy.ts` and its auth model first.
2. **Swap the data layer.** Every storefront page reads through `storefront/lib/data.ts`. Replace the function bodies, keep the signatures:

| Storefront | Backend today |
|---|---|
| `/login` (email → code → campus) | `POST /api/auth/request-code`, `POST /api/auth/verify-code`, `GET /api/me` |
| `/onboarding` (chapter, sizes) | `GET /api/organizations`, `POST /api/onboarding` |
| `getFeed` (`/`) | `GET /api/listings` |
| `getListing` (`/item/[id]`) | `GET /api/listings/:id` |
| `getCloset("me")` (`/c/me`) | `GET /api/me/listings` |
| Sell | `POST /api/listings`, `POST /api/listings/:id/media` |
| `getDrop`, sealed bids, `getCup`, chapter closets + access code, brand closets, checkout/QR | **not in the backend yet**: keep them on mock data |

3. **Reconcile the schema.** Backend tables: `campuses`, `campus_email_domains`, `profiles`, `campus_memberships`, `organizations`, `organization_memberships`, `closets`, `listings`, `listing_media`, `audit_events`. The storefront's extra columns are listed in `storefront/README.md` (logo URLs, drop fields, auction, company, `university_licensed`). Its "chapters" are the backend's `organizations`.
4. **Keep the lab.** The `?lab=1` panel is how the team compares options. A `DATA_SOURCE=mock|api` switch lets the demo fall back to mock data if the network fails.
5. **Logos.** Upload the 32 school logo files to Supabase storage and point `logo_url` / `logo_url_dark` there. Never commit them.

## Quinn's chosen look (from the lab)

Settings Quinn sent on 2026-10-17. They are lab settings, not defaults yet:

```json
{ "v": "c", "card": "square", "duo": "tape", "logos": "official", "names": "plain",
  "fx": "halftone", "heads": "offset", "photos": "color", "motion": "on",
  "ticker": "off", "header": "solid", "corners": "square", "grid": "6" }
```

Link: `/?lab=1&v=c&fx=halftone&heads=offset&motion=on&grid=6`. Halftone fields, offset headlines and motion go past DESIGN.md's "No Effects Rule" (flat surfaces). If they become the default, update DESIGN.md and `LAB_DEFAULTS` in `storefront/lib/lab.ts` together.

## New feature (Quinn, not built): seller brands with verification

Users can create their own **brand** and sell their clothes under it. A brand has to be verified first, in one of two ways:

- **Consistent seller:** a track record on Bidd (thresholds to decide, for example N completed sales over M weeks with no disputes).
- **Existing clothing brand:** proof such as a website, an Instagram with sales history, or a business registration, reviewed by a person.

Fit with what exists: `closets.type = 'brand'` and `closets.verified` are already in the model, and the storefront already has a brand closet header (the White Fox demo). Still needed: a `brand_applications` table (applicant, path `consistent_seller | existing_brand`, evidence, status `pending | approved | rejected`, reviewer), an apply flow, a review queue, and a "Verified brand" mark on closets and listings.

Open questions: the thresholds; who reviews (the Bidd team, or automatic for the seller path); whether verified brands can run drops or co-drops with chapters; and their fees (the 15–20% revenue share is for brand co-drops).

## Still open

- **Greek letters** (`names=letters`): PRODUCT.md says Bidd never prints Greek-organization trademarks, and no exception is recorded, unlike the school-logo exception.
- **Local `main`** on Quinn's laptop has no commits; work from `quinn/storefront`.

## Continuation prompt

> Read `docs/merge-handoff.md`, `README.md`, `backend/docs/OVERVIEW.md`, `backend/docs/API.md` and `storefront/README.md`. Merge Quinn's storefront UI with Rouan's backend on a new branch from `quinn/storefront`: pick one app or two, swap `storefront/lib/data.ts` onto the real API where endpoints exist, keep drops, sealed bids, the Cup and chapter gates on mock data behind a `DATA_SOURCE` switch, and keep the `?lab=1` panel working. Don't merge to `main` without Rouan. Then plan the seller-brand verification feature from the handoff.
