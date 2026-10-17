---
name: Bidd
description: "The closet for SEC Greek life. Be 1 of 1. Bidd frames in black and white; the campus fills."
colors:
  ink: "#0B0B0B"
  paper: "#FFFFFF"
  gray-50: "#F5F5F5"
  gray-100: "#EBEBEB"
  gray-200: "#D9D9D9"
  gray-400: "#9E9E9E"
  gray-600: "#6B6B6B"
  gray-800: "#262626"
  dim: "#A3A3A3"
  campus-alabama: "#9E1B32"
  campus-alabama-line: "#9E1B32"
  campus-alabama-on-dark: "#B33242"
  campus-alabama-2: "#828A8F"
  campus-olemiss: "#14213D"
  campus-olemiss-line: "#274A9C"
  campus-olemiss-on-dark: "#375CB0"
  campus-olemiss-2: "#CE1126"
typography:
  display-xl:
    fontFamily: "Archivo, 'Arial Narrow', ui-sans-serif, sans-serif"
    fontSize: "6rem"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 62"
  display-l:
    fontFamily: "Archivo, 'Arial Narrow', ui-sans-serif, sans-serif"
    fontSize: "4rem"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 62"
  display-m:
    fontFamily: "Archivo, 'Arial Narrow', ui-sans-serif, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 62"
  title:
    fontFamily: "'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.06em"
  number:
    fontFamily: "'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    fontFeature: "'tnum'"
rounded:
  content: "4px"
  full: "999px"
spacing:
  gap: "16px"
  gutter: "clamp(16px, 4vw, 56px)"
  card: "clamp(20px, 2.4vw, 32px)"
  band: "clamp(72px, 10vw, 136px)"
  column: "1320px"
components:
  pill-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    padding: "14px 24px"
  pill-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "14px 24px"
  pill-line:
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "14px 24px"
  pill-disabled:
    backgroundColor: "{colors.gray-100}"
    textColor: "{colors.gray-400}"
    rounded: "{rounded.full}"
    padding: "14px 24px"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.content}"
    padding: "{spacing.card}"
  photo-slot:
    backgroundColor: "{colors.gray-50}"
    textColor: "{colors.gray-600}"
  code-box:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.content}"
    width: "52px"
    height: "60px"
  dock:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    padding: "6px"
  dock-option-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "10px 14px"
---

# Design System: Bidd

## Overview

**Creative North Star: "Bidd Frames, Campus Fills"**

Bidd is a drop brand that happens to be a marketplace, played straight in the streetwear and sportswear canon of Nike, Supreme and Depop. Bidd itself is black and white and nothing else. Every hue on screen belongs to the signed-in campus, and it only ever arrives as a fill: the 1 in the logo, drop banners, Closet Cup bars, the active chip, the focus ring. Before sign-in every campus variable falls back to ink and paper, so the brand is complete without a campus and visibly changes when one arrives.

The voice is loud in one place and quiet everywhere else. Headlines are Archivo Extra Condensed Black Italic in capitals, short and declarative ("Be 1 of 1."). Everything people read is Hanken Grotesk at calm sizes. Pages are built from full-bleed black and white bands with one 1320px column inside, content sits on 4px corners, and every action and chip is a full pill. Depth is flat; the only lifted element is the floating campus dock.

Confirmed rejections: sorority clip-art (pastel pink, script fonts, bows, glitter), a generic startup or SaaS look, anything that reads as an official university department or athletics mark, and cold luxury resale.

**Key Characteristics:**
- Black and white only for Bidd; the campus is the single accent and only ever a fill.
- The B1DD wordmark: outlined condensed black italic letters in ink or paper, the I drawn as a 1 in the campus color.
- Condensed black italic caps for headlines, Hanken Grotesk for reading.
- Full pills for actions and chips, 4px corners for content.
- Flat surfaces; one ambient shadow on the floating dock.
- About 90% ink and paper, about 10% campus on a typical screen.

## Colors

A monochrome frame of true black, white and neutral grays, with one runtime slot that each campus fills.

### Primary
- **Ink** (`--ink`): the letters of the logo, type, primary pill actions, dark bands. Bidd's own "color".

