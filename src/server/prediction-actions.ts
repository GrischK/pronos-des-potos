"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/src/auth/current-user";
import { prisma } from "@/src/db/prisma";
import { savePrediction, type SavedPrediction } from "@/src/server/prediction-save";

export type PredictionActionState = {
  error?: string;
  savedPrediction?: SavedPrediction;
  success?: string;
};

const optionalTeamId = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().min(1).optional(),
);

const bonusPredictionSchema = z
  .object({
    competitionId: z.string().min(1),
    slug: z.string().min(1),
    winnerTeamId: optionalTeamId,
    secondTeamId: optionalTeamId,
    thirdTeamId: optionalTeamId,
  })
  .refine(
    (value) =>
      Boolean(value.winnerTeamId || value.secondTeamId || value.thirdTeamId),
    {
      message: "Choisis au moins une equipe pour le bonus podium.",
    },
  )
  .refine(
    (value) => {
      const selectedIds = [
        value.winnerTeamId,
        value.secondTeamId,
        value.thirdTeamId,
      ].filter((teamId): teamId is string => Boolean(teamId));

      return new Set(selectedIds).size === selectedIds.length;
    },
    {
      message: "Le podium bonus ne peut pas contenir deux fois la meme equipe.",
    },
  );

export async function savePredictionAction(
  _state: PredictionActionState,
  formData: FormData,
): Promise<PredictionActionState> {
  return savePrediction(Object.fromEntries(formData));
}

export async function saveBonusPredictionAction(
  _state: PredictionActionState,
  formData: FormData,
): Promise<PredictionActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Connecte-toi pour enregistrer le bonus." };
  }

  const parsed = bonusPredictionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Bonus invalide.",
    };
  }

  const competition = await prisma.competition.findUnique({
    where: {
      id: parsed.data.competitionId,
    },
    select: {
      id: true,
      slug: true,
      status: true,
      bonusEnabled: true,
      bonusLateEntriesEnabled: true,
      startsAt: true,
      teams: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!competition) {
    return { error: "Compétition introuvable." };
  }

  if (!competition.bonusEnabled) {
    return { error: "Le bonus podium n'est pas activé sur cette compétition." };
  }

  if (competition.status !== "OPEN") {
    return { error: "La compétition est fermée aux pronos." };
  }

  if (
    !competition.bonusLateEntriesEnabled &&
    (!competition.startsAt || competition.startsAt.getTime() <= Date.now())
  ) {
    return { error: "Le bonus podium est verrouillé." };
  }

  const teamIds = new Set(competition.teams.map((team) => team.id));

  const selectedIds = [
    parsed.data.winnerTeamId,
    parsed.data.secondTeamId,
    parsed.data.thirdTeamId,
  ].filter((teamId): teamId is string => Boolean(teamId));

  if (!selectedIds.every((teamId) => teamIds.has(teamId))) {
    return { error: "Le podium doit utiliser des équipes de la compétition." };
  }

  await prisma.$transaction([
    prisma.competitionPlayer.upsert({
      where: {
        userId_competitionId: {
          userId: user.id,
          competitionId: competition.id,
        },
      },
      create: {
        user: {
          connect: {
            id: user.id,
          },
        },
        competition: {
          connect: {
            id: competition.id,
          },
        },
      },
      update: {},
    }),
    prisma.competitionBonusPrediction.upsert({
      where: {
        userId_competitionId: {
          userId: user.id,
          competitionId: competition.id,
        },
      },
      create: {
        userId: user.id,
        competitionId: competition.id,
        winnerTeamId: parsed.data.winnerTeamId ?? null,
        secondTeamId: parsed.data.secondTeamId ?? null,
        thirdTeamId: parsed.data.thirdTeamId ?? null,
      },
      update: {
        winnerTeamId: parsed.data.winnerTeamId ?? null,
        secondTeamId: parsed.data.secondTeamId ?? null,
        thirdTeamId: parsed.data.thirdTeamId ?? null,
      },
    }),
  ]);

  revalidatePath(`/competitions/${competition.slug}/pronos`);

  return { success: "Bonus podium enregistré." };
}
