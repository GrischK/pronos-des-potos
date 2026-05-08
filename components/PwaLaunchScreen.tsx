"use client";

import { useEffect, useState } from "react";

import { AnimatedPronosLogo } from "@/components/AnimatedPronosLogo";

const LAUNCH_SCREEN_MIN_DURATION_MS = 1050;

type PwaLaunchScreenProps = {
  forceDisplay?: boolean;
  persist?: boolean;
};

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (typeof navigator !== "undefined" &&
      "standalone" in navigator &&
      navigator.standalone === true)
  );
}

export function PwaLaunchScreen({
  forceDisplay = false,
  persist = false,
}: PwaLaunchScreenProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!forceDisplay && !isStandaloneDisplayMode()) {
      return;
    }

    setIsMounted(true);

    const showTimer = window.setTimeout(() => {
      setIsVisible(true);
    }, 24);

    if (persist) {
      return () => {
        window.clearTimeout(showTimer);
      };
    }

    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, LAUNCH_SCREEN_MIN_DURATION_MS);

    const unmountTimer = window.setTimeout(() => {
      setIsMounted(false);
    }, LAUNCH_SCREEN_MIN_DURATION_MS + 260);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(unmountTimer);
    };
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={`pwa-launch-screen${isVisible ? " is-visible" : ""}`}
    >
      <div className="pwa-launch-screen__halo" />
      <div className="pwa-launch-screen__logo-wrap">
        <AnimatedPronosLogo className="pwa-launch-screen__logo" />
      </div>
      <div className="pwa-launch-screen__label">Pronos des potos</div>
    </div>
  );
}
