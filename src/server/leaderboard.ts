import "server-only";

import { getCompetitionStageLabel, isTwoLeggedCompetitionStage } from "@/src/domain/competition-stage";
import { computePredictionPoints } from "@/src/domain/scoring";
import { prisma } from "@/src/db/prisma";
import { buildBonusPointsByUser } from "@/src/server/bonus";

export type LeaderboardRow = {
  userId: string;
  name: string;
  image: string | null;
  rank: number;
  tieCount: number;
  bonusPoints: number;
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
  bonusEnabled: boolean;
  participantCount: number;
  official: LeaderboardSnapshot;
  live: LeaderboardSnapshot;
  liveMatches: LeaderboardLiveMatch[];
};

export type LeaderboardProgressData = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  emblemUrl: string | null;
  bonusEnabled: boolean;
  participantCount: number;
  sections: {
    id: string;
    label: string;
    title: string;
    matchCount: number;
  }[];
  players: {
    userId: string;
    name: string;
    image: string | null;
    bestRank: number | null;
    currentPoints: number;
    currentRank: number | null;
    history: {
      sectionId: string;
      label: string;
      title: string;
      points: number;
      rank: number;
    }[];
  }[];
};

export type LeaderboardSnapshot = {
  rows: LeaderboardRow[];
  matchCount: number;
  liveMatchCount: number;
};

export type LeaderboardLiveMatch = {
  id: string;
  kickoffAt: string;
  stage: string;
  status: string;
  liveMinute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  homeTeam: {
    name: string;
    flagUrl: string | null;
  } | null;
  awayTeam: {
    name: string;
    flagUrl: string | null;
  } | null;
  predictions: {
    id: string;
    homeScore: number;
    awayScore: number;
    user: {
      id: string;
      name: string;
    };
  }[];
};

function getUserDisplayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email;
}

type LeaderboardMatch = {
  id: string;
  kickoffAt?: Date;
  matchday?: number | null;
  stage?: string;
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
      image: string | null;
      name: string | null;
    };
  }[];
};

type CompetitionPlayer = {
  user: {
    id: string;
    email: string;
    image: string | null;
    name: string | null;
  };
};

type LeaderboardStandingRow = Omit<LeaderboardRow, "rank" | "tieCount">;

const sectionTitleFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

const sectionLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});

