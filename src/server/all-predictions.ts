import "server-only";

import { getCurrentUser } from "@/src/auth/current-user";
import { prisma } from "@/src/db/prisma";

export type PublicPredictionMatch = {
  id: string;
  kickoffAt: string;
  stage: string;
  matchday: number | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  canRevealPredictions: boolean;
  predictions: {
    id: string;
    homeScore: number;
    awayScore: number;
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
};

function getUserDisplayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email;
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
      matches: {
        orderBy: [{ kickoffAt: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          kickoffAt: true,
          stage: true,
          matchday: true,
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
    emblemUrl: competition.emblemUrl,
    matches: competition.matches.map((match): PublicPredictionMatch => ({
      id: match.id,
      kickoffAt: match.kickoffAt.toISOString(),
      stage: match.stage,
      matchday: match.matchday,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homePlaceholder: match.homePlaceholder,
      awayPlaceholder: match.awayPlaceholder,
      canRevealPredictions:
        match.status !== "SCHEDULED" || match.kickoffAt.getTime() <= now,
      predictions: match.predictions
        .map((prediction) => ({
          id: prediction.id,
          homeScore: prediction.homeScore,
          awayScore: prediction.awayScore,
          user: {
            id: prediction.user.id,
            name: getUserDisplayName(prediction.user),
          },
        }))
        .sort((a, b) => a.user.name.localeCompare(b.user.name, "fr")),
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    })),
  };
}
