import type { Metadata } from "next";
import { archivo, greek, hanken } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bidd · The closet for college Greek life",
  description: "Resell your rush wardrobe, shop your chapter's drops, and every sale counts toward your chapter. Be 1 of 1.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${hanken.variable} ${greek.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
