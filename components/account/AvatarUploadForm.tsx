"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { PointerEvent } from "react";
import { createPortal } from "react-dom";

import {
  updateAccountAvatarAction,
  type AccountActionState,
} from "@/src/server/account-actions";

const MAX_SOURCE_SIZE = 5 * 1024 * 1024;
const AVATAR_SIZE = 512;
const PREVIEW_SIZE = 260;

type CropPosition = {
  x: number;
  y: number;
};

type PreviewImage = {
  height: number;
  url: string;
  width: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getCanvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.82);
  });
}

async function fileToWebpAvatar(file: File, position: CropPosition) {
  const bitmap = await createImageBitmap(file);
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const maxSourceX = bitmap.width - sourceSize;
  const maxSourceY = bitmap.height - sourceSize;
  const sourceX = Math.round((maxSourceX / 2) * (1 - clamp(position.x, -1, 1)));
  const sourceY = Math.round((maxSourceY / 2) * (1 - clamp(position.y, -1, 1)));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;

  if (!context) {
    bitmap.close();
    throw new Error("Conversion impossible avec ce navigateur.");
  }

  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();

  const blob = await getCanvasBlob(canvas);

  if (!blob) {
    throw new Error("Conversion WebP impossible avec ce navigateur.");
  }

  return new File([blob], "avatar.webp", { type: "image/webp" });
}

function getPreviewMetrics(image: PreviewImage) {
  const aspectRatio = image.width / image.height;
  const displayWidth =
    aspectRatio >= 1 ? PREVIEW_SIZE * aspectRatio : PREVIEW_SIZE;
  const displayHeight =
    aspectRatio >= 1 ? PREVIEW_SIZE : PREVIEW_SIZE / aspectRatio;

  return {
    displayHeight,
    displayWidth,
    maxX: Math.max(0, (displayWidth - PREVIEW_SIZE) / 2),
    maxY: Math.max(0, (displayHeight - PREVIEW_SIZE) / 2),
  };
}

function ActionMessage({ state }: { state: AccountActionState }) {
  if (state.error) {
    return <p className="form-error">{state.error}</p>;
  }

  if (state.success) {
    return <p className="form-success">{state.success}</p>;
  }

  return null;
}

