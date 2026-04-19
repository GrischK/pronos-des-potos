import "server-only";

import { getCurrentUser } from "@/src/auth/current-user";
import { prisma } from "@/src/db/prisma";

export type CompetitionHighlightPrediction = {
  id: string;
  homeScore: number;
  awayScore: number;
  user: {
    id: string;
    name: string;
  };
};

export type CompetitionHighlightMatch = {
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
  ownPrediction: {
    homeScore: number;
    awayScore: number;
  } | null;
  predictions: CompetitionHighlightPrediction[];
  homeTeam: {
    name: string;
    flagUrl: string | null;
  } | null;
  awayTeam: {
    name: string;
    flagUrl: string | null;
  } | null;
};

export type CompetitionHighlightsData = {
  todayMatches: CompetitionHighlightMatch[];
  nextMatches: CompetitionHighlightMatch[];
  nextTitle: string | null;
};

const parisDayFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Paris",
  year: "numeric",
});

const nextDayFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
  weekday: "long",
});

function getUserDisplayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email;
}

function getParisDayKey(date: Date) {
  return parisDayFormatter.format(date);
}

function getNextSectionTitle(match: {
  kickoffAt: Date;
  matchday: number | null;
  stage: string;
}) {
  if (match.stage === "LEAGUE_STAGE" && match.matchday !== null) {
    return `Prochaine journée : J${match.matchday}`;
  }

  return `Prochains matchs : ${nextDayFormatter.format(match.kickoffAt)}`;
}

export async function getCompetitionHighlights(
  slug: string,
): Promise<CompetitionHighlightsData | null> {
  const user = await getCurrentUser();
  const competition = await prisma.competition.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
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
              userId: true,
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

  const now = new Date();
  const nowTime = now.getTime();
  const todayKey = getParisDayKey(now);
  const matches = competition.matches;
  const todayMatches = matches.filter(
    (match) => getParisDayKey(match.kickoffAt) === todayKey,
  );
  const futureMatches = matches.filter(
    (match) => match.kickoffAt.getTime() > nowTime,
  );
  const nextBaseMatch =
    futureMatches.find((match) => getParisDayKey(match.kickoffAt) !== todayKey) ??
    futureMatches[0] ??
    null;
  const nextMatches = nextBaseMatch
    ? matches.filter((match) => {
        if (
          nextBaseMatch.stage === "LEAGUE_STAGE" &&
          nextBaseMatch.matchday !== null
        ) {
          return (
            match.stage === nextBaseMatch.stage &&
            match.matchday === nextBaseMatch.matchday
          );
        }

        return getParisDayKey(match.kickoffAt) === getParisDayKey(nextBaseMatch.kickoffAt);
      })
    : [];

  function serializeMatch(match: (typeof matches)[number]) {
    const canRevealPredictions =
      match.status !== "SCHEDULED" || match.kickoffAt.getTime() <= nowTime;
    const predictions = match.predictions
      .map((prediction) => ({
        id: prediction.id,
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        user: {
          id: prediction.user.id,
          name: getUserDisplayName(prediction.user),
        },
      }))
      .sort((a, b) => a.user.name.localeCompare(b.user.name, "fr"));
    const ownPrediction = user
      ? predictions.find((prediction) => prediction.user.id === user.id) ?? null
      : null;

    return {
      id: match.id,
      kickoffAt: match.kickoffAt.toISOString(),
      stage: match.stage,
      matchday: match.matchday,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homePlaceholder: match.homePlaceholder,
      awayPlaceholder: match.awayPlaceholder,
      canRevealPredictions,
      ownPrediction: ownPrediction
        ? {
            homeScore: ownPrediction.homeScore,
            awayScore: ownPrediction.awayScore,
          }
        : null,
      predictions,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    };
  }

  return {
    todayMatches: todayMatches.map(serializeMatch),
    nextMatches: nextMatches.map(serializeMatch),
    nextTitle: nextBaseMatch ? getNextSectionTitle(nextBaseMatch) : null,
  };
}