### Neutral
- **Paper** (`--paper`): the app's ground; text and letters on ink.
- **Gray 50** (`--gray-50`): quiet surfaces, photo slots, spec tiles, the campus band.
- **Gray 100** (`--gray-100`): borders and card outlines; disabled pill fill.
- **Gray 200** (`--gray-200`): input borders, photo-slot inner line.
- **Gray 400** (`--gray-400`): disabled text and scrollbar thumb only (2.7:1 on white, so never for readable text).
- **Gray 600** (`--gray-600`): muted text on white (5.3:1).
- **Gray 800** (`--gray-800`): hairlines and dividers on ink; dock hover.
- **Dim** (`--dim`): muted text on ink grounds (7.8:1 on ink).

### Campus (runtime fill, set per tenant by `campusTheme()`)
- **Campus** (`--campus`, falls back to ink): the campus primary exactly as given. Large fields only: drop banners, Cup bars, the selected chip, selection highlight.
- **Campus Ink** (`--campus-ink`, falls back to paper): text and controls on a campus field, ink or paper, whichever contrasts more.
- **Campus Line** (`--campus-line`, falls back to ink): thin campus marks on white: the 1 in the logo, focus rings, links, caret.
- **Campus On Dark** (`--campus-on-dark`, falls back to paper): the 1 and any campus mark on ink grounds.
- **Campus 2** (`--campus-2`, falls back to gray 600): the secondary color, for a second chart series and for the 1 when the primary has no hue.

Demo tenants (`DEMO_CAMPUSES` in `brand/theme/campus.ts`), as `campusColors()` resolves them:
- **Alabama crimson**: campus `campus-alabama`, the 1 on white `campus-alabama-line` (same crimson, 7.9:1), the 1 on black `campus-alabama-on-dark` (3.2:1), secondary `campus-alabama-2`.
- **Ole Miss navy**: campus `campus-olemiss`, the 1 on white `campus-olemiss-line` (lifted blue, 8.3:1), the 1 on black `campus-olemiss-on-dark` (3.1:1), secondary `campus-olemiss-2`. Navy keeps the tenant swap obvious next to Alabama crimson.

### Named Rules
**The Bidd Frames, Campus Fills Rule.** Bidd has no accent hue. A campus color appears only as a fill (the 1, banners, Cup bars, active states, focus rings), never as type color for body copy and never as the background of the main action.

**The Rule of the 1.** The 1 must read as a color, not as one more letter. `--campus-line` and `--campus-on-dark` reach at least 3:1 on their ground and sit at least 0.3 OKLab distance from the letters beside them. They are never grey: chroma is raised to a 0.14 floor, hue is kept, and the nearest passing lightness wins. A black or grey campus (chroma under 0.03) has no hue to keep, so its 1 takes the secondary color. `campusColors()` computes all of this; never hand-pick the 1.

**The Ink Error Rule.** Errors are ink, an icon and a plain sentence that names the fix. Never red: every hue already belongs to some campus. `--destructive` maps to ink.

## Typography

**Display Font:** Archivo Extra Condensed Black Italic (Archivo variable, wdth 62, wght 900, italic; fallback Arial Narrow)
**Body Font:** Hanken Grotesk (fallback ui-sans-serif, system-ui)

**Character:** Archivo shouts, Hanken talks. A compressed, forward-leaning black italic in capitals carries the drop-poster energy; a clean grotesk carries every word people actually read, so the shouting never costs legibility.

### Hierarchy
- **Display** (Archivo 900 italic, wdth 62, caps, line-height 0.86, letter-spacing -0.01em, word-spacing 0.14em, balanced wrap): headlines, countdown clocks and Cup scores. XL 96px, L 64px, M 40px; section heads run clamp(3rem, 8.4vw, 6rem); the hero and posters go larger.
- **Title** (Hanken 600, 24px, 1.2): item titles, card headings ("Sequin mini, worn once").
- **Body** (Hanken 400, 16px, 1.5): running text, capped near 60–62ch. Lead paragraphs step up to clamp(17px, 1.6vw, 20px) in gray 600 on white or dim on ink.
- **Label** (Hanken 700, 12px, +0.06em, uppercase): chips, tags, table heads, item meta.
- **Number** (Hanken 600, tabular figures): prices, stock, timers in text ("$38.00 · 02:14:09 · 48 left"). Buttons are Hanken 700 at 16px.

