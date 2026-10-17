# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, Supabase (Postgres, email-code auth, storage, realtime), a vision LLM route for AI listings, Stripe test mode (or a mock), `qrcode.react`, hosted on Vercel. Fonts must come from Google Fonts (team constraint in `build.md`). Source of truth: `build.md`.

## Users

- **Primary:** campus-verified students in SEC Greek life, starting with the University of Alabama (10,000+ Greek students; 2,500+ women in Panhellenic recruitment). They are on their phones, between Greek-calendar moments (rush, Bid Day, gamedays, philanthropy weeks, formals, move-out), reselling clothes they wore once and buying what the next event calls for.
- **Chapter officers** (sororities, fraternities, clubs): run their chapter closet and **drops** instead of chasing sizes and payments through Google Forms, Venmo and GroupMe.
- **Brand partners** (e.g. apparel brands): run co-branded chapter drops without coming to campus.
- **This build's audience:** hackathon judges (Marketplace track) watching a 3–5 minute pitch and a live demo. They are scoring innovation (weighted most), multi-tenancy, campus verification, cross-campus play, whether it actually works, and polish.

## Product Purpose

Bidd is the closet for SEC Greek life. Members resell their rush wardrobe, shop their chapter's drops, and every sale counts toward their chapter. Success for the hackathon is a working, polished, deployed demo of the click path in `build.md`: .edu sign-in, then a campus theme, AI-filled listing, chapter drop with access code, buy with QR handoff, Closet Cup leaderboard (campus and SEC views), and a second campus signing in with a different theme in the same app.

## Positioning

Built around chapters, not individuals. Everything is a **closet** (personal, chapter, brand). Chapters bring their members as supply, **drops** replace Google Forms merch orders, and the **Closet Cup** turns every member's sale into chapter points within rivalries that already exist (the same national sorority at Alabama vs Ole Miss). It is campus-verified (.edu plus a verified chapter) and marketplace-only (no feed posts, no DMs). Curtsy started at Ole Miss and then left Greek life; Depop, FB Marketplace and Fizz aren't built for chapters.

## Operating Context

- **The Greek clothing calendar drives everything.** Aug Rush (Rush Closet by round dress code) → mid-Aug Bid Day (drops; Fall Cup starts) → Sep–Nov Gamedays → philanthropy weeks → winter/spring Formals → May graduation and move-out (Senior Clear-out; Spring Cup ends) → summer pre-orders.
- **Handoff happens on campus.** A QR-confirmed exchange at a campus **Exchange Spot**, or shipping to the buyer's **Mail Stop Code (MSC)** locker.
- **Multi-tenant by campus.** The campus comes from the email domain, and each campus row carries `primary_color` and `secondary_color` that theme the app (UA shows crimson; Ole Miss shows its own theme). A new campus is one config row.
- **Team:** Rouan (backend), Quinn (frontend; owns in-app look and feel), Rowan (marketing and brand; works in Canva/Figma, runs the pitch deck and social mockups).

## Capabilities and Constraints

- **Terminology (use exactly):** closet (personal / chapter / brand), drop, access code, Closet Cup (Fall Cup, Spring Cup), SEC view, Exchange Spot, MSC, Rush Closet, Senior Clear-out, moment tags (Rush, Bid Day, Gameday, Formal, Casual, Philanthropy), points.
- **Fees:** 0% seller fee; buyer pays 5% + $0.50 on peer resale; 10% of gross on chapter drops (from chapter margin); 15–20% revenue share on brand co-drops. By default, 10% of the chapter's drop profit is tagged for its philanthropy.
- **Trademark boundary:** Bidd never prints Greek-organization or university trademarks. Drops go through the chapter's licensed vendor. The Bidd logo never locks up with a university mark, chapter letters or a crest.
- **Demo exception for school logos (Quinn, 2026-10-17):** the hackathon demo shows each school's official logo to identify its campus: campus header, campus picker, Closet Cup rows, sign-in confirmation. The logos load from hosted URLs (`logo_url` / `logo_url_dark` on the campus row), are never committed to the public repo (`mock/logos/` is gitignored), and always sit apart from the Bidd logo. Permission to use them gets sorted out before any real launch.
- **Brand must coexist with campus themes:** campus colors are injected at runtime per tenant, and Bidd's own identity has to read correctly next to any of them.
- **Not in the hackathon build:** rentals, Career Closet, move-out drive, lockers, DMs, any social features.
- **Undecided:** Rowan's brand direction is in progress and developed in conversation with Quinn. Nothing is locked beyond the name and tagline.

