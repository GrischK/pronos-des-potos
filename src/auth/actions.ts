"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/src/db/prisma";
import { hashPassword, verifyPassword } from "@/src/auth/password";
import { createSession, destroySession } from "@/src/auth/session";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Ton nom doit contenir au moins 2 caractères."),
  email: z.string().trim().email("Email invalide.").toLowerCase(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

const loginSchema = z.object({
  email: z.string().trim().email("Email invalide.").toLowerCase(),
  password: z.string().min(1, "Mot de passe requis."),
});

export type AuthActionState = {
  error?: string;
};

export async function signupAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Inscription impossible." };
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash: await hashPassword(parsed.data.password),
      },
      select: { id: true },
    });

    await createSession(user.id);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Un compte existe déjà avec cet email." };
    }

    if (process.env.NODE_ENV !== "production") {
      console.error(error);
      return {
        error:
          error instanceof Error
            ? error.message
            : "Inscription impossible pour le moment.",
      };
    }

    return { error: "Inscription impossible pour le moment." };
  }

  redirect("/competitions");
}

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Connexion impossible." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return { error: "Email ou mot de passe incorrect." };
  }

  const passwordMatches = await verifyPassword(
    parsed.data.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return { error: "Email ou mot de passe incorrect." };
  }

  await createSession(user.id);
  redirect("/competitions");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
