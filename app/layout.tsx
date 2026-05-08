import type { Metadata } from "next";

import { PwaLaunchScreen } from "@/components/PwaLaunchScreen";

import "./globals.css";

const themeScript = `
(() => {
  const storageKey = "pronos-theme";
  const root = document.documentElement;

  const getTheme = () => {
    const savedTheme = window.localStorage.getItem(storageKey);
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const theme = getTheme();
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (typeof navigator !== "undefined" &&
      "standalone" in navigator &&
      navigator.standalone === true);

  if (isStandalone) {
    root.dataset.pwaDisplay = "standalone";
  }
})();
`;

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  title: "Pronos des potos",
  description: "Pronostics entre potes, compétition par compétition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <PwaLaunchScreen />
        {children}
      </body>
    </html>
  );
}
