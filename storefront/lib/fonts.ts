// Bidd type, as in brand/theme/fonts.ts: Archivo (headlines) and Hanken Grotesk (everything people read).
// Plus a Greek-only fill for the lab's names=letters: neither brand face has Greek glyphs. The stacks in
// app/globals.css put it right after the brand face, so it only ever draws the Greek letters.
import { Archivo, Fira_Sans_Extra_Condensed, Hanken_Grotesk } from "next/font/google";

export const archivo = Archivo({
  subsets: ["latin"],
  style: ["italic"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const greek = Fira_Sans_Extra_Condensed({
  subsets: ["greek"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-greek",
  display: "swap",
  preload: false,
});
