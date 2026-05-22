import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/src/db/prisma";
import { sendPasswordResetEmail } from "@/src/server/brevo";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generatePasswordResetToken() {
  return randomBytes(32).toString("hex");
}

export async function createPasswordResetRequest(userId: string, email: string) {
  const token = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { userId, usedAt: null },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  await sendPasswordResetEmail({
    to: email,
    resetToken: token,
  });
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();

  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    include: {
      user: {
        select: {
          id: true,
        },
      },
    },
  });
}
