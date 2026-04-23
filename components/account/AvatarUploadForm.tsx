"use client";

import { useRef, useState, useTransition } from "react";

import {
  updateAccountAvatarAction,
  type AccountActionState,
} from "@/src/server/account-actions";

const MAX_SOURCE_SIZE = 5 * 1024 * 1024;
const AVATAR_SIZE = 512;

function getCanvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.82);
  });
}

async function fileToWebpAvatar(file: File) {
  const bitmap = await createImageBitmap(file);
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sourceX = Math.round((bitmap.width - sourceSize) / 2);
  const sourceY = Math.round((bitmap.height - sourceSize) / 2);
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
  const [state, setState] = useState<AccountActionState>({});
  const [isPending, startTransition] = useTransition();

  return (
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
            const avatar = await fileToWebpAvatar(file);
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
        <input
          accept="image/jpeg,image/png,image/webp"
          name="image"
          ref={inputRef}
          required
          type="file"
        />
      </label>
      <p className="form-hint">
        JPG, PNG ou WebP jusqu'à 5 Mo. Conversion automatique en WebP 512x512.
      </p>
      <ActionMessage state={state} />
      <button className="btn btn-primary" disabled={isPending} type="submit">
        {isPending ? "Conversion..." : "Mettre à jour la photo"}
      </button>
    </form>
  );
}
