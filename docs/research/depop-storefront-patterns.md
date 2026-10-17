# Bidd storefront patterns: Depop base + Bidd layer

Research brief for Bidd ("the closet for SEC Greek life"), compiled 2026-10-17.
Direction (from the coordinator): build the storefront on Depop's structure and add Bidd's own features on top. Nike SNKRS covers drops and Duolingo/Strava cover the leaderboard, because Depop has no real equivalent for either.

## Sources and how this was done

- **Mobbin was not available.** `search_screens` and `search_flows` both returned "Mobbin MCP requires a paid plan", and mobbin.com returns 403 to direct fetches. As a result this brief has **no Mobbin links**.
- **Fallback: public screen libraries plus the live Depop site.** I opened and read every screen marked "viewed" below. None are described from metadata alone.
  - **Lazyweb**: Depop iOS captures from 2025-11 and 2026-05, plus SNKRS 2026-05. Full-resolution previews are public.
  - **Pageflows**: Depop iOS recordings, version Sept 2023. It is older, but the frames are public and it is the only source that shows filters, sort, no-results, the empty shop and reviews.
  - **screensdesign.com**: Nike SNKRS (alt text plus blurred previews) and Duolingo.
  - **depop.com**: fetched on 2026-10-17. Shop, search and product pages render server-side, and they embed Depop's **UI string table**. That gives the exact current copy for empty states, sold states, fees and Depop's own "Drops" feature.
- **Measurements** come from pixels on the 1206 px wide Lazyweb captures (iPhone at @3x), so 3 px = 1 pt.

---

## 1. Depop, screen by screen

### 1.1 App shell and bottom nav

- **Bottom nav (2026, viewed):** `Home · Discover · Sell (+) · Inbox · My Depop`. Every tab has an icon and a label. The active tab gets a filled icon and a bold label. Sell is a plain `+` icon in the middle slot, not a raised floating button. Unread Inbox items show a red dot.
- **Bottom nav (2023):** the same five slots with icons only (home, search, ⊕, mail, person).
- **Top bar on Home:** a full-width search pill (`Search for anything`), then a heart (likes) and a bag with a red count badge. **There is no logo on Home** because search takes the top slot. SNKRS, by contrast, puts its wordmark top-left.
- **Theme:** the 2026 captures are in dark mode, and 2023 is light. The chrome is otherwise black and white. Colour shows up only in red badges and stars (2023), green "Active today" dots, a blue "Got it" link, red and light-blue promo cards, and emoji (🎉 🛍️).
- **Type:** Depop's web build loads **Aktiv Grotesk Extended**, a wide grotesk. Bidd's condensed black italic caps will read as clearly different.

### 1.2 Home feed (viewed: [Lazyweb Depop main tabs, 2026-05](https://lazyweb.com/company/depop))

- **Order:** search pill, then the section title **"Suggested for you"**, then an endless **2-column photo grid**.
- **No chips on Home.** Depop puts filter chips only on search and category results.
- **Grid geometry (measured):**
  - **2 columns.** The side margin is **16 pt** (48 px) and the gutter is **8 pt** (24 px).
  - Each tile is about **181 pt wide**.
  - Tiles are **3:4 portrait** (543 × 724 px). The corners are slightly rounded.
- **Card anatomy (2026):** see 1.4.

### 1.3 Discover / Explore (viewed: Lazyweb 2026-05 and 2025-11)

- **Discover tab:**
  - A full-bleed **hero carousel** with a photo, a headline and a sub-line (`Depop Shipping is free / Go find something you love`) and page dots.
  - Then a **"Discover your next look" [New]** module: community-styled outfits in 3 tiles and a `Browse outfits` button.
  - Then **"Shop by category"** as plain list rows (`Men >`, `Women >`).
