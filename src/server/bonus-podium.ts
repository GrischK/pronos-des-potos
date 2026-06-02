import "server-only";

import { getCurrentUser } from "@/src/auth/current-user";
import { computeBonusPoints, type BonusPodiumPick } from "@/src/domain/bonus-scoring";
import { prisma } from "@/src/db/prisma";
import { resolveBonusResult } from "@/src/server/bonus";

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
  predictionsVisible: boolean;
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
      startsAt: true,
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
      matches: {
        where: {
          status: "FINISHED",
          homeScore: {
            not: null,
          },
          awayScore: {
            not: null,
          },
        },
        select: {
          stage: true,
          status: true,
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
          penaltyHomeScore: true,
          penaltyAwayScore: true,
        },
      },
    },
  });

  if (!competition) {
    return null;
  }

  const predictionsVisible =
    competition.startsAt !== null &&
    competition.startsAt.getTime() <= Date.now();

  const teamById = new Map(
    competition.teams.map((team) => [team.id, team] as const),
  );

  const result = resolveBonusResult(
    competition.bonusEnabled,
    competition.bonusEnabled &&
      (competition.bonusWinnerTeamId ||
        competition.bonusSecondTeamId ||
        competition.bonusThirdTeamId)
      ? {
          winnerTeamId: competition.bonusWinnerTeamId,
          secondTeamId: competition.bonusSecondTeamId,
          thirdTeamId: competition.bonusThirdTeamId,
        }
      : null,
    competition.matches,
  );

  const pointsByUser = new Map<string, number>();
  if (result && predictionsVisible) {
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

  const predictions = predictionsVisible
    ? competition.bonusPredictions
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
        })
    : [];

  return {
    id: competition.id,
    name: competition.name,
    slug: competition.slug,
    kind: competition.kind,
    emblemUrl: competition.emblemUrl,
    bonusEnabled: competition.bonusEnabled,
    predictionsVisible,
    teams: competition.teams,
    result,
    predictions,
  } satisfies BonusPodiumPageData;
}
