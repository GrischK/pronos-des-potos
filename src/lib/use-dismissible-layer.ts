"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

type UseDismissibleLayerOptions = {
  active: boolean;
  ignoreRefs?: Array<RefObject<HTMLElement | null>>;
  layerRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
};

export function useDismissibleLayer({
  active,
  ignoreRefs = [],
  layerRef,
  onDismiss,
}: UseDismissibleLayerOptions) {
  useEffect(() => {
    if (!active) {
      return;
    }

    function isIgnoredTarget(target: Node) {
      if (layerRef.current?.contains(target)) {
        return true;
      }

      return ignoreRefs.some((ref) => ref.current?.contains(target));
    }

    function handleClick(event: MouseEvent) {
      if (event.target instanceof Node && !isIgnoredTarget(event.target)) {
        onDismiss();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDismiss();
      }
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, ignoreRefs, layerRef, onDismiss]);
}
