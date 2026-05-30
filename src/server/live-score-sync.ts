import "server-only";

import type { ExternalDataProvider } from "@prisma/client";

import { prisma } from "@/src/db/prisma";
import {
  importExternalMatchData,
  type ImportedMatch,
} from "@/src/server/football-data-providers";
import {
  scheduleLiveScoresCron,
  setLiveScoresCronEnabled,
} from "@/src/server/cron-job-org";
import {
  getPreMatchReminderLeadTimeMs,
  processFinishedMatchNotifications,
  processPreMatchReminderNotifications,
} from "@/src/server/push-notification-jobs";

const LIVE_TRACKING_WINDOW_HOURS = 4;
const LIVE_SCORE_LOOKAHEAD_HOURS = 26;
const LIVE_SCORE_CRON_TIMEZONE = "Europe/Paris";
const SCHEDULED_START_GRACE_MINUTES = 20;
const SCHEDULED_START_LOOKAHEAD_MINUTES = 60;
const PRE_MATCH_REMINDER_WINDOW_MINUTES = 10;

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
      liveMinute: importedMatch.liveMinute,
      homeScore: importedMatch.homeScore,
      awayScore: importedMatch.awayScore,
    },
  });
}

export async function syncLiveScores(now = new Date()) {
  const candidateMatches = await getLiveScoreCandidateMatches(now);

  let updatedCount = 0;
  const errors: string[] = [];
  const finishedMatchIds: string[] = [];

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
      if (importedMatch.status === "FINISHED" && match.status !== "FINISHED") {
        finishedMatchIds.push(match.id);
      }
      updatedCount += 1;
    } catch (error) {
      errors.push(
        error instanceof Error
          ? `Match ${match.externalMatchId}: ${error.message}`
          : `Match ${match.externalMatchId}: erreur inconnue`,
      );
    }
  }

  const [preMatchNotifications, finishedMatchNotifications] = await Promise.all([
    processPreMatchReminderNotifications(now),
    processFinishedMatchNotifications(finishedMatchIds),
  ]);

  return {
    checkedCount: candidateMatches.length,
    updatedCount,
    notifications: {
      preMatchSentCount: preMatchNotifications.sentCount,
      finishedMatchSentCount: finishedMatchNotifications.sentCount,
    },
    errors,
  };
}

