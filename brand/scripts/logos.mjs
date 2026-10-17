// Generates every Bidd logo SVG from the outlined B1DD letters in logo/source/b1dd-outlines.json.
// Run: node brand/scripts/logos.mjs
// The letters are always ink (or paper on black). Only the 1 takes a color, and only a campus color.
// Add a campus to CAMPUSES to get its wordmark and mark (colors from campusColors() in theme/campus.ts).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = (p, s) => {
  mkdirSync(dirname(join(root, p)), { recursive: true });
  writeFileSync(join(root, p), s.trim() + "\n");
};
const src = JSON.parse(readFileSync(join(root, "logo/source/b1dd-outlines.json"), "utf8"));
const { B, one, D1, D2 } = src.glyphs;

export const INK = "#0B0B0B";
export const PAPER = "#FFFFFF";

// line = the 1 on white, onDark = the 1 on black: campusLine and campusOnDark from campusColors(),
// which keep 3:1 on the ground and lift a navy or maroon clear of the letters (Ole Miss navy #14213D becomes a readable blue).
const CAMPUSES = {
  ua: { name: "Alabama", line: "#9E1B32", onDark: "#B33242" },
  olemiss: { name: "Ole Miss", line: "#274A9C", onDark: "#375CB0" },
};

const box = ([x0, y0, x1, y1]) => `${x0} ${y0} ${x1 - x0} ${y1 - y0}`;
const WORD_VB = box(src.bounds.wordmark);
const MARK_VB = box(src.bounds.mark);

const wordBody = (ink, oneColor) => `
  <path d="${B}" fill="${ink}"/>
  <path d="${one}" fill="${oneColor}"/>
  <path d="${D1}" fill="${ink}"/>
  <path d="${D2}" fill="${ink}"/>`;
const markBody = (ink, oneColor) => `
  <path d="${B}" fill="${ink}"/>
  <path d="${one}" fill="${oneColor}"/>`;

const svg = (viewBox, title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${title}">
  <title>${title}</title>${body}
</svg>`;

// App icon: the B1 mark in paper on an ink tile, centered on its ink box.
const tile = (size, inset) => {
  const [x0, y0, x1, y1] = src.bounds.mark;
  const w = x1 - x0, h = y1 - y0;
  const s = Math.min((size - inset * 2) / w, (size - inset * 2) / h);
  const tx = (size - w * s) / 2 - x0 * s, ty = (size - h * s) / 2 - y0 * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${INK}"/>
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(5)})">${markBody(PAPER, PAPER)}
  </g>
</svg>`;
};

export function writeAll() {
  // retire the first-round 1/1 symbol and lockup
  for (const f of ["bidd-symbol.svg", "bidd-symbol-white.svg", "bidd-lockup.svg", "bidd-lockup-white.svg"]) rmSync(join(root, "logo", f), { force: true });
  for (const c of Object.keys(CAMPUSES)) for (const k of ["symbol", "lockup"]) for (const v of ["", "-on-black"]) rmSync(join(root, "logo/campus", `bidd-${k}-${c}${v}.svg`), { force: true });

  out("logo/bidd-wordmark.svg", svg(WORD_VB, "Bidd", wordBody(INK, INK)));
  out("logo/bidd-wordmark-white.svg", svg(WORD_VB, "Bidd", wordBody(PAPER, PAPER)));
  out("logo/bidd-mark.svg", svg(MARK_VB, "Bidd", markBody(INK, INK)));
  out("logo/bidd-mark-white.svg", svg(MARK_VB, "Bidd", markBody(PAPER, PAPER)));
  for (const [slug, c] of Object.entries(CAMPUSES)) {
    out(`logo/campus/bidd-wordmark-${slug}.svg`, svg(WORD_VB, `Bidd at ${c.name}`, wordBody(INK, c.line)));
    out(`logo/campus/bidd-wordmark-${slug}-on-black.svg`, svg(WORD_VB, `Bidd at ${c.name}`, wordBody(PAPER, c.onDark)));
    out(`logo/campus/bidd-mark-${slug}.svg`, svg(MARK_VB, `Bidd at ${c.name}`, markBody(INK, c.line)));
    out(`logo/campus/bidd-mark-${slug}-on-black.svg`, svg(MARK_VB, `Bidd at ${c.name}`, markBody(PAPER, c.onDark)));
  }
  out("icons/icon.svg", tile(512, 112));
  out("icons/icon-maskable.svg", tile(512, 150));
}

writeAll();
console.log("logos written to brand/logo and brand/icons");
