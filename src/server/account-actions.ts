"use server";

import { del, put } from "@vercel/blob";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUserId } from "@/src/auth/session";
import { hashPassword, verifyPassword } from "@/src/auth/password";
import { prisma } from "@/src/db/prisma";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const nameSchema = z.object({
  name: z.string().trim().min(2, "Ton nom doit contenir au moins 2 caractères."),
});

const emailSchema = z.object({
  email: z.string().trim().email("Email invalide.").toLowerCase(),
  currentPassword: z.string().min(1, "Mot de passe actuel requis."),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis."),
  newPassword: z
    .string()
    .min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères."),
});

export type AccountActionState = {
  error?: string;
  success?: string;
};

async function getAuthenticatedUser() {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      image: true,
      passwordHash: true,
    },
  });
}

function revalidateAccount() {
  revalidatePath("/mon-compte");
  revalidatePath("/competitions");
}

export async function updateAccountNameAction(
  _state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { error: "Session expirée. Reconnecte-toi." };
  }

  const parsed = nameSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nom invalide." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name },
  });

  revalidateAccount();
  return { success: "Nom mis à jour." };
}

export async function updateAccountEmailAction(
  _state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await getAuthenticatedUser();

  if (!user?.passwordHash) {
    return { error: "Session expirée. Reconnecte-toi." };
  }

  const parsed = emailSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email invalide." };
  }

  const passwordMatches = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return { error: "Mot de passe actuel incorrect." };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: parsed.data.email },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Cette adresse email est déjà utilisée." };
    }

    throw error;
  }

  revalidateAccount();
  return { success: "Email mis à jour." };
}

export async function updateAccountPasswordAction(
  _state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await getAuthenticatedUser();

  if (!user?.passwordHash) {
    return { error: "Session expirée. Reconnecte-toi." };
  }

  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Mot de passe invalide.",
    };
  }

  const passwordMatches = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return { error: "Mot de passe actuel incorrect." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  return { success: "Mot de passe mis à jour." };
}

export async function updateAccountAvatarAction(
  _state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { error: "Session expirée. Reconnecte-toi." };
  }

  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisis une image à importer." };
  }

  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return { error: "Format accepté : JPG, PNG ou WebP." };
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return { error: "L'image doit faire 2 Mo maximum." };
  }

  let blob;

  try {
    blob = await put(`avatars/${user.id}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }

    return {
      error:
        "Upload impossible. Vérifie que BLOB_READ_WRITE_TOKEN est configuré.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { image: blob.url },
  });

  if (user.image?.includes(".public.blob.vercel-storage.com")) {
    try {
      await del(user.image);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error(error);
      }
    }
  }

  revalidateAccount();
  return { success: "Photo mise à jour." };
}
