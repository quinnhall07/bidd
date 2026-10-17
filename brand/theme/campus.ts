// Campus theming for Bidd: "Bidd frames, campus fills".
// Bidd itself is black and white. A campus's colour only ever arrives as a fill,
// so this turns the two hexes on a `campuses` row into the CSS variables the
// theme in bidd.css reads.
//
//   <body style={campusTheme({ primary: campus.primary_color, secondary: campus.secondary_color })}>
//
// --campus          the campus colour as given: large fields (drop banners, Cup bars, chips)
// --campus-ink      text drawn on a --campus field (black or white, whichever contrasts more)
// --campus-line     thin marks on white: the 1 in the logo, focus rings, links
// --campus-on-dark  the 1 and any campus mark on black grounds
// --campus-2        the secondary colour, for a second series
//
// The 1 has to read as a colour, not as one more letter. So --campus-line and --campus-on-dark are
// at least 3:1 against their ground, at least ONE_GAP (OKLab distance) from the letters beside them,
// and never grey: a navy or maroon that would vanish next to black letters is lifted, hue kept.
// A black or grey campus has no hue to keep, so its 1 takes the secondary colour instead.
import type { CSSProperties } from "react";

export const INK = "#0B0B0B";
export const PAPER = "#FFFFFF";

type RGB = [number, number, number];

const toRgb = (hex: string): RGB => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = ([r, g, b]: RGB) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const ONE_GAP = 0.3;
const CHROMA_FLOOR = 0.14;

// OKLCH round trip, so lifting a colour keeps its hue and saturation
// (mixing navy with white turns it grey; raising its lightness keeps it navy).
const toOklab = (hex: string): [number, number, number] => {
  const [r, g, b] = toRgb(hex).map(channel);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const toOklch = (hex: string): [number, number, number] => {
  const [L, A, B] = toOklab(hex);
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
};

/** OKLab distance: how far apart two colours look, hue included. */
export const gap = (a: string, b: string) => {
  const [p, q] = [toOklab(a), toOklab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

const fromOklch = ([L, C, H]: [number, number, number]): RGB | null => {
  const A = C * Math.cos(H), B = C * Math.sin(H);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  if (lin.some((v) => v < -0.0005 || v > 1.0005)) return null;
  const enc = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055);
  return lin.map((v) => Math.min(255, Math.max(0, enc(v)))) as RGB;
};

// The colour at lightness L and hue H, with as much of chroma C as sRGB can hold.
const at = (L: number, C: number, H: number) => {
  for (let c = C; c >= 0; c -= 0.005) {
    const rgb = fromOklch([L, c, H]);
    if (rgb) return toHex(rgb);
  }
  return L > 0.5 ? PAPER : INK;
};

const shift = (hex: string, dL: number) => {
  const [L, C, H] = toOklch(hex);
  return at(Math.min(1, Math.max(0, L + dL)), C, H);
};

/** Raise or lower OKLCH lightness (hue and chroma kept) until `hex` reaches `min` contrast against `ground`. */
export const reach = (hex: string, ground: string, min = 3) => {
  const dir = luminance(ground) < 0.5 ? 1 : -1;
  for (let step = 0; step <= 50; step++) {
    const c = shift(hex, dir * step * 0.02);
    if (contrast(c, ground) >= min) return c;
  }
  return dir > 0 ? PAPER : INK;
};

/** The 1 (or any thin campus mark) on `ground`: the nearest lightness, hue kept, that clears 3:1 on the ground and ONE_GAP from the letters. */
export const markOn = (hex: string, ground: string) => {
  const letters = luminance(ground) < 0.5 ? PAPER : INK;
  const [L0, C0, H] = toOklch(hex);
  if (C0 < 0.03) return letters;
  const C = Math.max(C0, CHROMA_FLOOR);
  for (let step = 0; step <= 50; step++) {
    for (const L of [L0 + step * 0.02, L0 - step * 0.02]) {
      if (L < 0 || L > 1) continue;
      const c = at(L, C, H);
      if (contrast(c, ground) >= 3 && gap(c, letters) >= ONE_GAP) return c;
    }
  }
  return letters;
};

const isGrey = (hex: string) => toOklch(hex)[1] < 0.03;

export function campusColors(primary: string, secondary?: string | null) {
  const campus = primary.toUpperCase();
  const hue = isGrey(primary) && secondary && !isGrey(secondary) ? secondary : primary;
  return {
    campus,
    campusInk: contrast(campus, PAPER) >= contrast(campus, INK) ? PAPER : INK,
    campusLine: markOn(hue, PAPER),
    campusOnDark: markOn(hue, INK),
    campus2: (secondary ?? primary).toUpperCase(),
    // Two-colour modes (duo=tape, duo=jersey). The varsity stripe sits on whichever neutral the
    // secondary stands out from more; jersey type takes the secondary only where it clears 3:1 on the field.
    campusTapeGround: contrast(secondary ?? primary, INK) >= contrast(secondary ?? primary, PAPER) ? INK : PAPER,
    campusJersey:
      secondary && contrast(secondary, campus) >= 3
        ? secondary.toUpperCase()
        : contrast(campus, PAPER) >= contrast(campus, INK) ? PAPER : INK,
  };
}

export function campusTheme({ primary, secondary }: { primary: string; secondary?: string | null }): CSSProperties {
  const c = campusColors(primary, secondary);
  return {
    "--campus": c.campus,
    "--campus-ink": c.campusInk,
    "--campus-line": c.campusLine,
    "--campus-on-dark": c.campusOnDark,
    "--campus-2": c.campus2,
    "--campus-tape-ground": c.campusTapeGround,
    "--campus-jersey": c.campusJersey,
  } as CSSProperties;
}

/** Seed values for the two demo tenants. Pick a primary that differs from other tenants at a glance. */
export const DEMO_CAMPUSES = {
  ua: { name: "Alabama", email_domain: "ua.edu", primary_color: "#9E1B32", secondary_color: "#828A8F" },
  olemiss: { name: "Ole Miss", email_domain: "olemiss.edu", primary_color: "#14213D", secondary_color: "#CE1126" },
} as const;