- **Drill-down:** category pages are full-width text lists with chevrons (`Men > Tops > T-shirts`). The leaf opens the results grid. ([Browse-by-category flow](https://lazyweb.com/flow/depop/browse-by-category), 5 steps.)
- **Occasion curation exists, but it is hidden.** The web nav has "Trending in women's: Festival · Halloween · Homecoming · Party fits · The bridal edit · Wedding guests" and "Trending in men's: Black tie · …". That is Depop's version of moment tags, three levels deep. Bidd promotes this to the primary filter (see §4.5).
- **Demand signal for the pitch (one-day snapshot, 2026-10-17):** a depop.com search for "sorority rush dress" returns **3.97K results**. One listing's copy reads "perfect for rush or sorority events #rush #feminine #sorority". Students already work around Depop with hashtags. The results are dominated by Hello Molly, Showpo, Oh Polly, Princess Polly, Edikted and Aritzia.
- **Competitive note:** Depop's 2026 own-profile screen promotes "Represent Depop on Campus — Become a Depop Campus Manager."

### 1.4 Search results, filters and sort (viewed: Lazyweb 2025-11; [Pageflows Searching, Sept 2023](https://pageflows.com/post/ios/searching/depop/); depop.com)

- **Header:** back arrow, then the query or category title, then heart and bag.
- **Chip row:**
  - A square **filter icon** button that gets a small red dot when filters are active.
  - **`Sort by`** as an outlined chip.
  - Applied filters appear as a **solid black chip with a check**, for example `✓ Category`.
  - In 2023 the chips were contextual dropdowns (`Sort by ▾  Category ▾  Size ▾`) and appeared after a category was chosen.
- **Result count** sits as small grey text above the grid, for example `1,000,000+ results`.
- **Inline info card in the grid** (`Introducing Boosted Listings … Got it`): a dismissible card with a grey fill.
- **Filter sheet:**
  - Rows in the app: `Category: All >`, a **`My sizes`** toggle ("You can change these in Settings"), `Size` (it summarises saved sizes: "Tops (8) Bottoms (UK 10) Shoes (UK 7.5)"), `Price: Any >` and `Where: Worldwide >`.
  - On the web: Category, Brand, Price, Size, Color, Condition, On sale.
  - The footer button shows a **live count**: `3.97K items found` / `View items` / `Clear all`. With zero matches it is disabled and reads `No items found`.
- **Sort sheet:** `Relevance ✓`, `Price: low to high`, `Price: high to low`, `Newly listed`.
- **Save search sheet:** "Turn on notifications to get daily alerts when there are new results for this search", with `Search: white shirt`, `Filters: None`, a `Push notifications` toggle and `Save`. The heart or star in the search pill opens it.

### 1.5 Listing card anatomy (viewed; exact)

| Element | 2026 (current) | 2023 |
|---|---|---|
| Photo | 3:4 portrait with small page dots at the bottom centre (the card swipes) | 3:4, same dots |
| Like | **Outline heart top-right on the photo, with the like count under it** | Heart and count bottom-right on the photo |
| Brand | Line 1 under the photo, regular weight (`Nike`, `Other`) | Not shown |
| Size | Line 2, regular (`XS`, `M`, `Multiple sizes`) | Overlaid bottom-left on the photo in white |
| Price | Line 3, **bold** (`$8`). A sale shows the old price and the new price (`$17.00 $12.75`) | Overlaid under the size in white |
| Paid tag | `Boosted`, right-aligned on line 1 (on the photo top-right in 2023) | Same |
| Not shown | Title, condition, seller, time listed | Same |

Takeaways: the hierarchy is **photo, then brand, then size, then price**. The text sits left-aligned in three short lines under the photo. Depop moved the size and price off the photo between 2023 and 2026. Text on photos is hard to read on busy shots, so put Bidd's text under the photo too.

### 1.6 Product page (viewed: [Make-an-offer flow](https://lazyweb.com/flow/depop/make-an-offer), 2025-11; depop.com product page)

The page reads top to bottom:

1. The **hero photo is 1:1 square and full-bleed** (1206 × 1206 px measured) and swipes. Up to 8 photos are allowed.
   - A column of **round floating buttons** sits on the right edge: `⋮` more, an outfit/style icon, a bookmark (save) and a heart with its count.
2. `NIKE • SWEATSHIRTS` in small bold caps (brand • category).
3. `Men • Size XS • Excellent condition` in grey.
4. **Social-proof chips:** `🛍 In 2 people's bags · 💬 3 offers sent`.
5. **Seller row:** avatar, username and a ✉ message icon. On the web this adds `21 sold · Active today · ★ (7)`, `Visit shop` and `Ask a question`.
6. The description in the seller's voice, with **hashtags** (`#nike #crewneck #vintage`).
7. `4 MONTHS AGO` in caps, then the colour (`BLACK ●`).
8. Web only: "This seller often ships in 3 days", Buyer Protection, and **"You might also like"**.
9. **Sticky bottom bar:** the price on the left (`$18`), an **outlined `Offer $14.40`** button and a **solid black `Buy`** button.
   - After the item goes in the bag, `Buy` becomes `View bag` and a tooltip on the bag icon says **"Find it here"**.

**Offer sheet:**
- It shows the item thumbnail, the size and `Current price: $18.00`.
- Three preset tiles: `22% off $14.00 · 20% off $14.40 (Recommended, green) · 17% off $14.90`.
- A `Your offer` field with a numeric keypad, and `Send offer`.
- Disclaimer: "An offer is not a payment. If the seller accepts you'll have 24 hours to buy…"

### 1.7 Shop / profile page

**Another seller's shop (depop.com, 2026-10-17, real seller; handle omitted):**
- `h1 handle`, then `★ (7)` (rating with review count), `21 sold`, `Active today` (or `Active this week` / `Active over a week ago`).
- `Followers 4 · Following 4`, then **`Follow`** and a **message** button.
- Location and bio ("Maryland · Message before buying!!").
- **Tabs: `Shop | Likes`.** Inside Shop there is an **`Active` / `Sold items`** split.
- Seller-side controls (strings): `Rearrange`, `Manage listings`, **`Move sold items down`**.
- Depop's "Verified partnership" badge appears on the shop header for invite-only brand and creator shops ("Look for the verified partnership badge on a seller's shop to know it's official").

**Reviews ([Pageflows Buying flow, 2023](https://pageflows.com/post/ios/buying-something/depop/)):**
- A separate page with tabs `Sold | Purchased`.
- Each row shows: avatar, username, 5 stars, `1 HOUR AGO`, a one-line comment, and the **item thumbnail on the right**.
- Strings: "Reviews for items @x has sold" / "…has purchased".

**Own profile, "My Depop" (2026, viewed: [Set-up-selling-payouts flow](https://lazyweb.com/flow/depop/set-up-selling-payouts)):**
- Centred handle title with `+` and `☰`.
- **Tabs: `Shop · Sold · Purchases · Likes`**.
- Avatar next to the stats `0 followers · 0 following · ★ no reviews`.
- **Earnings card:** `$0 earned, Last 30 days | $0 potential revenue, From 0 active listings >`.
- A promo card (red "Depop Campus Manager").
- Then `Active (0 listings)` with a filter icon, then the grid or the empty state.
- In 2023 the tabs were `Shop · Likes · Saved · Reviews`. The header showed name, @handle, stars and ⚡`ACTIVE TODAY`, with followers/following and `Find friends`.

**Selling Hub on the web:** `Overview · Selling · Sold · Drafts · Stats · Boost listings · Bulk listing · Payments · Vacation mode`. It also shows `Active items (n)`, `Sold items (n)`, `Weekly stats`, "{n} to ship / Ship now", and `Hey, {username}` with `List an item`.

### 1.8 How sold items look

- **The overlay is the word `SOLD`** on the photo (string `ImageOverlay = SOLD`; it also marks sold-out items in the bag: "Sold out from this seller · Remove sold out items").
- A 2017 review describes sold listings in shops "with a yellow sold sign across them". I could not view the current overlay styling, so treat its exact look as unverified.
- Sold items **stay in the shop by default**. Sellers can **"Move sold items down"**, and the shop splits `Active / Sold items`. The owner has a dedicated **Sold** tab.
- "Want to copy a sold listing?" lets a seller relist with one tap.
- For Bidd: a SOLD overlay in black and white is a strong closet pattern, because sold items work as social proof that a closet moves.

### 1.9 Bag, checkout and fees (viewed: [Checkout-item-in-bag flow](https://lazyweb.com/flow/depop/checkout-item-in-bag))

- **Bag:**
  - Items are **grouped by seller**: avatar, handle, `● Active today`, `1 item`, then the price and `+ $11.99 shipping` on the right.
  - A photo tile has the **price bottom-left and the size bottom-right overlaid**.
  - A dashed **"+ Add more items to make a bundle"** tile, `🛍 In 1 person's bag`, then `Make offer` / `Checkout`.
- **Checkout:** the item row, `Ships to: Add new address >`, `Payment type` (Apple Pay, card), `Buy with  Pay`, and "This payment will be processed by Stripe".
- **Order complete (2023):**
  - The headline is green: **"You got it"**. Then "We've let the seller know…".
  - "Sellers usually ship within 5-7 days", "Check order details on your receipt", then a **Message the seller** field.
- **Fee model and display (strings):**
  - US Depop now charges **0% seller fee** (sellers still pay processing). Buyers pay a **Marketplace fee**, reported as up to 5% plus up to $1 (EcommerceBytes and Vendoo). **That is nearly the same model as Bidd's 0% seller fee with buyer 5% + $0.50.**
  - Display copy: `{price} including fees`, `incl. marketplace fee`, `Incl. fees & shipping`, and a `Marketplace fee` line with an explainer ("This fee powers your Depop experience… Depop Protection · Customer support · New features").
  - Seller-side banner: "No selling fees on Depop / Payment processing and boosting fees still apply".

### 1.10 Sell entry point (viewed 2026; Pageflows Sept 2023)

- **The centre `+ Sell` tab opens a full-screen "Sell an item" form.** It is not camera-first.
- **Header:** `✕ · Sell an item · [copy] [drafts folder]`.
- **Photos:** `Add photos (Up to 8)` as a row of dashed camera slots, plus a `Read our photo tips` link.
- **Description:** a text area ("eg. small grey Nike t-shirt, only worn a few times") with a hashtag counter (`Hashtags: 5`) and a 1000-character counter.
- **Info:** `Category`, `Brand` and `Condition`, each as an outlined **`Select` pill**. Below that come price, shipping, colour and style.
- **Sticky footer:** `Save to drafts` (outline) and `Post listing` (solid, disabled until the listing is valid).
- **First-run gates:** a location permission prompt on entry ("Depop uses location data to match products with users who are looking for items near them"). In 2023 it also asked to set up shop, enter a birthday and add billing. Setting up payouts is a separate 3-step flow.
- **Nudge string:** "Not sure what to sell? **Repop** any of your previous purchases, and we'll prefill the listing for you."

### 1.11 Empty states (exact copy and its next action)

| Situation | Depop copy | Next action | Grade |
|---|---|---|---|
| Own shop, no listings (app 2026) | "🎉 No more selling fees 🎉 / Payment processing fees still apply." | `Start selling` | Good. It sells the reason to list |
| Own shop (app 2023) | "You haven't listed anything for sale yet. Tap ⊕ below to get started." | Points at the tab bar | OK |
| Selling hub | Three grey skeleton tiles above a full-width button | **`List your first item`** | Good. It shows where items will land |
| Selling hub (web) | "There's nothing here yet / Want to sell on Depop? List an item to get started!" | `Get listing` | Good |
| Another seller's empty shop | "@{username} isn't selling anything yet. Check back later." / "@{username}'s shop is sold out." / "…hasn't sold anything yet." | none | **Weak, a dead end** |
| No search results (app) | "No results found / Please try another search term" | Save search, as a separate sheet | Weak |
| No search results (web) | "No results found / Try using different filters to see more options." | `Search Depop` | OK |
| Filter sheet, zero matches | The footer button turns disabled and reads `No items found` | (prevents the empty state) | **Great, borrow it** |
| Likes / Saved | "You don't have any likes yet" · "Items you like will appear here." · "Only you can see your saved items." | "Search to find something you like." `Search Depop` | Good |
| Bag | "Your bag is empty / **But not for long.**" | (none in the string table) | Good voice |
| Sold | "You have no sold items yet / Once you've sold an item, you'll find it here" | none | OK |
| Reviews | "You haven't had any reviews yet. Start selling to get reviews!" | implied | OK |
| New user's feed | "You're in! Start browsing to see picks you'll love. Every search helps tailor your feed." / "Shop your style: Unlock your personalized feed in seconds." | `Start browsing` / `Start quiz` | Good |

Rule for Bidd: **every empty state ends in a verb.** Depop's weak spot is looking at someone else's empty shop. On Bidd that becomes "Get notified when [chapter] drops" or "Shop the [campus] closet."

### 1.12 Depop already has "Drops" (strings only; I could not view the screens)

- **Buyer side, on the seller's shop:**
  - "Don't miss {firstName}'s drop!" / "As soon as the drop's live, you can shop right here."
  - A countdown in **Days · Hours · Minutes · Seconds**, with a **`Remind me`** button.
  - After tapping: "Reminder set for {firstName}'s drop / We'll remind you closer to the time."
  - Once live: "{firstName}'s drop is now live! / Shop your faves before they're gone."
  - Guests see "Ready for {firstName}'s drop? Sign up now to be first in line."
- **Seller side:** scheduled drafts appear as "View {name} drop, scheduled for {date}", "Remove this draft from the scheduled drop", and "Cannot delete drop within {minutes} minutes of scheduled publish time".
- **Why it matters:** Depop's structure already reserves a **countdown module on the shop page**, and Bidd's chapter drop can plug in exactly there. Depop has no stock count, size-run picker or pre-order, so those come from SNKRS.

### 1.13 Depop measurements cheat-sheet

| Spec | Value |
|---|---|
| Feed, search and likes grid | 2 columns, 16 pt margins, 8 pt gutter |
| Grid image | 3:4 portrait, slight corner radius, swipe dots |
| Product hero | 1:1 square, full-bleed, up to 8 photos |
| Card text | 3 lines under the photo: brand / size / **price (bold)** |
| Like | Outline heart and count, top-right on the photo |
| Bottom nav | Home · Discover · Sell (+) · Inbox · My Depop, with labels |
| Primary button | Solid black pill or rectangle. The secondary is outlined black |
| Applied filter chip | Solid black with ✓ |
| Sold | `SOLD` overlay on the photo, plus an Active/Sold split and a Sold tab |

---

## 2. Supporting pattern: the drop page (Nike SNKRS)

Depop's drop is only a countdown on a shop. SNKRS supplies the rest. Sources: [Lazyweb SNKRS](https://lazyweb.com/company/snkrs) (viewed, 2026-05) and [screensdesign SNKRS](https://screensdesign.com/apps/nike-snkrs-sneakers-apparel/) (blurred previews plus alt text).

- **Nav:** `Feed · In Stock · Upcoming · Maps · Profile`. The **SNKRS wordmark is top-left in condensed heavy italic**, the Bidd equivalent of putting B1DD top-left.
- **Feed card:**
  - An editorial product shot on a light ground.
  - A two-tier title: model in small type (`Kobe 5 Protro x Caitlin Clark`), colourway large (`Coconut Milk and Bright Spruce`).
  - Share, then a `Notify me` pill.
  - Poster cards like **"THIS WEEK IN SNKRS"** in red condensed caps over a date grid. That is the Nike energy Bidd's headlines want.
- **Upcoming Drops list:**
  - Grouped `Today's Drops` / `Tomorrow`.
  - Each row: a square image on the left, then `10:00 AM`, the name and the colourway.
  - A **state pill** on each row: `Notify me` → `Buy Now` → `Sold out` (disabled grey).
- **Launch product page:**
  - A carousel across the top half, the model line small, the colourway big, the price.
  - **"Available January 09 at 11:00 pm"** and the size range (`W 3.0 / M 5 – W 18 / M 17.5`).
  - A **full-width sticky state button** that moves through `Notify me` → `Buy` or `Enter Draw` → `Draw closed` (disabled) → `Launch Ended` (disabled).
- **Size sheet:** `Select Women's Size` above a **4-column grid of size cells**. Sizes that are gone are greyed out but stay in place. A `Continue` pill sits at the bottom. SNKRS also stores a profile size (sizes 3.5–18).
- **Not in SNKRS: a stock count.** Bidd should add one. Chapter runs are small, and "6 left" is the point.
- **Borrow:** the state-machine button, the "available at" timestamp, date-grouped upcoming rows, the greyed-in-place sold-out sizes, and the condensed caps poster card.
- **Do not borrow:**
  - Draw/raffle mechanics. Bidd drops are first-come or pre-order.
  - The dead end at "Launch Ended". Bidd turns it into **Pre-order** or "Get notified for the restock".

## 3. Supporting pattern: leaderboards for the Closet Cup

- **Duolingo Leagues** ([mechanics teardown](https://duolingo.deconstructoroffun.com/mechanics/leagues), [screensdesign Duolingo](https://screensdesign.com/apps/duolingo-language-lessons/)):
  - A **time-boxed** weekly board of about 30 people with a countdown to the end.
  - Labelled divider lines in the list (**"PROMOTION ZONE"**, "DEMOTION ZONE").
  - A top-3 banner ("The top 3 learners win a prize. Keep going!") and a "Last chance to get promoted!" push.
  - A **locked empty state** that names the unlock action ("finish N lessons to unlock leaderboards").
  - **Borrow:** a season timer ("Fall Cup ends in 23 days"), a divider ("Top 3 take the Cup"), your chapter's row highlighted and pinned, and a locked state built around a verb.
- **Strava club leaderboards** ([support article](https://support.strava.com/hc/en-us/articles/216918347-Clubs-on-Strava)):
  - A ranked member list with **sortable stats for the current and previous week**, reset Sunday 11:59 pm.
  - **The app shows the top 10**, the web the top 100.
  - **Borrow:** a two-period toggle (`This week | Season`), a sortable metric (points / items sold / lbs), and top 10 plus your row on mobile.

---

## 4. Depop base + Bidd layer map

Skeleton: keep Depop's shell (search-led Home, 2-col 3:4 grid, Discover drill-down, 1:1 product page with a sticky buy bar, shop header plus grid). Then make one structural swap: **`Inbox` → `Cup`**. Bidd has no DMs, so the fourth tab slot is free, and the Cup takes it.

Proposed nav: `Home · Discover · Sell (+) · Cup · Closet` (Closet replaces My Depop).

### 4.1 Campus theming (campus colour fills only the active chip, the drop banner and the 1 in the logo)

- **Plugs into:** three things.
  - Depop's **applied-filter chip** (solid black with ✓), which becomes campus fill.
  - Depop's **Discover hero banner** and the shop drop countdown, which become the campus-fill drop banner.
  - The logo, which Depop doesn't show on Home.
- **Option A, logo above search:** a 44 pt top bar with **B1DD top-left** (SNKRS-style), with search, saved and bag in a row beneath. It is the most visible tenant swap for the demo.
- **Option B, logo inside the search row:** the **B1** mark replaces the search icon at the left of Depop's search pill (`B1 | Search Alabama…`). It is more compact and keeps Depop's search-first Home.
- **Recommendation:** use A on Home and B on inner pages.
- **Everything else stays black and white:**
  - Badges, dots and stars are black. Depop's red dots, green "Active" dots and red stars go.
  - Text on the campus fill switches between black and white per tenant to keep WCAG AA.

### 4.2 Chapter closets with an access-code gate

- **Plugs into:** Depop's **shop page**. A chapter closet is a shop: header, trust line, `Active / Sold items` grid. Its avatar is a campus-fill block with the chapter name set in Bidd type. Per PRODUCT.md, no Greek letters, crests or university marks.
- **Option A, inline gate on the closet:**
  - Header and trust line are visible ("Alpha … · UA · 312 sold").
  - The grid below shows blurred or silhouette 3:4 tiles behind an **`Enter access code`** field and button.
  - This mirrors Depop's guest drop state ("Sign up now to be first in line"), with the code in place of the sign-up.
- **Option B, bottom-sheet gate:** tapping a chapter row in Discover or a locked drop opens a sheet modelled on Depop's **Make-an-offer sheet**: item thumbnail, a large code field, the numeric keypad, and `Unlock closet`.
- **Recommendation:** A for the demo, because it shows the gate and the closet together. Discover should list chapters under a "Chapter closets" row with 🔒 shown in black and white.

### 4.3 "White Fox × chapter" drops (countdown, stock, pre-order)

- **Plugs into:** Depop's **shop-page drop countdown** (§1.12) and the **product page sticky bar** (§1.6), extended with SNKRS's state button and size grid (§2).
- **Option A, Home banner plus drop page:**
  - A full-width **campus-fill drop banner** sits at the top of Home, where Discover's hero carousel would go: condensed caps title and a `D · H · M · S` countdown.
  - It opens a drop page: a 1:1 hero, a SNKRS-style two-tier title (`WHITE FOX × [CHAPTER]` small, product name large), "Drops Thu 8 PM".
  - **Stock chips go in the slot Depop uses for social proof:** `14 left · 3 sizes low` instead of `In 2 people's bags`.
  - The sticky state button runs `Remind me` → `Buy $48` → `Pre-order · ships Nov 8` → `Sold out`.
- **Option B, drop lives on the chapter closet:**
  - The countdown module sits **under the closet header**, exactly where Depop places "Don't miss {name}'s drop!".
  - Drop items fill the grid with a `DROP` tag.
  - Stock shows **inside each size cell** of a 4-column SNKRS sheet (`S · 4 left`). Sizes at zero are greyed in place, and a `Pre-order` row sits under the grid.
- **Recommendation:** A for discovery and B for the detail. Upcoming drops on Discover should use SNKRS's date-grouped rows (`Tonight · Thu · Next week`).
- **Caution:** White Fox is a real brand. Per PRODUCT.md, partner names in the demo are seed content. Label the drop as demo content and do not use White Fox's logo.

### 4.4 The Closet Cup (every sale earns chapter points; campus and SEC views)

- **Plugs into:**
  - The **freed Inbox tab** for the board itself.
  - Depop's **"You got it" order-complete screen** for per-sale feedback.
  - The **earnings card on My Depop** for personal contribution.
- **Option A, Cup tab (Duolingo-style):**
  - A `Campus | SEC` segmented control styled like Depop's underlined tabs, and the season timer "Fall Cup · 23 days left".
  - Ranked rows: rank, chapter, points, and a ▲▼ change.
  - **Your chapter's row in campus fill, pinned at the bottom when it scrolls off.**
  - A divider "Top 3 take the Cup" and a `This week | Season` toggle (Strava).
  - The SEC view ranks campuses, plus a rivalry filter "Your national org across the SEC".
- **Option B, Cup as a layer on Home and Closet (no tab):**
  - A one-line Cup strip under the search bar ("#3 on campus · 1,240 pts · ↑1 this week →").
  - A `+40 pts for [chapter]` stamp on the order-complete screen.
  - A `Points earned` third column on the closet earnings card.
  - The full board opens from the strip.
- **Recommendation:** use both. A gives the demo a destination, and B makes "every sale counts" visible at the moment of purchase.
- **Empty state:** Duolingo's locked board becomes "No sales yet this season. **List one item to put [chapter] on the board.** `Sell`".

### 4.5 Moment tags (Rush, Bid Day, Gameday, Formal, Casual, Philanthropy) as the primary filters

- **Plugs into:**
  - Depop's **search chip row**: the moment replaces `Category` as the lead chip.
  - Discover's **"Shop by category"** list.
  - The sell form's **Info `Select` pills**.
  - It also replaces Depop's buried "Trending: Homecoming / Party fits / Wedding guests" and the `#rush` hashtag workaround.
- **Option A, chip row on Home:** a sticky horizontal row of the six moment chips sits **between the search bar and the grid**. Depop has no chips on Home, so this is Bidd's most visible change. The active chip is campus fill and the rest are outlined black. The grid title follows the chip ("Gameday on campus").
- **Option B, moment-led Discover:**
  - Discover opens on **"Shop by moment"**: six full-width rows or poster tiles in condensed caps, with the same list-row drill-down Depop uses, then results.
  - In results, the moment is the first chip, followed by `Size · Price · Sort by`. `My sizes` stays as a toggle, like Depop's.
- **Recommendation:** A on Home and B on Discover, backed by the same tag data.
- **In the sell form:** `Moment` is the first `Select` pill, pre-filled by the AI listing, ahead of Category, Brand and Condition.

### 4.6 Campus-verified badge

- **Plugs into:** Depop's shop **trust line** (`★ (7) · 21 sold · Active today`) and the "Verified partnership" badge slot. On the product page it goes on the **seller row**.
- **Option A, in the trust line:** `✓ UA verified · 21 sold · Active today` on the closet header and the product seller row. Cards stay clean, as on Depop, where cards don't show the seller.
- **Option B, badge on the avatar:** a small black check-disc on the avatar everywhere (closet header, seller row, reviews, Cup rows) with the full text in a tap-tooltip.
- **Recommendation:** A. Keep the check black. It is a trust signal, not an accent, so it must not use campus fill.

### 4.7 QR handoff / Exchange Spot

- **Plugs into:**
  - Depop's checkout **`Ships to` row**.
  - The product page's "This seller often ships in 3 days" line.
  - The **"You got it" order-complete screen**, replacing its "Message the seller" box.
- **Option A, choose at checkout:**
  - `Ships to` becomes **`Get it`**, with two radio rows: `Exchange Spot · [Student Center] · free` and `MSC locker`.
  - The product page shows "Hand off at an Exchange Spot on campus".
- **Option B, the ticket after purchase:**
  - The order-complete screen becomes a full-screen **QR ticket**: "YOU GOT IT" in condensed caps, the QR, the Exchange Spot name and a time window.
  - The seller gets a "Scan to confirm" screen.
  - It is also reachable from a `Purchases` tab in Closet (Depop has a Purchases tab).
- **Recommendation:** use both. A sets the expectation and B is the demo moment.

### 4.8 Buyer fee display (0% seller fee; buyer pays 5% + $0.50)

- **Plugs into:**
  - Depop's **`incl. marketplace fee` / `Marketplace fee` line** at checkout.
  - The **"No selling fees" card** on the empty shop.
  - Depop's model is almost the same as Bidd's, so buyers will recognise it.
- **Option A, list price everywhere, fee shown once:**
  - Cards and the product page show the item price.
  - The sticky bar's second line reads `+$1.70 buyer fee`.
  - Checkout lists `Buyer fee (5% + $0.50)` with a short explainer.
  - The sell form's price field says **"You keep $24.00 · 0% seller fee."**
- **Option B, all-in price:** cards show `$25.70` with `incl. fee` underneath, the way Depop shows `{price} including fees` in some markets.
- **Recommendation:** A. It keeps cards clean and puts "0% seller fee" on the seller side, where it sells listings. The empty closet card becomes "0% seller fee. List in 30 seconds." with `Sell`.

### 4.9 Philanthropy tag on drops

- **Plugs into:** the drop banner and the **social-proof/stock chip row** on the drop product page.
- **Option A, chip:** `10% → [chapter philanthropy]` sits in the chip row next to the stock count, outlined black.
- **Option B, raised counter:** a line under the drop title, "Supports [philanthropy] · $1,240 raised". After launch the counter climbs, in the spirit of Depop's "now live!" state.
- **Recommendation:** A before launch and B after. Use the Philanthropy moment tag so these items also show under that filter.

### 4.10 Lbs kept out of landfill (P1)

- **Plugs into:** the closet **earnings card** (`$ earned · potential revenue`) and the **Cup row or header**.
- **Option A:** a third stat on the personal closet card, `$310 earned · 1,240 pts · 18 lbs kept out of landfill`.
- **Option B:** a chapter total in the Cup header ("[Chapter] has kept 340 lbs out of landfill this season") and as a sortable Cup metric.
- **Recommendation:** B. It is P1, it is chapter-level, and it gives the Cup a second story.

---

## 5. Depop elements to drop for Bidd

**Messaging, social feed and follow graph (marketplace only):**
- The `Inbox` tab, the ✉ icon on the product seller row, `Ask a question`, `New message` on shops, and "Message the seller" on order complete. The **Inbox slot becomes Cup.**
- Followers/following counts, `Follow`, and `Find friends`.
- **Public Likes tabs on other people's shops.** Keep one private `Saved` list. The Pratt critique flags Depop's Likes-vs-Saved confusion.
- "Discover your next look": community-styled **Outfits** and the collage tool.
- The personal-taste "Suggested for you" framing. The grid is campus and moment led instead ("New on campus", "Gameday on campus").

**Free-text and growth clutter:**
- **Hashtags in descriptions** (`Hashtags: 5`). Structured moment tags replace them.
- **`Boosted` listings** and the paid-placement info card. Generic marketplace monetisation, and noise.
- Promo and upsell cards inside profiles (Campus Manager, "Free shipping sells") and photo-hero promo carousels.
- Location-permission prompt at sell entry. The campus comes from the .edu email.
- The `Where: Worldwide` filter and shipping-first defaults (`+ $11.99 shipping`). Handoff is on campus.

**Anything that breaks black and white plus campus fill:**
- Red notification dots and badges, red stars, green "Active today" dots, the green "You got it" headline, the green "Recommended" offer outline, blue text links, light-blue or red promo cards, and emoji in UI copy.
- The replacements: black dots and stars, a campus-fill active state, and black underlined links.

**Decide (not required):** structured offers (`Offer $14.40` with preset discounts) are not DMs and fit the "bid" name. Keep them only if there is build time. Drops stay fixed-price.

**Keep from Depop:** the 2-col 3:4 grid, brand/size/price card text, the 1:1 hero with a sticky Buy bar, `In N bags`-style chips (repurposed for stock), the Active/Sold split with a `SOLD` overlay, reviews with item thumbnails, the live-count filter button, the Save-search sheet (for "notify me when a Rush size S lands"), seller-grouped bundles (one Exchange Spot meet for several items), and the earnings card.

---

## 6. Link index

| What | Link |
|---|---|
| Depop main tabs (2026 Home, Discover, Sell): company page and previews | https://lazyweb.com/company/depop |
| Depop browse by category, results chips, product page (2025-11) | https://lazyweb.com/flow/depop/browse-by-category |
| Depop product page, bag, offer sheet | https://lazyweb.com/flow/depop/make-an-offer |
| Depop bag and checkout | https://lazyweb.com/flow/depop/checkout-item-in-bag |
| Depop My Depop (Shop/Sold/Purchases/Likes, empty shop) and Sell form | https://lazyweb.com/flow/depop/set-up-selling-payouts |
| Depop search, filter, sort, no results, save search (2023) | https://pageflows.com/post/ios/searching/depop/ |
| Depop product page, reviews, bag, "You got it", profile (2023) | https://pageflows.com/post/ios/buying-something/depop/ |
| Depop likes, saved, collections, own profile (2023) | https://pageflows.com/post/ios/saving/depop/ |
| Depop listing flow, Selling hub, empty shop (2023) | https://pageflows.com/post/ios/listing-a-product/depop/ |
| Live Depop search (Rush demand, filter labels, card text) | https://www.depop.com/search/?q=sorority%20rush%20dress |
| Nike SNKRS screens (feed, upcoming, size sheet, Draw closed, Launch Ended) | https://screensdesign.com/apps/nike-snkrs-sneakers-apparel/ |
| Nike SNKRS 2026 main tabs (Feed, In Stock, Upcoming) | https://lazyweb.com/company/snkrs |
| Duolingo Leagues teardown | https://duolingo.deconstructoroffun.com/mechanics/leagues |
| Duolingo screens (leaderboard and locked state) | https://screensdesign.com/apps/duolingo-language-lessons/ |
| Strava club leaderboards | https://support.strava.com/hc/en-us/articles/216918347-Clubs-on-Strava |
| Depop fee change (buyer-fee model) | https://blog.vendoo.co/how-much-does-depop-take-depop-fees-guide-for-sellers |
| Depop iOS design critique (Likes vs Saved confusion) | https://ixd.prattsi.org/2019/02/design-critique-depop-ios-app/ |

## Caveats

- No Mobbin links, because the connector requires a paid plan. If the team upgrades, re-run the Depop shop, product and search queries on Mobbin to swap in canonical links.
- The Pageflows frames are from Sept 2023. Where they differ from 2026 (nav labels, profile tabs, overlay vs below-image card text), the 2026 Lazyweb captures win.
- Depop's Drops UI and the current SOLD overlay styling are confirmed by strings only. I did not view the screens.
- Depop's buyer-fee figures come from third-party fee guides. Check them before quoting in the pitch.
- The Depop search count (3.97K) is a single snapshot from 2026-10-17.
