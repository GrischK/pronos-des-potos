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

  useEffect(() => {
    const androidMobile = isAndroidMobile();
    setIsAndroid(androidMobile);
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

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

  return (
    <div className="mt-5 grid gap-2">
      <p className="form-hint">
        Sur Android, Chrome peut proposer l'installation de l'app.
      </p>
      <button
        className="btn btn-secondary auth-submit"
        disabled={isInstalling || !deferredPrompt}
        type="button"
        onClick={async () => {
          const prompt = deferredPrompt;

          if (!prompt) {
            return;
          }

          setIsInstalling(true);

          try {
            await prompt.prompt();
            await prompt.userChoice;
          } finally {
            setDeferredPrompt(null);
            setIsInstalling(false);
          }
        }}
      >
        {isInstalling ? "Ouverture..." : "Installer l'app"}
      </button>
      {!deferredPrompt ? (
        <p className="form-hint">
          Si le bouton reste grisé, Chrome n'a pas encore jugé la page installable.
          Reste quelques secondes sur la page, puis réessaie.
        </p>
      ) : null}
    </div>
  );
}
