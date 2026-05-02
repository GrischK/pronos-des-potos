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

type AndroidInstallPromptProps = {
  variant?: "default" | "compact";
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

export function AndroidInstallPrompt({ variant = "default" }: AndroidInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEventLike | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

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

  const isCompact = variant === "compact";

  return (
    <div className={isCompact ? "landing-install-prompt" : "mt-5 grid gap-2"}>
      <p className={isCompact ? "landing-install-hint" : "form-hint"}>
        Sur Android, installe l'app en un tap.
      </p>
      <button
        className={
          isCompact ? "btn btn-secondary landing-install-button" : "btn btn-secondary auth-submit"
        }
        disabled={!deferredPrompt || isInstalling}
        type="button"
        onClick={async () => {
          if (!deferredPrompt) {
            return;
          }

          setIsInstalling(true);

          try {
            await deferredPrompt.prompt();
            await deferredPrompt.userChoice;
          } finally {
            setDeferredPrompt(null);
            setIsInstalling(false);
          }
        }}
      >
        {isInstalling ? "Ouverture..." : "Installer l'app"}
      </button>
    </div>
  );
}
