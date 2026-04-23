"use client";

import { createPortal } from "react-dom";
import { useRef, useState } from "react";

import { cn } from "@/src/lib/cn";
import { useDismissibleLayer } from "@/src/lib/use-dismissible-layer";
import { usePresence } from "@/src/lib/use-presence";

type PlayerProfileAvatarProps = {
  className?: string;
  image: string | null;
  name: string;
};

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

export function PlayerProfileAvatar({
  className,
  image,
  name,
}: PlayerProfileAvatarProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const presence = usePresence(isOpen);

  useDismissibleLayer({
    active: isOpen,
    ignoreRefs: [triggerRef],
    layerRef: modalRef,
    onDismiss: () => {
      setIsOpen(false);
    },
  });

  const content = image ? (
    <img alt="" src={image} />
  ) : (
    getInitial(name)
  );

  const modal =
    presence.isMounted && image
      ? createPortal(
          <div className={`modal-backdrop${presence.isVisible ? " is-open" : ""}`}>
            <div
              aria-modal="true"
              className={`player-avatar-modal${presence.isVisible ? " is-open" : ""}`}
              ref={modalRef}
              role="dialog"
            >
              <button
                aria-label="Fermer"
                className="modal-close-button player-avatar-modal-close"
                onClick={() => {
                  setIsOpen(false);
                }}
                type="button"
              >
                <span aria-hidden="true">+</span>
              </button>
              <img alt="" src={image} />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        aria-label={image ? "Agrandir la photo du joueur" : "Avatar du joueur"}
        className={cn(className ?? "player-profile-avatar", image && "is-clickable")}
        onClick={() => {
          if (image) {
            setIsOpen(true);
          }
        }}
        ref={triggerRef}
        type="button"
      >
        {content}
      </button>
      {modal}
    </>
  );
}
