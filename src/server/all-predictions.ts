import "server-only";

import { getCurrentUser } from "@/src/auth/current-user";
import {
  computePredictionPoints,
  type MatchScoreDisplayInput,
  getMatchResultForPoints,
} from "@/src/domain/scoring";
import { prisma } from "@/src/db/prisma";

export type PublicPredictionMatch = {
  id: string;
  kickoffAt: string;
  stage: string;
  matchday: number | null;
  status: string;
  liveMinute: number | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  canRevealPredictions: boolean;
  ownPrediction: {
    homeScore: number;
    awayScore: number;
    points: number | null;
  } | null;
  predictions: {
    id: string;
    homeScore: number;
    awayScore: number;
    points: number | null;
    user: {
      id: string;
      name: string;
    };
  }[];
  homeTeam: {
    name: string;
    flagUrl: string | null;
  } | null;
  awayTeam: {
    name: string;
    flagUrl: string | null;
  } | null;
} & MatchScoreDisplayInput;

type PublicPredictionMatchRow = {
  id: string;
  kickoffAt: Date;
  stage: string;
  matchday: number | null;
  status: string;
  liveMinute: number | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  predictions: {
    id: string;
    homeScore: number;
    awayScore: number;
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }[];
  homeTeam: {
    name: string;
    flagUrl: string | null;
  } | null;
  awayTeam: {
    name: string;
    flagUrl: string | null;
  } | null;
} & MatchScoreDisplayInput;

const publicPredictionMatchSelect = {
  id: true,
  kickoffAt: true,
  stage: true,
  matchday: true,
  status: true,
  liveMinute: true,
  homeScore: true,
  awayScore: true,
  regularHomeScore: true,
  regularAwayScore: true,
  extraTimeHomeScore: true,
  extraTimeAwayScore: true,
  penaltyHomeScore: true,
  penaltyAwayScore: true,
  homePlaceholder: true,
  awayPlaceholder: true,
  homeTeam: {
    select: {
      name: true,
      flagUrl: true,
    },
  },
  awayTeam: {
    select: {
      name: true,
      flagUrl: true,
    },
  },
  predictions: {
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  },
} as const;

function getPublicPredictionMatchesQuery() {
  return {
    orderBy: [{ kickoffAt: "asc" as const }, { createdAt: "asc" as const }],
    select: publicPredictionMatchSelect,
  };
}

function getUserDisplayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email;
}

function serializePublicPredictionMatches(
  matches: PublicPredictionMatchRow[],
  userId: string,
  now: number,
) {
  return matches.map((match): PublicPredictionMatch => {
    const result =
      match.status === "FINISHED" || match.status === "LIVE"
        ? getMatchResultForPoints(match)
        : null;
    const exactScorePredictionCount =
      result !== null
        ? match.predictions.filter(
            (matchPrediction) =>
              matchPrediction.homeScore === result.homeScore &&
              matchPrediction.awayScore === result.awayScore,
          ).length
        : 0;
    const ownSourcePrediction =
      match.predictions.find((prediction) => prediction.user.id === userId) ?? null;

    return {
      id: match.id,
      kickoffAt: match.kickoffAt.toISOString(),
      stage: match.stage,
      matchday: match.matchday,
      status: match.status,
      liveMinute: match.liveMinute,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      regularHomeScore: match.regularHomeScore,
      regularAwayScore: match.regularAwayScore,
      extraTimeHomeScore: match.extraTimeHomeScore,
      extraTimeAwayScore: match.extraTimeAwayScore,
      penaltyHomeScore: match.penaltyHomeScore,
      penaltyAwayScore: match.penaltyAwayScore,
      homePlaceholder: match.homePlaceholder,
      awayPlaceholder: match.awayPlaceholder,
      canRevealPredictions:
        match.status !== "SCHEDULED" || match.kickoffAt.getTime() <= now,
      ownPrediction: ownSourcePrediction
        ? {
            homeScore: ownSourcePrediction.homeScore,
            awayScore: ownSourcePrediction.awayScore,
            points:
              result !== null
                ? computePredictionPoints({
                    prediction: {
                      homeScore: ownSourcePrediction.homeScore,
                      awayScore: ownSourcePrediction.awayScore,
                    },
                    result,
                    exactScorePredictionCount,
                  })
                : null,
          }
        : null,
      predictions: match.predictions
        .map((prediction) => {
          let points: number | null = null;

          if (result !== null) {
            points = computePredictionPoints({
              prediction: {
                homeScore: prediction.homeScore,
                awayScore: prediction.awayScore,
              },
              result,
              exactScorePredictionCount,
            });
          }

          return {
            id: prediction.id,
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
            points,
            user: {
              id: prediction.user.id,
              name: getUserDisplayName(prediction.user),
            },
          };
        })
        .sort((a, b) => a.user.name.localeCompare(b.user.name, "fr")),
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    };
  });
}

export async function getAllPredictionsMatchesData(slug: string) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const competition = await prisma.competition.findUnique({
    where: {
      slug,
    },
    select: {
      matches: getPublicPredictionMatchesQuery(),
    },
  });

  if (!competition) {
    return null;
  }

  return serializePublicPredictionMatches(
    competition.matches,
    user.id,
    Date.now(),
  );
}

export async function getAllPredictionsPageData(slug: string) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const competition = await prisma.competition.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      emblemUrl: true,
      bonusEnabled: true,
      bonusPredictions: {
        where: {
          userId: user.id,
        },
        select: {
          id: true,
        },
        take: 1,
      },
      matches: getPublicPredictionMatchesQuery(),
    },
  });

  if (!competition) {
    return null;
  }

  const now = Date.now();

  return {
    id: competition.id,
    name: competition.name,
    slug: competition.slug,
    kind: competition.kind,
    emblemUrl: competition.emblemUrl,
    bonusEnabled: competition.bonusEnabled,
    hasBonusPrediction: competition.bonusPredictions.length > 0,
    matches: serializePublicPredictionMatches(competition.matches, user.id, now),
  };
}
