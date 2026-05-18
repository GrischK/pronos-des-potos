"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/src/auth/current-user";
import { prisma } from "@/src/db/prisma";

export type PredictionActionState = {
  error?: string;
  success?: string;
};

const predictionSchema = z.object({
  matchId: z.string().min(1),
  slug: z.string().min(1),
  homeScore: z.coerce
    .number({ error: "Score domicile requis." })
    .int("Score domicile invalide.")
    .min(0, "Score domicile invalide.")
    .max(99, "Score domicile invalide."),
  awayScore: z.coerce
    .number({ error: "Score extérieur requis." })
    .int("Score extérieur invalide.")
    .min(0, "Score extérieur invalide.")
    .max(99, "Score extérieur invalide."),
});

const bonusPredictionSchema = z
  .object({
    competitionId: z.string().min(1),
    slug: z.string().min(1),
    winnerTeamId: z.string().min(1),
    secondTeamId: z.string().min(1),
    thirdTeamId: z.string().min(1),
  })
  .refine(
    (value) =>
      value.winnerTeamId !== value.secondTeamId &&
      value.winnerTeamId !== value.thirdTeamId &&
      value.secondTeamId !== value.thirdTeamId,
    {
      message: "Le podium bonus doit contenir trois équipes distinctes.",
    },
  );

export async function savePredictionAction(
  _state: PredictionActionState,
  formData: FormData,
): Promise<PredictionActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Connecte-toi pour enregistrer un prono." };
  }

  const parsed = predictionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Prono invalide.",
    };
  }

  const match = await prisma.match.findUnique({
    where: {
      id: parsed.data.matchId,
    },
    select: {
      id: true,
      kickoffAt: true,
      status: true,
      homeTeamId: true,
      awayTeamId: true,
      competitionId: true,
      competition: {
        select: {
          status: true,
          slug: true,
        },
      },
    },
  });

  if (!match) {
    return { error: "Match introuvable." };
  }

  if (match.competition.slug !== parsed.data.slug) {
    return { error: "Match invalide pour cette compétition." };
  }

  if (match.competition.status !== "OPEN") {
    return { error: "Cette compétition est fermée aux pronos." };
  }

  if (match.status !== "SCHEDULED") {
    return { error: "Ce match n'est plus ouvert aux pronos." };
  }

  if (!match.homeTeamId || !match.awayTeamId) {
    return { error: "Les équipes ne sont pas encore connues pour ce match." };
  }

  if (match.kickoffAt.getTime() <= Date.now()) {
    return { error: "Le match a commencé, le prono est verrouillé." };
  }

  await prisma.$transaction([
    prisma.competitionPlayer.upsert({
      where: {
        userId_competitionId: {
          userId: user.id,
          competitionId: match.competitionId,
        },
      },
      create: {
        userId: user.id,
        competitionId: match.competitionId,
      },
      update: {},
    }),
    prisma.prediction.upsert({
      where: {
        userId_matchId: {
          userId: user.id,
          matchId: match.id,
        },
      },
      create: {
        userId: user.id,
        matchId: match.id,
        homeScore: parsed.data.homeScore,
        awayScore: parsed.data.awayScore,
      },
      update: {
        homeScore: parsed.data.homeScore,
        awayScore: parsed.data.awayScore,
        points: null,
      },
    }),
  ]);

  revalidatePath(`/competitions/${parsed.data.slug}/pronos`);

  return { success: "Prono enregistré." };
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

  if (!competition.startsAt || competition.startsAt.getTime() <= Date.now()) {
    return { error: "Le bonus podium est verrouillé." };
  }

  const teamIds = new Set(competition.teams.map((team) => team.id));

  if (
    !teamIds.has(parsed.data.winnerTeamId) ||
    !teamIds.has(parsed.data.secondTeamId) ||
    !teamIds.has(parsed.data.thirdTeamId)
  ) {
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
        userId: user.id,
        competitionId: competition.id,
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
        winnerTeamId: parsed.data.winnerTeamId,
        secondTeamId: parsed.data.secondTeamId,
        thirdTeamId: parsed.data.thirdTeamId,
      },
      update: {
        winnerTeamId: parsed.data.winnerTeamId,
        secondTeamId: parsed.data.secondTeamId,
        thirdTeamId: parsed.data.thirdTeamId,
      },
    }),
  ]);

  revalidatePath(`/competitions/${competition.slug}/pronos`);

  return { success: "Bonus podium enregistré." };
}