function buildLeaderboardSnapshot(
  players: CompetitionPlayer[],
  matches: LeaderboardMatch[],
  bonusPointsByUser: Map<string, number> = new Map(),
): LeaderboardSnapshot {
  const rowsByUser = new Map<string, LeaderboardStandingRow>();

  for (const player of players) {
    rowsByUser.set(player.user.id, {
      userId: player.user.id,
      name: getUserDisplayName(player.user),
      image: player.user.image,
      bonusPoints: 0,
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
      const row: LeaderboardStandingRow =
        rowsByUser.get(prediction.userId) ??
        {
          userId: prediction.userId,
          name: getUserDisplayName(prediction.user),
          image: prediction.user.image,
          bonusPoints: 0,
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

  for (const row of rowsByUser.values()) {
    const bonusPoints = bonusPointsByUser.get(row.userId) ?? 0;

    row.bonusPoints += bonusPoints;
    row.points += bonusPoints;
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

  let currentRank = 0;
  let currentGroupSize = 0;
  let previousKey: string | null = null;

  const rankedRows = rows.map((row) => {
    const rankingKey = [
      row.points,
      row.exactUnique,
      row.exactShared,
      row.correctOutcome,
      row.predictedMatches,
    ].join("|");

    if (rankingKey !== previousKey) {
      currentRank = currentRank === 0 ? 1 : currentRank + currentGroupSize;
      currentGroupSize = 1;
      previousKey = rankingKey;
    } else {
      currentGroupSize += 1;
    }

    return { ...row, rank: currentRank, tieCount: currentGroupSize };
  });

  return {
    rows: rankedRows,
    matchCount: matches.length,
    liveMatchCount: matches.filter((match) => match.status === "LIVE").length,
  };
}

function getStageSectionMeta(stage: string) {
  const phaseTitle = getCompetitionStageLabel(stage);
  const phaseLabelMap: Record<string, string> = {
    FINAL: "Finale",
    GROUP_STAGE: "Groupes",
    LAST_16: "8es",
    LAST_32: "16es",
    LEAGUE_STAGE: "Ligue",
    PLAYOFFS: "Barrages",
    QUARTER_FINALS: "Quarts",
    SEMI_FINALS: "Demies",
    THIRD_PLACE: "3e place",
  };

  return {
    label: phaseLabelMap[stage] ?? phaseTitle,
    title: phaseTitle,
  };
}

function getDateSectionKey(match: LeaderboardMatch) {
  if (match.stage === "LEAGUE_STAGE" && match.matchday !== null && match.matchday !== undefined) {
    return {
      id: `matchday-${match.matchday}`,
      label: `J${match.matchday}`,
      title: `Journée ${match.matchday}`,
    };
  }

  const kickoffAt = match.kickoffAt;

  if (!kickoffAt || Number.isNaN(kickoffAt.getTime())) {
    return {
      id: `match-${match.id}`,
      label: "?",
      title: "Date à confirmer",
    };
  }

  const isoDate = kickoffAt.toISOString().slice(0, 10);

  return {
    id: `day-${isoDate}`,
    label: sectionLabelFormatter.format(kickoffAt),
    title: sectionTitleFormatter.format(kickoffAt),
  };
}

function buildLeaderboardProgressData(
  competition: {
    id: string;
    name: string;
    slug: string;
    kind: string;
    emblemUrl: string | null;
    bonusEnabled: boolean;
    players: CompetitionPlayer[];
    matches: LeaderboardMatch[];
  },
  bonusPointsByUser: Map<string, number>,
): LeaderboardProgressData {
  const finishedMatches = [...competition.matches]
    .filter((match) => match.status === "FINISHED")
    .sort((a, b) => {
      const kickoffDiff =
        (a.kickoffAt?.getTime() ?? 0) - (b.kickoffAt?.getTime() ?? 0);

      if (kickoffDiff !== 0) {
        return kickoffDiff;
      }

      return a.id.localeCompare(b.id, "fr");
    });
  const sectionMatches = new Map<string, LeaderboardMatch[]>();
  const sections: LeaderboardProgressData["sections"] = [];
  const finishedMatchesByStage = new Map<string, LeaderboardMatch[]>();

  for (const match of finishedMatches) {
    if (match.stage === "LEAGUE_STAGE" && match.matchday !== null && match.matchday !== undefined) {
      const section = getDateSectionKey(match);

      if (!sectionMatches.has(section.id)) {
        sectionMatches.set(section.id, []);
        sections.push({
          id: section.id,
          label: section.label,
          title: section.title,
          matchCount: 0,
        });
      }

      sectionMatches.set(section.id, [...(sectionMatches.get(section.id) ?? []), match]);
      const targetSection = sections.find((item) => item.id === section.id);

      if (targetSection) {
        targetSection.matchCount += 1;
      }

      continue;
    }

    if (match.stage) {
      finishedMatchesByStage.set(match.stage, [
        ...(finishedMatchesByStage.get(match.stage) ?? []),
        match,
      ]);
      continue;
    }

    const section = getDateSectionKey(match);

    if (!sectionMatches.has(section.id)) {
      sectionMatches.set(section.id, []);
      sections.push({
        id: section.id,
        label: section.label,
        title: section.title,
        matchCount: 0,
      });
    }

    sectionMatches.set(section.id, [...(sectionMatches.get(section.id) ?? []), match]);
    const targetSection = sections.find((item) => item.id === section.id);

    if (targetSection) {
      targetSection.matchCount += 1;
    }
  }

  for (const [stage, stageMatches] of finishedMatchesByStage.entries()) {
    const stageSection = getStageSectionMeta(stage);
    const orderedStageMatches = [...stageMatches].sort((a, b) => {
      const kickoffDiff = (a.kickoffAt?.getTime() ?? 0) - (b.kickoffAt?.getTime() ?? 0);

      if (kickoffDiff !== 0) {
        return kickoffDiff;
      }

      return a.id.localeCompare(b.id, "fr");
    });
    const shouldSplitLegs =
      isTwoLeggedCompetitionStage(competition.kind, stage) &&
      orderedStageMatches.length > 1 &&
      orderedStageMatches.length % 2 === 0;

    if (shouldSplitLegs) {
      const splitIndex = orderedStageMatches.length / 2;
      const allerMatches = orderedStageMatches.slice(0, splitIndex);
      const retourMatches = orderedStageMatches.slice(splitIndex);
      const legSections = [
        {
          id: `stage-${stage}-aller`,
          label: `${stageSection.label} A`,
          title: `${stageSection.title} aller`,
          matches: allerMatches,
        },
        {
          id: `stage-${stage}-retour`,
          label: `${stageSection.label} R`,
          title: `${stageSection.title} retour`,
          matches: retourMatches,
        },
      ];

      for (const legSection of legSections) {
        sectionMatches.set(legSection.id, legSection.matches);
        sections.push({
          id: legSection.id,
          label: legSection.label,
          title: legSection.title,
          matchCount: legSection.matches.length,
        });
      }

      continue;
    }

    const sectionId = `stage-${stage}`;

    sectionMatches.set(sectionId, orderedStageMatches);
    sections.push({
      id: sectionId,
      label: stageSection.label,
      title: stageSection.title,
      matchCount: orderedStageMatches.length,
    });
  }

  const snapshots = sections.map((section) => {
    const sectionIndex = sections.findIndex((item) => item.id === section.id);
    const matches = sections
      .slice(0, sectionIndex + 1)
      .flatMap((item) => sectionMatches.get(item.id) ?? []);

    return {
      section,
      snapshot: buildLeaderboardSnapshot(
        competition.players,
        matches,
        bonusPointsByUser,
      ),
    };
  });

  const players = competition.players
    .map((player) => {
      const history = snapshots
        .map(({ section, snapshot }) => {
          const row = snapshot.rows.find((item) => item.userId === player.user.id);

          if (!row) {
            return null;
          }

          return {
            sectionId: section.id,
            label: section.label,
            title: section.title,
            points: row.points,
            rank: row.rank,
          };
        })
        .filter(
          (
            point,
          ): point is {
            sectionId: string;
            label: string;
            title: string;
            points: number;
            rank: number;
          } => point !== null,
        );
      const current = history[history.length - 1] ?? null;

      return {
        userId: player.user.id,
        name: getUserDisplayName(player.user),
        image: player.user.image,
        bestRank: history.length > 0 ? Math.min(...history.map((point) => point.rank)) : null,
        currentPoints: current?.points ?? 0,
        currentRank: current?.rank ?? null,
        history,
      };
    })
    .sort((a, b) => {
      if (a.currentRank === null && b.currentRank === null) {
        return a.name.localeCompare(b.name, "fr");
      }

      if (a.currentRank === null) {
        return 1;
      }

      if (b.currentRank === null) {
        return -1;
      }

      return a.currentRank - b.currentRank || a.name.localeCompare(b.name, "fr");
    });

  return {
    id: competition.id,
    name: competition.name,
    slug: competition.slug,
    kind: competition.kind,
    emblemUrl: competition.emblemUrl,
    bonusEnabled: competition.bonusEnabled,
    participantCount: competition.players.length,
    sections,
    players,
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
      bonusEnabled: true,
      bonusWinnerTeamId: true,
      bonusSecondTeamId: true,
      bonusThirdTeamId: true,
      players: {
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
      },
      bonusPredictions: {
        select: {
          userId: true,
          winnerTeamId: true,
          secondTeamId: true,
          thirdTeamId: true,
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
          kickoffAt: true,
          matchday: true,
          stage: true,
          status: true,
          liveMinute: true,
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
              userId: true,
              homeScore: true,
              awayScore: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  image: true,
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

  const bonusPointsByUser = buildBonusPointsByUser(
    competition.bonusPredictions,
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
    competition.bonusEnabled,
  );

  const officialMatches = competition.matches.filter(
    (match) => match.status === "FINISHED",
  );
  const liveMatches = competition.matches.filter(
    (match) => match.status === "FINISHED" || match.status === "LIVE",
  );
  const liveMatchCards = competition.matches
    .filter((match) => match.status === "LIVE")
    .map((match) => ({
      id: match.id,
      kickoffAt: match.kickoffAt.toISOString(),
      stage: match.stage,
      status: match.status,
      liveMinute: match.liveMinute,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homePlaceholder: match.homePlaceholder,
      awayPlaceholder: match.awayPlaceholder,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
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
    }));

  return {
    id: competition.id,
    name: competition.name,
    slug: competition.slug,
    kind: competition.kind,
    emblemUrl: competition.emblemUrl,
    bonusEnabled: competition.bonusEnabled,
    participantCount: competition.players.length,
    official: buildLeaderboardSnapshot(
      competition.players,
      officialMatches,
      bonusPointsByUser,
    ),
    live: buildLeaderboardSnapshot(
      competition.players,
      liveMatches,
      bonusPointsByUser,
    ),
    liveMatches: liveMatchCards,
  };
}

export async function getLeaderboardProgressData(
  slug: string,
): Promise<LeaderboardProgressData | null> {
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
      bonusWinnerTeamId: true,
      bonusSecondTeamId: true,
      bonusThirdTeamId: true,
      players: {
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
      },
      bonusPredictions: {
        select: {
          userId: true,
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
        orderBy: [{ kickoffAt: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          kickoffAt: true,
          matchday: true,
          stage: true,
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
                  image: true,
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

  const bonusPointsByUser = buildBonusPointsByUser(
    competition.bonusPredictions,
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
    competition.bonusEnabled,
  );

  return buildLeaderboardProgressData(competition, bonusPointsByUser);
}
