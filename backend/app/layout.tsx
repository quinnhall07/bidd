import type { ReactNode } from "react";

export const metadata = {
  title: "Bidd API",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 16 }}>{children}</body>
    </html>
  );
}