### Named Rules
**The Caps Only Rule.** The condensed italic is always uppercase and never sets body copy. Headlines are two to four words, ending on a period when they are a statement.

**The Two Families Rule.** Archivo for display and the logo letters, Hanken Grotesk for everything else. No third family, no system display faces.

## Layout

Full-bleed bands alternate ink and paper (and gray 50) like a drop campaign; inside each band sits one centered column (`column`, 1320px). Bands pad vertically by `band` and horizontally by `gutter`, respecting safe-area insets. Section heads stack a display headline over a lead paragraph, max 980px wide, with clamp(40px, 6vw, 72px) beneath.

Content uses a 12-column grid with a 16px gap (`gap`); cards span 5, 6 or 7 columns at desktop and collapse to full width at 1080px. Further steps down at 760px (single column, display sizes reduce: XL to 64px, L to 48px) and 400px. The page reserves 96px at the bottom for the floating campus dock.

### Templates
Posters are fixed-size HTML files in `brand/templates/`, exported as PNG at their native size, all on an ink ground:
- **Instagram post** (1080 × 1350): wordmark top bar, a campus field inset 28px with the display headline, countdown and a square photo slot, then a closing row with "Be 1 of 1." and a paper pill.
- **Instagram story** (1080 × 1920): Closet Cup SEC view, one bar per campus in that campus's on-dark color.
- **Deck title** (1920 × 1080): the wordmark at 1500px wide with its 1 in campus on-dark, "Be 1 of 1." at 150px, tagline right-aligned.

## Elevation & Depth

Flat by default. Depth comes from tonal bands (ink against paper against gray 50) and 1px hairlines (gray 100 on paper, gray 800 on ink), not shadows. The one lifted element is the floating campus dock, which carries a single ambient shadow because it sits over content.

### Shadow Vocabulary
- **Dock float** (`box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28)`): the fixed campus dock only.

### Named Rules
**The No Effects Rule.** The logo never takes shadows, outlines, gradients or glow, and surfaces stay flat. Shadow is reserved for what genuinely floats.

## Shapes

Two corner values. Content (cards, spec tiles, token panels, swatches, code boxes, snippets, poster thumbnails) uses 4px corners (`content`), read as square. Every action and every chip is a full pill (`full`). Cup bars are squared at the start and fully rounded at the leading end (0 999px 999px 0), so they read as a race toward the right. Photos are square crops (1:1) with no rounding. Rules and dividers are straight 2px ink (or paper on ink) top borders over rule columns and kit blocks.

The logo's own geometry is the signature shape: a forward-slanted, condensed black italic. Nothing else on the page imitates it.

## Components

### Logo (B1DD wordmark and B1 mark)
The signature asset. Always use the files (`brand/logo/`) or the React components (`BiddWordmark`, `BiddMark`); never retype it.
- **Wordmark B1DD:** Archivo Extra Condensed Black Italic (wdth 62, wght 900), outlined to vector, with the I drawn as a 1. The letters B, D, D are always ink on white or paper on black. The 1 takes `--campus-line` on white and `--campus-on-dark` on black; before sign-in it is ink (or paper) like the letters.
- **Mark B1:** the app icon, favicon and any use under 64px wide; holds down to the 16px favicon. App icon: paper B1 centered on an ink tile.
- **Name in text:** always "Bidd". B1DD is only how the logo draws it.
- **Clear space:** the width of the 1 on every side.
- **Minimum size:** wordmark 64px wide; below that, the B1 mark.
- **Never:** color the letters, use a non-campus color for the 1, stretch it, add effects, or lock it up with a university logo or chapter letters.

### Buttons (pills)
Black pill actions, confident and plain.
- **Shape:** full pill (999px), 2px border, padding 14px 24px, Hanken 700 16px.
- **Primary:** ink fill, paper text. Campus is never the main action's background.
- **Paper:** paper fill, ink text, for actions on ink bands.
- **Line:** transparent with a 2px ink border, ink text, for secondary actions (Save).
- **On a campus field:** the pill flips to `--campus-ink` fill with `--campus` text.
- **Hover / Active:** lifts 2px (0.4s, ease-out-expo) and settles on press; no lift under reduced motion.
- **Disabled:** gray 100 fill, gray 400 text, no lift.
- **Focus:** 2px `--campus-line` outline, 3px offset.

