# Bidd brand kit

**Be 1 of 1.** The closet for SEC Greek life.

Bidd is black and white. The campus is the only color, and it only ever arrives as a fill: the **1** in the B1DD logo, drop banners, Closet Cup bars, the active chip, focus rings. References: Nike (type confidence, imperative voice), Supreme (one mark, drop culture), Depop (photo-first peer marketplace).

Open `index.html` (or the published link) for the full guide with the live campus switch. `logo-lab.html` is the exploration tool the logo was picked from.

## The logo

- **Wordmark: B1DD.** Archivo Extra Condensed Black Italic (wdth 62, wght 900), outlined to vector. The I is drawn as a 1, the serial number on a one-of-one piece, and the 1 takes the campus color.
- **Mark: B1.** For the app icon, favicon and anywhere under 64px wide.
- In sentences the name is always spelled **Bidd**. B1DD is only how the logo draws it.
- Never retype the logo in Archivo. Use the files or the React components.

## Drop it into the Next.js app

1. **Icons:** copy `icons/favicon.ico`, `icons/icon.svg` and `icons/apple-icon.png` into `app/`. Next.js picks them up by filename.
2. **Theme:** in `app/globals.css`, after Tailwind and shadcn's blocks:
   ```css
   @import "../brand/theme/bidd.css";
   ```
   This sets the shadcn tokens (black primary, campus focus ring), adds `ink`, `paper`, `dim` and `campus*` colors, and adds two utilities: `display` (Archivo condensed black italic caps, the headline voice) and `label` (small caps labels). Body text is Hanken Grotesk.
3. **Fonts:** in `app/layout.tsx`:
   ```tsx
   import { archivo, hanken } from "@/brand/theme/fonts";
   <html lang="en" className={`${archivo.variable} ${hanken.variable}`}>
   ```
4. **Campus colors:** once you know the signed-in user's campus:
   ```tsx
   import { campusTheme } from "@/brand/theme/campus";
   <body style={campusTheme({ primary: campus.primary_color, secondary: campus.secondary_color })}>
   ```
   Before sign-in, leave it off: everything falls back to black and white, and the 1 is ink.
5. **Logo:**
   ```tsx
   import { BiddWordmark, BiddMark } from "@/brand/react/bidd-logo";
   <BiddWordmark className="h-7 text-ink" />
   <BiddMark className="size-10 text-paper" tone="dark" />   // on black
   ```

## Campus variables

| Variable | Use it for |
|---|---|
| `--campus` / `bg-campus` | Large fields: drop banners, Cup bars, active chips |
| `--campus-ink` / `text-campus-ink` | Text on a campus field (black or white, picked by contrast) |
| `--campus-line` / `text-campus-line` | The 1 in the logo on white, focus rings, links (3:1 or better on white, and clearly apart from the black letters) |
| `--campus-on-dark` | The 1 and any campus mark on black (3:1 or better on black, and clearly apart from the white letters) |
| `--campus-2` | The secondary color, for a second series |

The 1 has to read as a color, not as one more letter. A navy or maroon primary that would vanish next to black letters is lifted in OKLCH, hue kept and never grey (Ole Miss navy `#14213D` draws its 1 in `#274A9C` on white and `#375CB0` on black). A black or grey campus has no hue to keep, so its 1 takes the secondary color. `campusColors()` does all of this; never hand-pick the 1.

Demo tenants (`DEMO_CAMPUSES` in `theme/campus.ts`): Alabama `#9E1B32` / `#828A8F`, Ole Miss `#14213D` / `#CE1126`. Navy for Ole Miss keeps the tenant swap obvious next to Alabama crimson.

## Rules that matter in the demo

- The letters of the logo are always ink. Only the 1 takes a color, and only a campus color.
- Primary buttons are black pills. Campus color is never a button background for the main action. On a campus field (a drop banner), the pill and the selected chip flip to `--campus-ink` with `--campus` text.
- Errors are ink, an icon and a sentence that names the fix. Never red: every hue already belongs to some campus.
- Photos are square crops: full garment, daylight. Rowan is shooting them; the listing and drop templates mark the slot.
- Headlines use `display`: two to four words, capitals, ending on a period when it's a statement. Never set body copy in it.
- Never lock up the Bidd logo with a university logo or chapter letters. For the hackathon demo, a school's official logo can identify its campus (header, campus picker, Cup rows). It loads from `logo_url` on the campus row, is never committed, and always sits apart from the Bidd logo.
- Numbers over adjectives: "48 left", "02:14:09".
- On black sections, add `data-ground="dark"` to the container so focus rings use `--campus-on-dark`.

## Files

```
brand/
  index.html            brand guide (published as an artifact)
  logo-lab.html         the logo exploration tool (published as an artifact)
  logo/                 B1DD wordmark and B1 mark (black + white), campus/ variants
  logo/source/          the outlined letters (b1dd-outlines.json) and the Archivo font license
  icons/                favicon.ico, icon.svg, apple-icon.png, 192/512/maskable PNGs
  theme/                bidd.css, campus.ts, fonts.ts
  react/bidd-logo.tsx   BiddWordmark and BiddMark
  templates/            Instagram post, story, deck title (HTML + PNG)
  scripts/logos.mjs     regenerates every logo SVG from logo/source; add a campus there
```

New campus logo files: add it to `CAMPUSES` in `scripts/logos.mjs` (colors from `campusColors()` in `theme/campus.ts`) and run `node brand/scripts/logos.mjs`.