## Brand Commitments

- **Name:** Bidd (double d). It works two ways: **Bid Day** is the biggest clothing moment of the Greek year, and to **bid** is to want something before it's gone.
- **Tagline:** "The closet for SEC Greek life." (the descriptive line)
- **Slogan:** "Bidd: Be 1 of 1." (the brand line, from Quinn and Rowan)
- **Palette (pinned by Quinn and Rowan): black and white.** Bidd's own color is black and white only, and the campus color fills in the rest. There is no separate Bidd accent hue.
- **Brand kit scope set by the team:** wordmark and logo, one accent color plus neutrals, a Google Fonts pairing, favicon, tagline.
- **Brand architecture (confirmed by Quinn): Bidd frames, campus fills.** Bidd owns the logo, type, neutrals and signature shapes, and the campus color fills the accents. Bidd must be recognizable on any campus, and the tenant swap must be visible.
- **Reference brands (pinned by Quinn and Rowan): Nike, Supreme, Depop.** Bidd sits alongside these, and their craft is the bar. Quinn rejected concept worlds (painted Bid Day banner, sealed bid card) and a generic resale-app look. The commitment is the streetwear and sportswear drop-brand convention done straight: Nike's confident type and imperative voice, Supreme's single-mark drop culture, Depop's photo-first peer marketplace.
- **Logo (chosen by Quinn in the logo lab, 2026-10-17):** the wordmark **B1DD**, Archivo Extra Condensed Black Italic (wdth 62, wght 900), outlined to vector, with the I drawn as a **1** in the campus color. The standalone mark is **B1**. In running text the name is always spelled "Bidd"; B1DD is only how the logo draws it. Quinn rejected the first-round round-capped 1/1 symbol and lowercase "bidd" wordmark.
- **Type (chosen by Quinn):** Archivo Extra Condensed Black Italic caps for headlines; Hanken Grotesk for everything people read.
- **Must not read as (confirmed by Quinn):** sorority clip-art (pastel pink, script fonts, bows, glitter), a generic startup, an official university department or athletics mark, or cold luxury fashion resale.

## Evidence on Hand

- `vision.md`: market figures ($19,373 rush-outfit tally, $4,750 dues, SEC Greek percentages, Fresh Prints revenue, $393B secondhand market). The doc itself flags these as *numbers to verify before slides*.
- Hallway interview quotes: pending (Rowan, 11:30–12:00). Do not invent quotes.
- Seed content (campuses, chapters, 30+ listings, photos, a partner drop): pending in Rowan's sheet.
- **No** real users, testimonials, partner agreements, press, or traction exist. Partner names in demos (e.g. a co-branded drop) are demo seed content, not confirmed partnerships. Never present them as real.

## Product Principles

1. **The chapter is the unit.** Surfaces should make the chapter visible: its closet, its drops, its place in the Cup.
2. **Campus-native, never campus-official.** Bidd should feel like it belongs to Greek life on campus without borrowing a university's or an organization's marks.
3. **One app, any campus.** The identity has to hold up under every campus palette. Swapping tenants is a demo moment, not a breakage.
4. **Selling takes thirty seconds.** A photo in, a listing out. The interface gets out of the way of the closet.
5. **A marketplace, not a social network.** No posts, no DMs, nothing to moderate. Energy comes from drops, countdowns and the Cup.

## Accessibility & Inclusion

Mobile-first: the deployed URL must work on a phone. Campus colors are applied at runtime, so text and controls drawn on them must keep WCAG AA contrast whatever the tenant palette.