### Chips
- **Style:** full pill, 2px ink border on paper, Hanken 700 13px uppercase, +0.05em, padding 10px 16px.
- **Selected:** `--campus` fill and border, `--campus-ink` text.
- **On a campus field (size pickers):** outlined in `currentColor`; selected flips to `--campus-ink` fill with `--campus` text. Sold-out sizes drop to 40% opacity with a strike-through.
- **Stamp:** a 1.5px ink-bordered pill label with an 8px `--campus-line` dot (season tag, "Fall Cup · day 23").

### Cards / Containers
- **Corner Style:** 4px.
- **Background:** paper with a 1px gray 100 border; gray 50 for quiet spec tiles; ink for token panels and code snippets.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Internal Padding:** clamp(20px, 2.4vw, 32px), 20px internal gap.

### Drop banner
The loudest campus field. A card filled with `--campus`, text in `--campus-ink`: display headline ("Bid Day drop"), a display countdown clock in tabular figures, stock and access meta in Hanken 600, size pills, and a flipped pre-order pill. On posters the field is the whole composition.

### Closet Cup bars
Horizontal bars, 0 999px 999px 0, one per chapter or campus, with the score in display numerals above the right end. In app, 28px tall and filled with `--campus`; in the cross-campus SEC view each bar wears its own campus (on-dark variant on ink grounds).

### Photo slots
Square (1:1), gray 50 with a 1px gray 200 inner line, a short caption bottom-left in 12px gray 600 naming the shot needed (full garment, daylight). On a campus field the slot is 10% paper with a 40% paper inner line.

### Inputs / Fields (access code)
- **Style:** one 52 × 60px box per character, 2px ink border, 4px corners, Hanken 24px centered uppercase.
- **Focus:** border turns `--campus-line` with a 3px 25% `--campus-line` halo.
- **Error:** an ink sentence with the ink alert icon (circle and exclamation, 20px) beside it. Never red.

### Navigation
- **Top nav:** wordmark at 26px tall on ink, section links in Hanken 600 15px dim, paper on hover. Below 1080px the links become a horizontally scrolling row with a fade mask.
- **Campus dock:** a fixed ink pill centered at the bottom, gray 800 1px border, 6px padding. Options are Hanken 600 14px pills with a 14px color swatch; the active option is a paper pill with ink text. Choosing a campus repaints every campus fill on the page in one sweep down the page (0.5s, staggered by position) and re-stamps the hero 1.

## Do's and Don'ts

### Do:
- **Do** keep Bidd's own palette to ink, paper and the grays; let the campus be the only hue.
- **Do** draw the 1 with `--campus-line` on white and `--campus-on-dark` on black, computed by `campusColors()`.
- **Do** set headlines in the condensed black italic caps (line-height 0.86, -0.01em, word-spacing 0.14em), two to four words.
- **Do** set every reading word, label, button and price in Hanken Grotesk, prices and timers in tabular figures.
- **Do** flip pills and selected chips to `--campus-ink` fill with `--campus` text on a campus field.
- **Do** mark black containers `data-ground="dark"` so focus rings switch to `--campus-on-dark`.
- **Do** use 4px corners on content and full pills on actions and chips.
- **Do** write errors in ink with an icon and a sentence that names the fix.

### Don't:
- **Don't** retype the logo, color its letters, stretch it, or add shadows, outlines, gradients or glow.
- **Don't** give the 1 any color that is not a campus color or ink.
- **Don't** use red (or any hue) for errors; every hue belongs to some campus.
- **Don't** make campus the background of the main action or the color of body text.
- **Don't** set body copy in the condensed italic, or set the italic in lowercase.
- **Don't** put a small tracked caps kicker or eyebrow above headlines; section heads are a display headline and a lead paragraph.
- **Don't** lock up the Bidd logo with a university logo, chapter letters or crests. In the hackathon demo a school's official logo may identify its campus (exception recorded in PRODUCT.md), always set apart from the Bidd logo.
- **Don't** drift toward pastel sorority clip-art, script fonts, generic startup styling, university-official marks or cold luxury resale.
