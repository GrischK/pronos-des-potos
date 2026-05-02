"use client";

import { useEffect, useState } from "react";

type InstallOutcome = "accepted" | "dismissed";

type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: InstallOutcome;
    platform: string;
  }>;
};

function isAndroidMobile() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent;
  const userAgentData = (navigator as Navigator & {
    userAgentData?: {
      mobile?: boolean;
      platform?: string;
    };
  }).userAgentData;
  const isMobile = userAgentData?.mobile ?? /Mobi|Android/i.test(userAgent);
  const isAndroid = userAgentData?.platform === "Android" || /Android/i.test(userAgent);

  return isAndroid && isMobile;
}

export function AndroidInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEventLike | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasServiceWorker, setHasServiceWorker] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const androidMobile = isAndroidMobile();
    setIsAndroid(androidMobile);
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        setHasServiceWorker(Boolean(registration));
      });
    }

    if (!androidMobile) {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEventLike);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setFeedback("L'application est installée.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!isAndroid || isStandalone) {
    return null;
  }

  const installStatus = deferredPrompt
    ? "Prêt à installer"
    : hasServiceWorker
      ? "En attente du signal d'installation"
      : "Service worker non détecté";

  return (
    <div className="pwa-diagnostic">
      <p className="form-hint">
        Sur Android, Chrome peut proposer l'installation de l'app.
      </p>
      <button
        className="btn btn-secondary auth-submit"
        disabled={isInstalling}
        type="button"
        onClick={async () => {
          const prompt = deferredPrompt;

          if (!prompt) {
            setFeedback(
              "Chrome n'a pas encore rendu l'installation disponible. Reste quelques secondes sur la page, puis recharge.",
            );
            return;
          }

          setIsInstalling(true);
          setFeedback(null);

          try {
            await prompt.prompt();
            const choice = await prompt.userChoice;
            setFeedback(
              choice.outcome === "accepted"
                ? "Installation lancée."
                : "Installation annulée.",
            );
          } finally {
            setDeferredPrompt(null);
            setIsInstalling(false);
          }
        }}
      >
        {isInstalling ? "Ouverture..." : "Installer l'app"}
      </button>
      <div className="pwa-diagnostic-grid" aria-live="polite">
        <div>
          <span>Android</span>
          <strong>Oui</strong>
        </div>
        <div>
          <span>Service worker</span>
          <strong>{hasServiceWorker ? "Actif" : "Pas vu"}</strong>
        </div>
        <div>
          <span>Prompt install</span>
          <strong>{deferredPrompt ? "Disponible" : "Pas encore"}</strong>
        </div>
        <div>
          <span>Statut</span>
          <strong>{installStatus}</strong>
        </div>
      </div>
      {!deferredPrompt ? (
        <p className="form-hint">
          Si Chrome n'a pas encore jugé la page installable, laisse la page ouverte
          un moment puis réessaie.
        </p>
      ) : null}
      {feedback ? <p className="form-hint">{feedback}</p> : null}
    </div>
  );
}
