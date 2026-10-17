// Bidd type: two families.
// Archivo Extra Condensed Black Italic (wdth 62, wght 900) is the headline voice: `display` utility in bidd.css.
// Hanken Grotesk sets everything people read: body, labels, buttons, numbers.
//
// app/layout.tsx:
//   import { archivo, hanken } from "@/brand/theme/fonts";
//   <html lang="en" className={`${archivo.variable} ${hanken.variable}`}>
import { Archivo, Hanken_Grotesk } from "next/font/google";

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
