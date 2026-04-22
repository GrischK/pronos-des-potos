import "server-only";

import { computePredictionPoints } from "@/src/domain/scoring";
import { prisma } from "@/src/db/prisma";

export type LeaderboardRow = {
  userId: string;
  name: string;
  points: number;
  predictedMatches: number;
  exactUnique: number;
  exactShared: number;
  correctOutcome: number;
  missed: number;
};

export type LeaderboardData = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  emblemUrl: string | null;
  participantCount: number;
  official: LeaderboardSnapshot;
  live: LeaderboardSnapshot;
};

export type LeaderboardSnapshot = {
  rows: LeaderboardRow[];
  matchCount: number;
  liveMatchCount: number;
};

function getUserDisplayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email;
}

type LeaderboardMatch = {
  id: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  predictions: {
    userId: string;
    homeScore: number;
    awayScore: number;
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }[];
};

type CompetitionPlayer = {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

function buildLeaderboardSnapshot(
  players: CompetitionPlayer[],
  matches: LeaderboardMatch[],
): LeaderboardSnapshot {
  const rowsByUser = new Map<string, LeaderboardRow>();

  for (const player of players) {
    rowsByUser.set(player.user.id, {
      userId: player.user.id,
      name: getUserDisplayName(player.user),
      points: 0,
      predictedMatches: 0,
      exactUnique: 0,
      exactShared: 0,
      correctOutcome: 0,
      missed: 0,
    });
  }

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) {
      continue;
    }

    const exactScorePredictionCount = match.predictions.filter(
      (prediction) =>
        prediction.homeScore === match.homeScore &&
        prediction.awayScore === match.awayScore,
    ).length;

    for (const prediction of match.predictions) {
      const row =
        rowsByUser.get(prediction.userId) ??
        {
          userId: prediction.userId,
          name: getUserDisplayName(prediction.user),
          points: 0,
          predictedMatches: 0,
          exactUnique: 0,
          exactShared: 0,
          correctOutcome: 0,
          missed: 0,
        };
      const points = computePredictionPoints({
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

      row.points += points;
      row.predictedMatches += 1;

      if (points === 4) {
        row.exactUnique += 1;
      } else if (points === 3) {
        row.exactShared += 1;
      } else if (points === 1) {
        row.correctOutcome += 1;
      } else {
        row.missed += 1;
      }

      rowsByUser.set(row.userId, row);
    }
  }

  const rows = Array.from(rowsByUser.values()).sort(
    (a, b) =>
      b.points - a.points ||
      b.exactUnique - a.exactUnique ||
      b.exactShared - a.exactShared ||
      b.correctOutcome - a.correctOutcome ||
      b.predictedMatches - a.predictedMatches ||
      a.name.localeCompare(b.name, "fr"),
  );

  return {
    rows,
    matchCount: matches.length,
    liveMatchCount: matches.filter((match) => match.status === "LIVE").length,
  };
}

export async function getLeaderboardData(
  slug: string,
): Promise<LeaderboardData | null> {
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
      players: {
        select: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
      matches: {
        where: {
          status: {
            in: ["FINISHED", "LIVE"],
          },
          homeScore: {
            not: null,
          },
          awayScore: {
            not: null,
          },
        },
        select: {
          id: true,
          status: true,
          homeScore: true,
          awayScore: true,
          predictions: {
            select: {
              userId: true,
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
        },
      },
    },
  });

  if (!competition) {
    return null;
  }

  const officialMatches = competition.matches.filter(
    (match) => match.status === "FINISHED",
  );
  const liveMatches = competition.matches.filter(
    (match) => match.status === "FINISHED" || match.status === "LIVE",
  );

  return {
    id: competition.id,
    name: competition.name,
    slug: competition.slug,
    kind: competition.kind,
    emblemUrl: competition.emblemUrl,
    participantCount: competition.players.length,
    official: buildLeaderboardSnapshot(competition.players, officialMatches),
    live: buildLeaderboardSnapshot(competition.players, liveMatches),
  };
}
