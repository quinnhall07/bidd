# Next session: the mock storefront

Prepared 2026-10-17, 1:30 PM. Submission is due **5:00 PM**, and `build.md` puts the feature freeze at 3:00, so the session below is time-boxed.

## Decisions so far (Quinn)

- **Base it heavily on Depop**, then add Bidd's own features where Depop has nothing: campus theming, chapter closets with access codes, drops, the Closet Cup, moment tags, QR handoff and the buyer fee.
- **Pages:** campus feed (`/`), seller closet, chapter closet (`/c/[slug]`), drop page (`/drop/[id]`).
- **Test in the real app with a lab panel**, on mock data. No Supabase yet: "make what we need and then we'll hook it all up later."
- **Stock photos for now, and they fit their context.** Resell listings look like real secondhand posts. Drops look like new, blank merch from a licensed vendor.
- **Options for different SEC schools:** all 16, switchable live.
- **Already settled:** the brand. See `DESIGN.md`, `brand/README.md` and the brand guide (https://claude.ai/artifact/Y9NN2gK4BNHJ1pG4Ux8uTs).

## Depop base + Bidd layer

The full teardown, with links, measurements and Depop's real empty-state copy, is in `docs/research/depop-storefront-patterns.md`. Mobbin needs a paid plan, so the research used public screen libraries (Lazyweb, Pageflows, screensdesign) and depop.com.

**Copy from Depop as-is:**
- **Grid:** 2 columns, 16pt margins, 8pt gaps. Card = photo plus three left-aligned lines underneath: brand / size / **price**, with an outline heart top-right on the photo. No title, condition or seller on the card.
- **Search:** results chips (filter button, Sort by, applied filters as black chips with ✓); a filter sheet with a "My sizes" toggle and a live result count; Save search.
- **Product page:** full-width 1:1 photo, "BRAND • CATEGORY", "Size M • Excellent condition", seller row, and a sticky bottom bar with price and a black **Buy**.
- **Shop page:** trust line ("21 sold · Active today"), Active / Sold split, and a SOLD overlay on sold photos.
- **Sell:** a plain + in the middle of the bottom nav opens a full-screen form.
- **Empty states end in an action** ("List your first item"). Depop's dead end on someone else's empty shop ("Check back later") is the one to beat.

**The structural change:** Bidd has no DMs, so **Depop's Inbox tab becomes the Closet Cup.** Bottom nav: Home · Discover · Sell (+) · Cup · Closet.

**Where each Bidd feature plugs in.** The `v` lab switch flips between the picks and the alternatives.

| Feature | `v=a` (recommended pick) | `v=b` (alternative) |
|---|---|---|
| Campus color | B1DD top-left above search on Home; fills only the active chip, drop banner and the 1 | B1 mark inside the search bar |
| Chapter closet gate | Blurred grid tiles under an inline "Enter access code" field | Code entry in a bottom sheet |
| Drops | Campus-color countdown banner at the top of Home; stock chips ("14 left"); button runs Remind me → Pre-order → Sold out | Countdown under the chapter closet header, with a SNKRS-style size grid (stock per size, sold-out sizes greyed) |
| Closet Cup | Cup tab: Campus \| SEC toggle, season timer, your chapter pinned in campus color, This week \| Season | A Cup strip on Home and a "+40 pts for [chapter]" stamp after purchase |
| Moment tags | Sticky chip row between search and grid on Home | Discover opens on "Shop by moment" |
| Campus verified | Trust line: "✓ UA verified · 21 sold · Active today" | A black check on the avatar |
| Handoff | "Get it" choice at checkout: Exchange Spot (free) or MSC locker | Order screen becomes a full-screen QR ticket |
| Buyer fee | List price on cards, "+$1.70 buyer fee" under Buy, "You keep $24 · 0% seller fee" when selling | All-in price on cards |
| Philanthropy | A "10% → [philanthropy]" chip on the drop | A "$1,240 raised" counter after launch |

`v=c` is a **drop-first Home**: the SNKRS-style live drop takes the top of the feed, with the Depop grid below it.

**Drop from Depop:** Inbox/DMs, follow counts, Find friends, public likes (keep one private Saved list), hashtags (moment tags replace them), boosted listings and promo cards. Also drop off-palette color: red dots, green "Active" dots, blue links, emoji.

**One conflict to settle:** Depop cards use **3:4 portrait** photos, while `DESIGN.md` says square crops. The lab gets a `card=square|portrait` switch, so Quinn picks by looking.

**Pitch notes from the research** (verify before using):
- Depop US also charges sellers 0% and buyers a fee, close to Bidd's model.
- A depop.com search for "sorority rush dress" showed about 3.97K results on 2026-10-17.
- Depop is recruiting campus managers.
- White Fox is a real brand: label the drop as a demo and never use their logo.

## The lab panel

A small floating panel, shown when the URL has `?lab=1` (remembered in localStorage). Every control writes to the URL, so any combination is a link you can send to Rowan and the screenshot matrix can loop through it.

| Param | Values | What it changes |
|---|---|---|
| `school` | the 16 SEC slugs from `mock/campuses.json`, plus `none` (before sign-in) | campus colors via `campusTheme()`, campus name, feed contents |
| `state` | `full` (about 40 items), `few` (3), `empty`, `loading` | how much data the page gets |
| `v` | `a` (Depop base), `b`, `c` | where the Bidd features sit (see the placement map above) |
| `card` | `square`, `portrait` | listing photo shape: the brand's 1:1, or Depop's 3:4 |
| `duo` | `off`, `pair`, `tape`, `jersey` | how the school's second color shows (see "Two campus colors") |
| `logos` | `official`, `badge`, `off` | official school logos, Bidd's own type badge, or none. Also the kill switch if logos become a problem. |
| `drop` | `upcoming`, `live`, `low`, `soldout`, `ended` | drop page phase |
| `gate` | `locked`, `unlocked` | chapter closet access-code gate |
| `viewer` | `member`, `visitor`, `officer` | what the viewer can see and do |

The panel also gets a **Copy link** button and a **Copy settings** button that copies the JSON, the same way the logo lab handed off the pick.

## School logos (demo only)

Quinn's call: use the real logos for the hackathon and sort out permission later. The exception is recorded in `PRODUCT.md`, and the brand rule now reads "never lock up the Bidd logo with a school logo".

- **Source:** each row in `mock/campuses.json` has `logo_url` and `logo_url_dark` (hosted PNGs, 500px, transparent). All 16 were checked by eye. The deployed demo loads them by URL, so no logo file ever enters the public repo. Local copies for offline work are in `mock/logos/`, which is gitignored.
- **Before judging:** upload the 32 files to the Supabase storage bucket and point `logo_url` there, so the demo doesn't depend on someone else's CDN.
- **Where they appear:** the campus header on the feed, the campus picker in the lab panel, Closet Cup rows (especially the SEC view), and the sign-in confirmation ("ua.edu → Alabama, verified").
- **Where they never appear:** inside or touching the B1DD logo, on drop merch, or in the Instagram/deck templates.
- **On a campus-color field or black,** use `logo_url_dark`.
- **`logos=badge`** is the fallback: the school's short name in Archivo caps on its campus color. It works for any new campus with no file at all.

## Two campus colors

Every school has two colors, and today Bidd only shows the primary. The proof sheet (`docs/duo-proof.png`) runs four modes across six schools with very different secondaries: Alabama gray, Ole Miss red, LSU gold, Tennessee white, Georgia black, Vanderbilt near-black. In every mode, **the logo's 1 stays one color**.

| `duo=` | What it does | Verdict from the proof |
|---|---|---|
| `off` | Primary only, as today | Clean, but every school looks single-color |
| `pair` | A two-tone campus dot (header, picker), and the secondary as the second data series (Cup "last season", stock bars) | Subtle. White secondaries need a hairline to show on white. |
| `tape` | A **varsity stripe**: a thick primary band and a thin secondary band, like sleeve stripes on a jersey. It runs under the campus header and along drop banners. It sits on whichever neutral the secondary stands out from more: black tape for gray, white or gold secondaries, white tape for black ones. | **Recommended.** It reads for all 16 schools, it's pure sportswear (Nike and Supreme territory), and it never touches type contrast. |
| `jersey` | The secondary colors the big display type on campus fields (drop banner headline, countdown, active chip), but only where it clears 3:1 | Striking where it works (LSU gold on purple, Georgia black on red). It silently falls back to normal for Alabama, Ole Miss, Tennessee and Vanderbilt, so it's school-dependent. |

To build: add two derived values to `campusColors()` in `brand/theme/campus.ts`. `campusTapeGround` is ink or paper, whichever contrasts more with the secondary. `campusJersey` is the secondary if it clears 3:1 on the primary, otherwise `campusInk`. Expose them as `--campus-tape-ground` and `--campus-jersey`. The lab's `duo` switch then only toggles classes.

## What an empty site looks like

Every one of these gets designed, not left to chance. The empty states are where a new campus first meets Bidd.

1. **New campus, zero listings.** This is the new-campus-deploy moment from the demo, e.g. Vanderbilt's first sign-in. The campus color is already applied. Headline idea: "Be the first 1 at Vanderbilt." Actions: post a piece, or start your chapter's closet.
2. **Filter with no results** (Formal, size S). Say what's empty and offer the nearest filter, or clear it.
3. **Your own closet, empty.** "Post your first piece. It takes 30 seconds." Opens the sell flow.
4. **Someone else's closet, empty.** Short and neutral, with a link back to the feed.
5. **Chapter closet not set up.** Officers get "Set up your chapter closet"; members get "Your chapter hasn't opened its closet yet."
6. **Chapter closet locked.** This is the access-code gate, which isn't an empty state but needs the same care.
7. **Drop phases:** upcoming (countdown, notify me), live, low stock ("6 left"), sold out ("48 of 48 claimed"), ended.
8. **Closet Cup at season start.** All chapters at 0: "The Fall Cup starts with the first sale."
9. **Sold listing** on a card and on its page.
10. **Loading** skeletons in the shape of the real grid.
11. **Before sign-in**, black and white only, where the 1 is ink.

The copy goes through Rowan; `build.md` already lists empty-state text as Rowan's job.

## Mock data

Files live in `mock/`, shaped like the Supabase tables in `build.md` (same snake_case columns). That way, hooking up later only changes the data layer, not the pages.

- `mock/campuses.json`: all 16 SEC schools with verified colors, email domains and logo URLs (see Research). The table needs `logo_url` and `logo_url_dark` columns; tell Rouan.
- `mock/photos.json` + `mock/photos/`: 46 curated stock photos, split into `resell`, `drop` and `empty` (see Research)
- `mock/chapters.json`: 6–8 chapters per campus, with the same national orgs on every campus so the SEC view of the Cup works
- `mock/listings.json`, `mock/drops.json`, `mock/cup.json`: generated by a small seeded script, so every campus gets its own believable feed from the same photo pool

Pages read through one module, `lib/data.ts`, with `getFeed(campus, filters)`, `getCloset(slug)`, `getDrop(id)` and `getCup(campus | "sec")`. Today it reads JSON. Later, Rouan swaps in Supabase behind the same functions.

**Where the code goes:** a self-contained Next.js app (App Router, Tailwind v4, shadcn/ui) with the brand kit imported (`brand/theme/bidd.css`, `fonts.ts`, `campus.ts`, `react/bidd-logo.tsx`). If Rouan's skeleton is pushed by then, build inside it. If not, build in `storefront/`; moving it later means copying `app/`, `components/` and `lib/` folders.

## How to test it

1. **Live, while building:** `next dev` with the lab panel. Flip schools and states and watch the page repaint.
2. **Options in the browser:** run Impeccable's `live` mode on the running dev server. Pick an element (listing card, closet header, drop banner), ask for variants, and accept one. This is the in-app version of the logo lab.
3. **On a real phone:** run `next dev -H 0.0.0.0` and open `http://<laptop-ip>:3000/?lab=1` on the same Wi-Fi. Hackathon Wi-Fi often blocks device-to-device traffic, so the fallback is a Vercel preview deploy.
4. **Every school at once:** `tools/shots/matrix.mjs` screenshots every page × school × state × width and builds a contact sheet. It flags console errors and sideways scroll. This is how you catch a campus whose colors break something without clicking through 16 schools.
   ```
   cd tools/shots && npm install
   node matrix.mjs --paths /,/c/demo-chapter,/drop/demo --schools all --states full,empty --widths 390,1440
   ```
   In Git Bash, prefix with `MSYS_NO_PATHCONV=1`, or the paths get rewritten. Output goes to `.impeccable/review/matrix/index.html`.
5. **The demo path:** Rowan clicks through `build.md` steps 2–7 using lab links: `?school=ua`, then `?school=olemiss`, then `?school=vanderbilt&state=empty` for the new-campus moment.
6. **Five-minute hallway test** with 2–3 students, three tasks: find a gameday dress in size S under $40; open your chapter's closet; pre-order a size in the drop. Note where they hesitate.

## Suggested session plan (about 90 minutes)

| Minutes | Step |
|---|---|
| 0–10 | Scaffold (or open Rouan's app), import the brand kit, add `mock/` and `lib/data.ts` |
| 10–40 | Campus feed (Depop base) with listing cards, moment-tag chips, drop banner and the lab panel |
| 40–60 | Seller closet + chapter closet (shared closet layout, gate state) |
| 60–75 | Drop page (all phases) |
| 75–85 | Empty states pass, then run the screenshot matrix |
| 85–90 | Phone check, then send Rowan the lab links |

## Open questions for next session

- **Chapter names in mock data:** real national org names as plain text (nominative use; never letters, crests or Greek characters), or invented ones? Real names make the SEC rivalry land in the pitch. `PRODUCT.md` forbids using the marks, not naming a chapter.
- **Seller closet route:** `/c/[slug]` covers personal, chapter and brand closets in `build.md`. Do we keep one route with three headers?
- Does Rouan's skeleton exist yet?

## Research

### The 16 SEC campuses (`mock/campuses.json`)

Colors come from each university's own brand page. Sources and caveats are in each row's `notes`. Every school passes the campus rules: text on the fill is 4.6:1 or better, and the 1 clears 3:1 on its ground and 0.3 from the letters.

| School | Fill | Text on fill | The 1 on white | The 1 on black |
|---|---|---|---|---|
| Alabama | `#9E1B32` | white 7.9:1 | `#9E1B32` | `#B33242` |
| Arkansas | `#9D2235` | white 7.7:1 | `#9D2235` | `#AB3040` |
| Auburn | `#0B2341` | white 15.8:1 | `#084F9C` | `#2061AF` |
| Florida | `#FA4616` | black 5.6:1 | `#FA4616` | `#FA4616` |
| Georgia | `#BA0C2F` | white 6.6:1 | `#BA0C2F` | `#C11A35` |
| Kentucky | `#0033A0` | white 10.6:1 | `#053AA7` | `#2459C8` |
| LSU | `#461D7C` | white 12.2:1 | `#56308F` | `#714EAF` |
| Ole Miss | `#14213D` | white 16.0:1 | `#274A9C` | `#375CB0` |
| Mississippi State | `#5D1725` | white 13.0:1 | `#8A2138` | `#A53B4D` |
| Mizzou | `#FDB719` | black 11.2:1 | `#BF8805` | `#D59A12` |
| Oklahoma | `#841617` | white 10.0:1 | `#8B1E1D` | `#A53933` |
| South Carolina | `#73000A` | white 12.1:1 | `#8D2322` | `#A83D38` |
| Tennessee | `#FF8200` | black 7.9:1 | `#E47300` | `#FF8200` |
| Texas | `#BF5700` | white 4.6:1 | `#BF5700` | `#BF5700` |
| Texas A&M | `#500000` | white 15.7:1 | `#8D261D` | `#A83F33` |
| Vanderbilt | `#CFAE70` | black 9.3:1 | `#BC8B0B` | `#D19D24` |

Things to know:
- **Ole Miss uses navy as its primary for the demo,** to match the kit. Officially, red `#CF142B` is the primary and navy `#142142` the secondary; both are kept in the row as `official_*`. Two red-ish campuses side by side would hide the tenant swap.
- **Email domains:** most are verified. Mizzou's `umsystem.edu` is shared by all four University of Missouri System campuses, and `tennessee.edu` by the whole UT System, so the domain alone doesn't prove which campus. Texas students use `my.utexas.edu`. Alabama uses `crimson.ua.edu`, and Ole Miss uses `go.olemiss.edu`.
- **Six schools have a white secondary** (Arkansas, Kentucky, Oklahoma, Tennessee, Texas, Texas A&M). The tape mode handles that by printing on black.
- **Greek member counts** are filled where a reliable source exists, and `null` otherwise.

### Stock photos (`mock/photos.json`, `mock/photos/`)

There are 46 photos, downloaded into the repo at 1000px. The demo doesn't depend on outside image servers, and every file carries its source in its metadata. Credits are in `mock/photos/CREDITS.md`. Both licenses (Pexels, Unsplash) allow free commercial use with no attribution required; credit is a courtesy. Every photo was checked for logos, letters and readable labels.

| `context` | Count | Look |
|---|---|---|
| `resell` | 33 | Real secondhand listings: hangers, flat lays, clothes on a bed. Rush and day dresses 5, gameday 5, formal 5, casual 4, menswear 6, shoes and bags 5, accessories 3. |
| `drop` | 10 | New blank merch: hoodies, crewnecks, a tee 3-pack, a cap, a tote, plus 3 wide banner shots (hoodie row, tee rack, three-color rail). The app overlays the drop name. |
| `empty` | 3 | Empty rack, bare hangers, empty closet, for the empty states. |

Each entry has a suggested title, size, price and moment tags written like a real listing. Drop prices run $30–58. `dominant_color` makes a good loading placeholder.

Weak spots, for when Rowan's photos arrive:
- No logo-free quarter-zip product shot exists. The one resell quarter-zip needs cropping below the jaw.
- No matching sets.
- Two gameday dresses look studio rather than Depop.
- The ivory satin gown could read as bridal.

## Continuation prompt

> Read `docs/storefront-next-session.md`, `DESIGN.md` and `PRODUCT.md`. Build the Bidd mock storefront: Depop-based campus feed, seller closet, chapter closet and drop page, on mock data from `mock/` through `lib/data.ts`, with the `?lab=1` panel (school, state, variant, card shape, two-color mode, logos, drop phase, gate, viewer). Start the Home grid from the Depop rules in this doc, and add `campusTapeGround` / `campusJersey` to `campusColors()` for the two-color modes. Use Impeccable for the build: run its context step, read the craft floor, then do the pages. Start by asking Quinn the open questions in the doc, then work through the session plan. Test with the lab panel, Impeccable `live` mode and `tools/shots/matrix.mjs`.
