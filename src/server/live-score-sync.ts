import "server-only";

import type { ExternalDataProvider } from "@prisma/client";

import { prisma } from "@/src/db/prisma";
import {
  importExternalMatchData,
  type ImportedMatch,
} from "@/src/server/football-data-providers";

const LIVE_TRACKING_WINDOW_HOURS = 4;

async function upsertImportedTeam(
  competitionId: string,
  team: NonNullable<ImportedMatch["homeTeam"]>,
) {
  return prisma.team.upsert({
    where: {
      competitionId_externalTeamId: {
        competitionId,
        externalTeamId: team.externalId,
      },
    },
    create: {
      competitionId,
      externalTeamId: team.externalId,
      name: team.name,
      shortName: team.shortName,
      code: team.code,
      flagUrl: team.logoUrl,
    },
    update: {
      name: team.name,
      shortName: team.shortName,
      code: team.code,
      flagUrl: team.logoUrl,
    },
  });
}

async function updateMatchFromExternalData(
  competitionId: string,
  matchId: string,
  importedMatch: ImportedMatch,
) {
  const homeTeam = importedMatch.homeTeam
    ? await upsertImportedTeam(competitionId, importedMatch.homeTeam)
    : null;
  const awayTeam = importedMatch.awayTeam
    ? await upsertImportedTeam(competitionId, importedMatch.awayTeam)
    : null;

  await prisma.match.update({
    where: {
      id: matchId,
    },
    data: {
      homeTeamId: homeTeam?.id,
      awayTeamId: awayTeam?.id,
      homePlaceholder: importedMatch.homePlaceholder,
      awayPlaceholder: importedMatch.awayPlaceholder,
      kickoffAt: importedMatch.kickoffAt,
      stage: importedMatch.stage,
      matchday: importedMatch.matchday,
      status: importedMatch.status,
      homeScore: importedMatch.homeScore,
      awayScore: importedMatch.awayScore,
    },
  });
}

export async function syncLiveScores(now = new Date()) {
  const trackingWindowStart = new Date(
    now.getTime() - LIVE_TRACKING_WINDOW_HOURS * 60 * 60 * 1000,
  );
  const candidateMatches = await prisma.match.findMany({
    where: {
      externalMatchId: {
        not: null,
      },
      status: {
        in: ["SCHEDULED", "LIVE"],
      },
      kickoffAt: {
        lte: now,
        gte: trackingWindowStart,
      },
      competition: {
        externalProvider: "FOOTBALL_DATA",
        status: {
          in: ["OPEN", "LIVE"],
        },
      },
    },
    select: {
      id: true,
      competitionId: true,
      externalMatchId: true,
      competition: {
        select: {
          externalProvider: true,
        },
      },
    },
    orderBy: {
      kickoffAt: "asc",
    },
  });

  let updatedCount = 0;
  const errors: string[] = [];

  for (const match of candidateMatches) {
    if (!match.externalMatchId || !match.competition.externalProvider) {
      continue;
    }

    try {
      const importedMatch = await importExternalMatchData(
        match.competition.externalProvider as ExternalDataProvider,
        match.externalMatchId,
      );

      await updateMatchFromExternalData(
        match.competitionId,
        match.id,
        importedMatch,
      );
      updatedCount += 1;
    } catch (error) {
      errors.push(
        error instanceof Error
          ? `Match ${match.externalMatchId}: ${error.message}`
          : `Match ${match.externalMatchId}: erreur inconnue`,
      );
    }
  }

  return {
    checkedCount: candidateMatches.length,
    updatedCount,
    errors,
  };
}
