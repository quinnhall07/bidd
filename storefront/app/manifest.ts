import type { MetadataRoute } from "next";

// Add to Home Screen: the B1 mark from brand/icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bidd",
    short_name: "Bidd",
    description: "The closet for college Greek life, on every campus. Be 1 of 1.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B0B",
    theme_color: "#0B0B0B",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
