import "server-only";

import { computePredictionPoints } from "@/src/domain/scoring";
import { prisma } from "@/src/db/prisma";
import { getLeaderboardData } from "@/src/server/leaderboard";

export type PlayerProfileMatch = {
  id: string;
  kickoffAt: string;
  stage: string;
  status: string;
  canRevealPrediction: boolean;
  homeScore: number | null;
  awayScore: number | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  prediction: {
    homeScore: number;
    awayScore: number;
    points: number | null;
  } | null;
  homeTeam: {
    name: string;
    flagUrl: string | null;
  } | null;
  awayTeam: {
    name: string;
    flagUrl: string | null;
  } | null;
};

export type PlayerProfileData = {
  competition: {
    kind: string;
    name: string;
    slug: string;
    emblemUrl: string | null;
  };
  player: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  stats: {
    officialRank: number | null;
    liveRank: number | null;
    points: number;
    predictedMatches: number;
    exactUnique: number;
    exactShared: number;
    correctOutcome: number;
    missed: number;
    scoredMatches: number;
    availableMatches: number;
    participationRate: number;
  };
  matches: PlayerProfileMatch[];
};

function getUserDisplayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email;
}

function getParticipationRate(predictedMatches: number, availableMatches: number) {
  if (availableMatches === 0) {
    return 0;
  }

  return Math.round((predictedMatches / availableMatches) * 100);
}

export async function getPlayerProfileData(
  slug: string,
  userId: string,
): Promise<PlayerProfileData | null> {
  const [leaderboard, competition] = await Promise.all([
    getLeaderboardData(slug),
    prisma.competition.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        kind: true,
        name: true,
        slug: true,
        emblemUrl: true,
        players: {
          where: {
            userId,
          },
          select: {
            user: {
              select: {
                id: true,
                email: true,
                image: true,
                name: true,
              },
            },
          },
          take: 1,
        },
        matches: {
          orderBy: [{ kickoffAt: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            kickoffAt: true,
            stage: true,
            status: true,
            homeScore: true,
            awayScore: true,
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
                userId: true,
                homeScore: true,
                awayScore: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const player = competition?.players[0]?.user;

  if (!competition || !leaderboard || !player) {
    return null;
  }

  let points = 0;
  let predictedMatches = 0;
  let exactUnique = 0;
  let exactShared = 0;
  let correctOutcome = 0;
  let missed = 0;
  let scoredMatches = 0;
  const availableMatches = competition.matches.filter(
    (match) =>
      match.status !== "CANCELLED" &&
      match.homeTeam !== null &&
      match.awayTeam !== null,
  ).length;

  const matches = competition.matches
    .map((match): PlayerProfileMatch | null => {
      const canRevealPrediction =
        match.status !== "SCHEDULED" || match.kickoffAt.getTime() <= Date.now();
      const prediction =
        match.predictions.find((matchPrediction) => matchPrediction.userId === userId) ??
        null;

      if (!prediction) {
        return null;
      }

      let matchPoints: number | null = null;

      if (
        match.homeScore !== null &&
        match.awayScore !== null &&
        (match.status === "FINISHED" || match.status === "LIVE")
      ) {
        const exactScorePredictionCount = match.predictions.filter(
          (matchPrediction) =>
            matchPrediction.homeScore === match.homeScore &&
            matchPrediction.awayScore === match.awayScore,
        ).length;

        matchPoints = computePredictionPoints({
          prediction: {
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
          },
          result: {
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          },
          exactScorePredictionCount,
        });

        points += matchPoints;
        predictedMatches += 1;
        scoredMatches += 1;

        if (matchPoints === 4) {
          exactUnique += 1;
        } else if (matchPoints === 3) {
          exactShared += 1;
        } else if (matchPoints === 1) {
          correctOutcome += 1;
        } else {
          missed += 1;
        }
      } else {
        predictedMatches += 1;
      }

      return {
        id: match.id,
        kickoffAt: match.kickoffAt.toISOString(),
        stage: match.stage,
        status: match.status,
        canRevealPrediction,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        homePlaceholder: match.homePlaceholder,
        awayPlaceholder: match.awayPlaceholder,
        prediction: {
          homeScore: prediction.homeScore,
          awayScore: prediction.awayScore,
          points: matchPoints,
        },
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
      };
    })
    .filter((match): match is PlayerProfileMatch => match !== null)
    .sort(
      (a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime(),
    );

  const officialRank = leaderboard.official.rows.findIndex((row) => row.userId === userId);
  const liveRank = leaderboard.live.rows.findIndex((row) => row.userId === userId);

  return {
    competition: {
      kind: competition.kind,
      name: competition.name,
      slug: competition.slug,
      emblemUrl: competition.emblemUrl,
    },
    player: {
      id: player.id,
      email: player.email,
      image: player.image,
      name: getUserDisplayName(player),
    },
    stats: {
      officialRank: officialRank >= 0 ? officialRank + 1 : null,
      liveRank: liveRank >= 0 ? liveRank + 1 : null,
      points,
      predictedMatches,
      exactUnique,
      exactShared,
      correctOutcome,
      missed,
      scoredMatches,
      availableMatches,
      participationRate: getParticipationRate(predictedMatches, availableMatches),
    },
    matches,
  };
}
