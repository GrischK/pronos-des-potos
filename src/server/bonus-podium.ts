import "server-only";

import { getCurrentUser } from "@/src/auth/current-user";
import { computeBonusPoints, type BonusPodiumPick } from "@/src/domain/bonus-scoring";
import { prisma } from "@/src/db/prisma";

type BonusTeam = {
  id: string;
  name: string;
  flagUrl: string | null;
};

type BonusPredictionUser = {
  id: string;
  name: string;
  image: string | null;
};

export type BonusPodiumPagePrediction = {
  id: string;
  user: BonusPredictionUser;
  winnerTeam: BonusTeam | null;
  secondTeam: BonusTeam | null;
  thirdTeam: BonusTeam | null;
  points: number;
};

export type BonusPodiumPageData = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  emblemUrl: string | null;
  bonusEnabled: boolean;
  teams: BonusTeam[];
  result: BonusPodiumPick | null;
  predictions: BonusPodiumPagePrediction[];
};

function getUserDisplayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email;
}

export async function getBonusPodiumPageData(slug: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return null;
  }

  const competition = await prisma.competition.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      emblemUrl: true,
      bonusEnabled: true,
      bonusWinnerTeamId: true,
      bonusSecondTeamId: true,
      bonusThirdTeamId: true,
      teams: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          flagUrl: true,
        },
      },
      bonusPredictions: {
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
            },
          },
          winnerTeamId: true,
          secondTeamId: true,
          thirdTeamId: true,
        },
      },
    },
  });

  if (!competition) {
    return null;
  }

  const teamById = new Map(
    competition.teams.map((team) => [team.id, team] as const),
  );

  const result =
    competition.bonusEnabled &&
    (competition.bonusWinnerTeamId ||
      competition.bonusSecondTeamId ||
      competition.bonusThirdTeamId)
      ? {
          winnerTeamId: competition.bonusWinnerTeamId,
          secondTeamId: competition.bonusSecondTeamId,
          thirdTeamId: competition.bonusThirdTeamId,
        }
      : null;

  const pointsByUser = new Map<string, number>();
  if (result) {
    for (const prediction of competition.bonusPredictions) {
      pointsByUser.set(
        prediction.user.id,
        computeBonusPoints(
          {
            winnerTeamId: prediction.winnerTeamId,
            secondTeamId: prediction.secondTeamId,
            thirdTeamId: prediction.thirdTeamId,
          },
          result,
        ),
      );
    }
  }

  const predictions = competition.bonusPredictions
    .map((prediction): BonusPodiumPagePrediction => ({
      id: prediction.id,
      user: {
        id: prediction.user.id,
        name: getUserDisplayName(prediction.user),
        image: prediction.user.image,
      },
      winnerTeam: prediction.winnerTeamId ? teamById.get(prediction.winnerTeamId) ?? null : null,
      secondTeam: prediction.secondTeamId ? teamById.get(prediction.secondTeamId) ?? null : null,
      thirdTeam: prediction.thirdTeamId ? teamById.get(prediction.thirdTeamId) ?? null : null,
      points: pointsByUser.get(prediction.user.id) ?? 0,
    }))
    .sort((a, b) => {
      if (result) {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
      }

      return a.user.name.localeCompare(b.user.name, "fr");
    });

  return {
    id: competition.id,
    name: competition.name,
    slug: competition.slug,
    kind: competition.kind,
    emblemUrl: competition.emblemUrl,
    bonusEnabled: competition.bonusEnabled,
    teams: competition.teams,
    result,
    predictions,
  } satisfies BonusPodiumPageData;
}
