import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f6f7f1",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/pwa/icon-192.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/pwa/icon-512.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/pwa/icon-maskable-512.png",
        type: "image/png",
      },
    ],
    name: "Pronos des potos",
    short_name: "Pronos",
    start_url: "/",
    theme_color: "#2f7d4f",
  };
}
