import "server-only";

import {
  computePredictionPoints,
  formatMatchScoreText,
  getMatchResultForPoints,
} from "@/src/domain/scoring";
import { prisma } from "@/src/db/prisma";
import {
  isPushNotificationConfigured,
  sendPushNotificationToUser,
} from "@/src/server/push-notifications";

const PRE_MATCH_REMINDER_HOURS = 3;
const PRE_MATCH_REMINDER_WINDOW_MINUTES = 10;

function getTeamName(match: {
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
}, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;

  return team?.name ?? placeholder ?? "À déterminer";
}

function formatKickoffAt(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(value);
}

function getReminderDeliveryKey(matchId: string, userId: string) {
  return `pre-match-reminder:${matchId}:${userId}:${PRE_MATCH_REMINDER_HOURS}h`;
}

function getResultDeliveryKey(matchId: string, userId: string) {
  return `match-result:${matchId}:${userId}`;
}

export function getPreMatchReminderLeadTimeMs() {
  return PRE_MATCH_REMINDER_HOURS * 60 * 60 * 1000;
}

export async function processPreMatchReminderNotifications(now = new Date()) {
  if (!isPushNotificationConfigured()) {
    console.warn("[push/pre-match] skipped: push notifications not configured");
    return {
      sentCount: 0,
    };
  }

  const latestKickoffAt = new Date(now.getTime() + getPreMatchReminderLeadTimeMs());
  const earliestKickoffAt = new Date(
    latestKickoffAt.getTime() - PRE_MATCH_REMINDER_WINDOW_MINUTES * 60 * 1000,
  );

  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      kickoffAt: {
        gt: earliestKickoffAt,
        lte: latestKickoffAt,
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
    select: {
      id: true,
      kickoffAt: true,
      competition: {
        select: {
          slug: true,
          players: {
            select: {
              userId: true,
            },
          },
        },
      },
      predictions: {
        select: {
          userId: true,
        },
      },
      homeTeam: {
        select: {
          name: true,
        },
      },
      awayTeam: {
        select: {
          name: true,
        },
      },
      homePlaceholder: true,
      awayPlaceholder: true,
    },
  });

  const deliveryKeys = matches.flatMap((match) =>
    match.competition.players.map((player) => getReminderDeliveryKey(match.id, player.userId)),
  );

  const deliveredKeys = new Set(
    (
      await prisma.pushNotificationDelivery.findMany({
        where: {
          deliveryKey: {
            in: deliveryKeys,
          },
        },
        select: {
          deliveryKey: true,
        },
      })
    ).map((item) => item.deliveryKey),
  );

  const deliveredRecords: Array<{
    deliveryKey: string;
    kind: string;
    matchId: string;
    userId: string;
  }> = [];

  for (const match of matches) {
    const predictedUserIds = new Set(match.predictions.map((prediction) => prediction.userId));
    const homeTeamName = getTeamName(match, "home");
    const awayTeamName = getTeamName(match, "away");

    for (const player of match.competition.players) {
      if (predictedUserIds.has(player.userId)) {
        continue;
      }

      const deliveryKey = getReminderDeliveryKey(match.id, player.userId);

      if (deliveredKeys.has(deliveryKey)) {
        continue;
      }

      try {
        const result = await sendPushNotificationToUser(player.userId, {
          body: `${homeTeamName} - ${awayTeamName} commence à ${formatKickoffAt(match.kickoffAt)}. Tu n'as pas encore posé ton prono.`,
          tag: `match-reminder-${match.id}`,
          title: "Pense à ton prono",
          url: `/competitions/${match.competition.slug}/pronos?match=${match.id}#match-${match.id}`,
        });

        if (result.delivered > 0) {
          deliveredRecords.push({
            deliveryKey,
            kind: "PRE_MATCH_REMINDER",
            matchId: match.id,
            userId: player.userId,
          });
        }
      } catch (error) {
        console.warn("[push/pre-match] failed", {
          matchId: match.id,
          userId: player.userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (deliveredRecords.length > 0) {
    await prisma.pushNotificationDelivery.createMany({
      data: deliveredRecords,
      skipDuplicates: true,
    });
  }

  return {
    sentCount: deliveredRecords.length,
  };
}

export async function processFinishedMatchNotifications(finishedMatchIds: string[]) {
  if (finishedMatchIds.length === 0) {
    return {
      sentCount: 0,
    };
  }

  if (!isPushNotificationConfigured()) {
    console.warn("[push/finished] skipped: push notifications not configured");
    return {
      sentCount: 0,
    };
  }

  const matches = await prisma.match.findMany({
    where: {
      id: {
        in: finishedMatchIds,
      },
      status: "FINISHED",
      homeScore: {
        not: null,
      },
      awayScore: {
        not: null,
      },
    },
    select: {
      id: true,
      competition: {
        select: {
          slug: true,
        },
      },
      homeScore: true,
      awayScore: true,
      regularHomeScore: true,
      regularAwayScore: true,
      extraTimeHomeScore: true,
      extraTimeAwayScore: true,
      penaltyHomeScore: true,
      penaltyAwayScore: true,
      predictions: {
        select: {
          homeScore: true,
          awayScore: true,
          userId: true,
        },
      },
      homeTeam: {
        select: {
          name: true,
        },
      },
      awayTeam: {
        select: {
          name: true,
        },
      },
      homePlaceholder: true,
      awayPlaceholder: true,
    },
  });

  const deliveryKeys = matches.flatMap((match) =>
    match.predictions.map((prediction) => getResultDeliveryKey(match.id, prediction.userId)),
  );

  const deliveredKeys = new Set(
    (
      await prisma.pushNotificationDelivery.findMany({
        where: {
          deliveryKey: {
            in: deliveryKeys,
          },
        },
        select: {
          deliveryKey: true,
        },
      })
    ).map((item) => item.deliveryKey),
  );

  const deliveredRecords: Array<{
    deliveryKey: string;
    kind: string;
    matchId: string;
    userId: string;
  }> = [];

  for (const match of matches) {
    const homeTeamName = getTeamName(match, "home");
    const awayTeamName = getTeamName(match, "away");
    const result = getMatchResultForPoints(match);

    if (result === null) {
      continue;
    }

    const exactScorePredictionCount = match.predictions.filter(
      (prediction) =>
        prediction.homeScore === result.homeScore &&
        prediction.awayScore === result.awayScore,
    ).length;

    for (const prediction of match.predictions) {
      const deliveryKey = getResultDeliveryKey(match.id, prediction.userId);

      if (deliveredKeys.has(deliveryKey)) {
        continue;
      }

      const points = computePredictionPoints({
        prediction: {
          awayScore: prediction.awayScore,
          homeScore: prediction.homeScore,
        },
        result,
        exactScorePredictionCount,
      });

      const scoreSummary = formatMatchScoreText(match).replace(/\n/g, " | ");

      try {
        const notificationResult = await sendPushNotificationToUser(prediction.userId, {
          body: `Résultat : ${scoreSummary}. Ton prono : ${prediction.homeScore} · ${prediction.awayScore}. Tu gagnes ${points} ${points > 1 ? "points" : "point"}.`,
          tag: `match-result-${match.id}`,
          title: `${homeTeamName} ${match.homeScore} · ${match.awayScore} ${awayTeamName}`,
          url: `/competitions/${match.competition.slug}/classement?mode=live`,
        });

        if (notificationResult.delivered > 0) {
          deliveredRecords.push({
            deliveryKey,
            kind: "MATCH_RESULT",
            matchId: match.id,
            userId: prediction.userId,
          });
        }
      } catch (error) {
        console.warn("[push/finished] failed", {
          matchId: match.id,
          userId: prediction.userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (deliveredRecords.length > 0) {
    await prisma.pushNotificationDelivery.createMany({
      data: deliveredRecords,
      skipDuplicates: true,
    });
  }

  return {
    sentCount: deliveredRecords.length,
  };
}