export function AvatarUploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startPosition: CropPosition;
    startX: number;
    startY: number;
  } | null>(null);
  const [state, setState] = useState<AccountActionState>({});
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
  const [position, setPosition] = useState<CropPosition>({ x: 0, y: 0 });
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isPending, startTransition] = useTransition();
  const previewMetrics = previewImage ? getPreviewMetrics(previewImage) : null;

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage.url);
      }
    };
  }, [previewImage]);

  useEffect(() => {
    if (!isCropOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCropOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isCropOpen]);

  async function handleFileChange(file: File | undefined) {
    setState({});
    setPosition({ x: 0, y: 0 });
    setIsCropOpen(false);
    setSelectedFileName(file?.name ?? "");
    setPreviewImage((current) => {
      if (current) {
        URL.revokeObjectURL(current.url);
      }

      return null;
    });

    if (!file) {
      return;
    }

    if (file.size > MAX_SOURCE_SIZE) {
      setState({ error: "L'image source doit faire 5 Mo maximum." });
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const nextPreview = {
        height: bitmap.height,
        url: URL.createObjectURL(file),
        width: bitmap.width,
      };

      bitmap.close();
      setPreviewImage(nextPreview);
    } catch {
      setState({ error: "Prévisualisation de l'image impossible." });
    }
  }

  function moveCrop(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId || !previewMetrics) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    setPosition({
      x:
        previewMetrics.maxX > 0
          ? clamp(drag.startPosition.x + deltaX / previewMetrics.maxX, -1, 1)
          : 0,
      y:
        previewMetrics.maxY > 0
          ? clamp(drag.startPosition.y + deltaY / previewMetrics.maxY, -1, 1)
          : 0,
    });
  }

  const cropModal =
    isCropOpen && previewImage && previewMetrics
      ? createPortal(
          <div
            className="modal-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setIsCropOpen(false);
              }
            }}
          >
            <div
              aria-modal="true"
              className="avatar-crop-modal"
              role="dialog"
            >
              <h3>Cadrage de la photo</h3>
              <div className="avatar-crop-tool">
                <div
                  aria-label="Cadrage de la photo"
                  className="avatar-crop-preview"
                  onPointerCancel={() => {
                    dragRef.current = null;
                  }}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    dragRef.current = {
                      pointerId: event.pointerId,
                      startPosition: position,
                      startX: event.clientX,
                      startY: event.clientY,
                    };
                  }}
                  onPointerMove={moveCrop}
                  onPointerUp={(event) => {
                    if (dragRef.current?.pointerId === event.pointerId) {
                      dragRef.current = null;
                    }
                  }}
                  role="img"
                >
                  <img
                    alt=""
                    draggable={false}
                    src={previewImage.url}
                    style={{
                      height: `${previewMetrics.displayHeight}px`,
                      transform: `translate(calc(-50% + ${
                        position.x * previewMetrics.maxX
                      }px), calc(-50% + ${position.y * previewMetrics.maxY}px))`,
                      width: `${previewMetrics.displayWidth}px`,
                    }}
                  />
                </div>
                <div className="avatar-crop-controls">
                  <label>
                    <span>Horizontal</span>
                    <input
                      disabled={previewMetrics.maxX === 0}
                      max="1"
                      min="-1"
                      onChange={(event) => {
                        setPosition((current) => ({
                          ...current,
                          x: Number(event.target.value),
                        }));
                      }}
                      step="0.01"
                      type="range"
                      value={position.x}
                    />
                  </label>
                  <label>
                    <span>Vertical</span>
                    <input
                      disabled={previewMetrics.maxY === 0}
                      max="1"
                      min="-1"
                      onChange={(event) => {
                        setPosition((current) => ({
                          ...current,
                          y: Number(event.target.value),
                        }));
                      }}
                      step="0.01"
                      type="range"
                      value={position.y}
                    />
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setPosition({ x: 0, y: 0 });
                  }}
                  type="button"
                >
                  Centrer
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setIsCropOpen(false);
                  }}
                  type="button"
                >
                  Valider le cadrage
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <form
        className="account-form"
        onSubmit={(event) => {
          event.preventDefault();

          startTransition(async () => {
            const file = inputRef.current?.files?.[0];

            if (!file) {
              setState({ error: "Choisis une image à importer." });
              return;
            }

            if (file.size > MAX_SOURCE_SIZE) {
              setState({ error: "L'image source doit faire 5 Mo maximum." });
              return;
            }

            try {
              const avatar = await fileToWebpAvatar(file, position);
              const formData = new FormData();

              formData.set("image", avatar);
              setState(await updateAccountAvatarAction({}, formData));
            } catch (error) {
              setState({
                error:
                  error instanceof Error
                    ? error.message
                    : "Conversion de l'image impossible.",
              });
            }
          });
        }}
      >
        <label className="field">
          <span>Image de profil</span>
          <div className="file-picker">
            <input
              accept="image/jpeg,image/png,image/webp"
              className="file-picker-input"
              name="image"
              onChange={(event) => {
                void handleFileChange(event.target.files?.[0]);
              }}
              ref={inputRef}
              type="file"
            />
            <button
              className="btn btn-secondary"
              onClick={() => {
                inputRef.current?.click();
              }}
              type="button"
            >
              Choisir une photo
            </button>
            <span className="file-picker-name">
              {selectedFileName || "Aucun fichier sélectionné"}
            </span>
          </div>
        </label>
        {previewImage && previewMetrics ? (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setIsCropOpen(true);
            }}
            type="button"
          >
            Recentrer la photo
          </button>
        ) : null}
        <p className="form-hint">
          JPG, PNG ou WebP jusqu'à 5 Mo. Conversion automatique en WebP 512x512.
        </p>
        <ActionMessage state={state} />
        <button className="btn btn-primary" disabled={isPending} type="submit">
          {isPending ? "Conversion..." : "Mettre à jour la photo"}
        </button>
      </form>
      {cropModal}
    </>
  );
}
