"use client";

import { useEffect, useState } from "react";

export function usePresence(isOpen: boolean, durationMs = 180) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const frameId = requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => {
        cancelAnimationFrame(frameId);
      };
    }

    setIsVisible(false);
    const timeoutId = window.setTimeout(() => {
      setIsMounted(false);
    }, durationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [durationMs, isOpen]);

  return {
    isMounted,
    isVisible,
  };
}
