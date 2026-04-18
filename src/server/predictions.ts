import "server-only";

import { getCurrentUser } from "@/src/auth/current-user";
import { prisma } from "@/src/db/prisma";

export type PredictionMatch = {
  id: string;
  kickoffAt: string;
  stage: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  canPredict: boolean;
  prediction: {
    homeScore: number;
    awayScore: number;
  } | null;
  homeTeam: {
    name: string;
    flagUrl: string | null;
  };
  awayTeam: {
    name: string;
    flagUrl: string | null;
  };
};

export async function getPredictionPageData(slug: string) {
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
      status: true,
      matches: {
        orderBy: [{ kickoffAt: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          kickoffAt: true,
          stage: true,
          status: true,
          homeScore: true,
          awayScore: true,
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
            where: {
              userId: user.id,
            },
            select: {
              homeScore: true,
              awayScore: true,
            },
            take: 1,
          },
        },
      },
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
    status: competition.status,
    isOpen: competition.status === "OPEN",
    matches: competition.matches.map((match): PredictionMatch => ({
      id: match.id,
      kickoffAt: match.kickoffAt.toISOString(),
      stage: match.stage,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      canPredict:
        competition.status === "OPEN" &&
        match.status === "SCHEDULED" &&
        match.kickoffAt.getTime() > now,
      prediction: match.predictions[0] ?? null,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    })),
  };
}