async function getLiveScoreCandidateMatches(now: Date) {
  const trackingWindowStart = new Date(
    now.getTime() - LIVE_TRACKING_WINDOW_HOURS * 60 * 60 * 1000,
  );
  const scheduledGraceStart = new Date(
    now.getTime() - SCHEDULED_START_GRACE_MINUTES * 60 * 1000,
  );

  return prisma.match.findMany({
    where: {
      externalMatchId: {
        not: null,
      },
      OR: [
        {
          status: "LIVE",
          kickoffAt: {
            lte: now,
            gte: trackingWindowStart,
          },
        },
        {
          status: "SCHEDULED",
          kickoffAt: {
            lte: now,
            gte: scheduledGraceStart,
          },
        },
      ],
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
      status: true,
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
}

export async function hasLiveScoreCandidates(now = new Date()) {
  const candidate = await getLiveScoreCandidateMatches(now);

  return candidate.length > 0;
}

async function hasUpcomingScheduledStart(now: Date) {
  const lookaheadEnd = new Date(
    now.getTime() + SCHEDULED_START_LOOKAHEAD_MINUTES * 60 * 1000,
  );
  const match = await prisma.match.findFirst({
    where: {
      OR: [
        {
          externalMatchId: {
            not: null,
          },
          status: "SCHEDULED",
          kickoffAt: {
            gt: now,
            lte: lookaheadEnd,
          },
          competition: {
            externalProvider: "FOOTBALL_DATA",
            status: {
              in: ["OPEN", "LIVE"],
            },
          },
        },
        {
          status: "SCHEDULED",
          kickoffAt: {
            gt: now,
            lte: lookaheadEnd,
          },
          homeTeamId: {
            not: null,
          },
          awayTeamId: {
            not: null,
          },
          competition: {
            status: "OPEN",
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return match !== null;
}

function getTimeZoneHour(date: Date, timeZone: string) {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone,
  })
    .formatToParts(date)
    .find((part) => part.type === "hour");

  return Number(hourPart?.value ?? "0");
}

function getTimeZoneDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getHourlyCronSchedule(matches: { kickoffAt: Date }[], now: Date) {
  const hours = new Set<number>();
  const minimumStart = new Date(now.getTime() - 5 * 60 * 1000);
  const todayKey = getTimeZoneDateKey(now, LIVE_SCORE_CRON_TIMEZONE);

  for (const match of matches) {
    const reminderStart = new Date(match.kickoffAt.getTime() - getPreMatchReminderLeadTimeMs());
    if (reminderStart > now) {
      hours.add(getTimeZoneHour(reminderStart, LIVE_SCORE_CRON_TIMEZONE));
    }

    const liveTrackingStart = new Date(
      match.kickoffAt.getTime() - SCHEDULED_START_GRACE_MINUTES * 60 * 1000,
    );
    const start = liveTrackingStart > minimumStart ? liveTrackingStart : minimumStart;
    const end = new Date(
      match.kickoffAt.getTime() + LIVE_TRACKING_WINDOW_HOURS * 60 * 60 * 1000,
    );

    for (
      let cursor = new Date(start);
      cursor <= end;
      cursor = new Date(cursor.getTime() + 60 * 60 * 1000)
    ) {
      if (getTimeZoneDateKey(cursor, LIVE_SCORE_CRON_TIMEZONE) === todayKey) {
        hours.add(getTimeZoneHour(cursor, LIVE_SCORE_CRON_TIMEZONE));
      }
    }
  }

  return Array.from(hours).sort((a, b) => a - b);
}

export async function prepareLiveScoreCron(now = new Date()) {
  const trackingWindowStart = new Date(
    now.getTime() - LIVE_TRACKING_WINDOW_HOURS * 60 * 60 * 1000,
  );
  const trackingWindowEnd = new Date(
    now.getTime() + LIVE_SCORE_LOOKAHEAD_HOURS * 60 * 60 * 1000,
  );
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        {
          externalMatchId: {
            not: null,
          },
          status: {
            in: ["SCHEDULED", "LIVE"],
          },
          kickoffAt: {
            gte: trackingWindowStart,
            lte: trackingWindowEnd,
          },
          competition: {
            externalProvider: "FOOTBALL_DATA",
            status: {
              in: ["OPEN", "LIVE"],
            },
          },
        },
        {
          status: "SCHEDULED",
          kickoffAt: {
            gt: now,
            lte: trackingWindowEnd,
          },
          homeTeamId: {
            not: null,
          },
          awayTeamId: {
            not: null,
          },
          competition: {
            status: "OPEN",
          },
        },
      ],
    },
    select: {
      id: true,
      kickoffAt: true,
    },
    orderBy: {
      kickoffAt: "asc",
    },
  });
  const todayKey = getTimeZoneDateKey(now, LIVE_SCORE_CRON_TIMEZONE);
  const matchesToSchedule = matches.filter(
    (match) => {
      const reminderStart = new Date(
        match.kickoffAt.getTime() - getPreMatchReminderLeadTimeMs(),
      );
      const reminderWindowEnd = new Date(
        reminderStart.getTime() + PRE_MATCH_REMINDER_WINDOW_MINUTES * 60 * 1000,
      );

      return (
        match.kickoffAt <= now ||
        getTimeZoneDateKey(match.kickoffAt, LIVE_SCORE_CRON_TIMEZONE) ===
          todayKey ||
        (reminderWindowEnd > now &&
          getTimeZoneDateKey(reminderStart, LIVE_SCORE_CRON_TIMEZONE) === todayKey)
      );
    },
  );
  const hours = getHourlyCronSchedule(matchesToSchedule, now);
  const cronJob =
    hours.length > 0
      ? await scheduleLiveScoresCron(hours, LIVE_SCORE_CRON_TIMEZONE)
      : await setLiveScoresCronEnabled(false);

  return {
    scheduledMatchCount: matchesToSchedule.length,
    hours,
    timezone: LIVE_SCORE_CRON_TIMEZONE,
    cronJob,
  };
}

export async function stopLiveScoreCronIfIdle(now = new Date()) {
  const hasCandidates = await hasLiveScoreCandidates(now);

  if (hasCandidates) {
    return {
      stopped: false,
      reason: "Des matchs sont encore a suivre.",
    };
  }

  const hasUpcomingStart = await hasUpcomingScheduledStart(now);

  if (hasUpcomingStart) {
    return {
      stopped: false,
      reason: "Un coup d'envoi approche.",
    };
  }

  const nextSchedule = await prepareLiveScoreCron(now);

  if (nextSchedule.hours.length > 0) {
    return {
      stopped: false,
      reason: "Cron replanifié sur la prochaine fenêtre utile.",
      cronJob: nextSchedule.cronJob,
      hours: nextSchedule.hours,
    };
  }

  const cronJob = await setLiveScoresCronEnabled(false);

  return {
    stopped: !cronJob.skipped,
    reason: cronJob.skipped ? cronJob.reason : "Aucun match a suivre.",
    cronJob,
  };
}
