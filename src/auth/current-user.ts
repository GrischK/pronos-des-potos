import "server-only";

import { prisma } from "@/src/db/prisma";
import { getSessionUserId } from "@/src/auth/session";

export async function getCurrentUser() {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
}

export async function getCurrentAdmin() {
  const user = await getCurrentUser();

  if (user?.role !== "ADMIN") {
    return null;
  }

  return user;
}
