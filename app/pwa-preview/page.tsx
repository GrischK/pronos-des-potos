import Link from "next/link";

import { PwaLaunchScreen } from "@/components/PwaLaunchScreen";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function PwaPreviewPage() {
  return (
    <main className="pwa-preview-page">
      <PwaLaunchScreen forceDisplay persist />

      <div className="pwa-preview-toolbar">
        <Link className="btn btn-secondary" href="/">
          Retour
        </Link>
        <ThemeToggle />
      </div>

      <div className="pwa-preview-note">
        <p className="eyebrow">Preview web</p>
        <h1>Écran de lancement PWA</h1>
      </div>
    </main>
  );
}
