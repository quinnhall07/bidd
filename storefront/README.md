# Bidd storefront (mock)

The campus feed, closets, drop page, listing page and Closet Cup, on mock data. Depop's layout, with Bidd's own features added (campus theming, chapter closets with access codes, drops, the Cup, moment tags, buyer fee, handoff).

```
npm install
npm run dev        # runs scripts/sync.mjs first, then next dev on :3000
```

`scripts/sync.mjs` copies the brand kit (`../brand`) and mock data (`../mock`) into `lib/brand`, `lib/mock` and `public/photos`. Those copies are gitignored: `brand/` and `mock/` remain the source of truth. To regenerate the mock rows, run `node ../mock/generate.mjs`.

## Routes

| Route | What |
|---|---|
| `/` | Campus feed: drop hero (`?feature=<drop>` switches it), every drop in a row, moment tags, size filter, grid |
| `/c/[slug]` | Any closet. `me` is your own, `kappa-delta` is a chapter (access code `KD2026`), `white-fox` is the demo brand closet, and handles like `annaclaire-w` are sellers |
| `/drop/[id]` | Drop page: `bid-day`, `one-of-one` (sealed bid), `gameday-tee`, `white-fox`, `philanthropy-week`. The collab lockup names the chapter, the company and the university |
| `/login`, `/onboarding` | Mock sign-in: school email, then a 6-digit code (any digits work), then campus confirmation, then chapter and sizes |
| `/item/[id]` | Listing page with buy, buyer fee and handoff |
| `/cup` | Closet Cup: campus view and SEC view (`?scope=sec`) |

## Lab panel

Add `?lab=1` to any URL. Every control writes to the URL, so any combination is a link you can send:

`school` · `state` (full/few/empty/loading) · `v` (a/b/c placements) · `card` (square/portrait) · `duo` (off/pair/tape/jersey) · `logos` (official/badge/off) · `drop` (auto/upcoming/live/low/soldout/ended) · `gate` · `viewer` · `names` (plain/letters) · `bid` (none/placed/won/lost) · `rule` (uniform/first: sealed-bid pricing)

Look (all opt-in; the brand default is flat): `fx` (flat/grade/duotone/grain/halftone/spotlight) · `heads` (solid/outline/offset) · `photos` (color/mono) · `motion` (off/on: scroll reveals, headline wipe, Cup bars, campus sweep) · `ticker` (off/on) · `header` (solid/glass) · `corners` (square/soft) · `grid` (4/5/6). The Look tab also has presets: Brand default, Drop night, Editorial, Varsity, Soft retail.

## Hooking up Supabase (Rouan)

Pages only read through `lib/data.ts`. Swap the function bodies for Supabase queries with the same signatures and the pages don't change. The row types in `lib/types.ts` match the tables in `build.md`, with these additions:

- `campuses.logo_url`, `campuses.logo_url_dark` (hosted school logos for the demo; never commit the files)
- `chapters.letters`, `chapters.members` (mock only)
- `closets.bio`, `closets.sold_count`, `closets.active_label` (derive the last two from orders)
- `drops.kind` (preorder/auction), `drops.auction` (pieces, minimum bid; bids belong in their own sealed `bids` table), `drops.company`, `drops.university_licensed`
- `drops.sizes` (per-size stock; in Supabase this is `stock` on the drop's listings), `drops.price_cents`, `drops.photo_url`, `drops.banner_url`, `drops.brand_partner`

`lib/lab.ts` and `components/lab-panel.tsx` are mock-only: delete them once real data and auth are in.
