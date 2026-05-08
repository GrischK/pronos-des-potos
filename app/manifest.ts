import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#ffffff",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/android-chrome-192x192.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/android-chrome-512x512.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/android-chrome-maskable-512x512.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "180x180",
        src: "/apple-touch-icon.png",
        type: "image/png",
      },
    ],
    name: "Pronos des potos",
    short_name: "Pronos",
    start_url: "/",
    theme_color: "#2f7d4f",
  };
}
