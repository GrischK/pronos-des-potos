import type { Metadata } from "next";

import { PwaLaunchScreen } from "@/components/PwaLaunchScreen";

import "./globals.css";

const criticalStyle = `
html, body {
  background: #f6f7f1;
}
`;

const pwaBootScreenMarkup = `
<div id="pwa-boot-screen" aria-hidden="true" style="position:fixed;inset:0;z-index:99;display:none;align-items:center;justify-content:center;flex-direction:column;gap:16px;background:radial-gradient(circle at 50% 36%, rgba(122,201,167,.18) 0, rgba(122,201,167,0) 34%), linear-gradient(145deg, #edf2e8 0%, #f8f8f4 42%, #f4efe1 100%);pointer-events:none;">
  <div style="position:absolute;width:min(54vw,300px);height:min(54vw,300px);border-radius:9999px;background:radial-gradient(circle, rgba(47,125,79,.18) 0, rgba(47,125,79,0) 72%);filter:blur(8px);"></div>
  <div style="position:relative;width:min(54vw,224px);">
    <img src="/pwa/logo-animable.svg" alt="" draggable="false" style="display:block;width:100%;height:auto;filter:drop-shadow(0 18px 30px rgba(21,24,23,.12)) drop-shadow(0 4px 10px rgba(47,125,79,.10));" />
  </div>
  <div style="position:relative;font:800 .86rem/1 Arial, Helvetica, sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#315743;">Pronos des potos</div>
</div>
`;

const themeScript = `
(() => {
  const storageKey = "pronos-theme";
  const root = document.documentElement;
  root.style.backgroundColor = "#f6f7f1";

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
    const bootScreen = document.getElementById("pwa-boot-screen");
    if (bootScreen) {
      bootScreen.style.display = "flex";
    }
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
      <head>
        <style dangerouslySetInnerHTML={{ __html: criticalStyle }} />
      </head>
      <body>
        <div dangerouslySetInnerHTML={{ __html: pwaBootScreenMarkup }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <PwaLaunchScreen />
        {children}
      </body>
    </html>
  );
}
