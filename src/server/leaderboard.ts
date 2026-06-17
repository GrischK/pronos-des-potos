import "server-only";

import { getCompetitionStageLabel, isTwoLeggedCompetitionStage } from "@/src/domain/competition-stage";
import {
  computePredictionPoints,
  type MatchScoreDisplayInput,
  getMatchResultForPoints,
} from "@/src/domain/scoring";
import { prisma } from "@/src/db/prisma";
import {
  buildBonusPointsByUser,
  resolveBonusResult,
} from "@/src/server/bonus";

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
  bonusResultKnown: boolean;
  participantCount: number;
  official: LeaderboardSnapshot;
  live: LeaderboardSnapshot;
  liveMatches: LeaderboardLiveMatch[];
  tournamentStats: LeaderboardTournamentStat[];
};

export type LeaderboardTournamentStat = {
  key: string;
  title: string;
  tooltip: string | null;
  value: string;
  leaders: {
    userId: string;
    name: string;
  }[];
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

export type LeaderboardProgressBundle = {
  official: LeaderboardProgressData;
  live: LeaderboardProgressData;
  liveMatches: LeaderboardLiveMatch[];
};

export type LeaderboardSnapshot = {
  rows: LeaderboardRow[];
  matchCount: number;
  liveMatchCount: number;
};

type LeaderboardProgressSnapshot = {
  section: LeaderboardProgressData["sections"][number];
  snapshot: LeaderboardSnapshot;
};

export type LeaderboardLiveMatch = {
  id: string;
  kickoffAt: string;
  stage: string;
  status: string;
  liveMinute: number | null;
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
    points: number | null;
    user: {
      id: string;
      name: string;
    };
    }[];
} & MatchScoreDisplayInput;

function getUserDisplayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email;
}

type LeaderboardMatch = {
  id: string;
  kickoffAt?: Date;
  matchday?: number | null;
  stage?: string;
  status: string;
  liveMinute?: number | null;
  homePlaceholder?: string | null;
  awayPlaceholder?: string | null;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  homeTeam?: {
    name: string;
    flagUrl: string | null;
  } | null;
  awayTeam?: {
    name: string;
    flagUrl: string | null;
  } | null;
  predictions: {
    id?: string;
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
} & MatchScoreDisplayInput;

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

const worldCupProgressLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
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
        result,
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

function getWorldCupSectionMeta(stage: string) {
  const phaseTitle = getCompetitionStageLabel(stage);
  const phaseLabelMap: Record<string, string> = {
    FINAL: "Finale",
    GROUP_STAGE: "Groupe",
    LAST_16: "8es",
    LAST_32: "16es",
    QUARTER_FINALS: "Quarts",
    SEMI_FINALS: "Demi-finales",
    THIRD_PLACE: "3e place",
    PLAYOFFS: "Barrages",
  };

  return {
    label: phaseLabelMap[stage] ?? phaseTitle,
    title: phaseTitle,
  };
}

function getProgressSectionMeta(
  competitionKind: string,
  match: LeaderboardMatch,
) {
  if (competitionKind === "WORLD_CUP") {
    const kickoffAt = match.kickoffAt;

    if (!kickoffAt || Number.isNaN(kickoffAt.getTime())) {
      const stageSection = getWorldCupSectionMeta(match.stage ?? "");

      return {
        id: `stage-${match.stage}-unknown-date`,
        label: stageSection.label,
        title: stageSection.title,
      };
    }

    const stageSection = getWorldCupSectionMeta(match.stage ?? "");
    const dateLabel = worldCupProgressLabelFormatter.format(kickoffAt);
    const isoDate = kickoffAt.toISOString().slice(0, 10);

    return {
      id: `stage-${match.stage}-day-${isoDate}`,
      label: `${stageSection.label} ${dateLabel}`,
      title: `${stageSection.title} - ${dateLabel}`,
    };
  }

  if (match.stage === "LEAGUE_STAGE" && match.matchday !== null && match.matchday !== undefined) {
    return {
      id: `matchday-${match.matchday}`,
      label: `J${match.matchday}`,
      title: `Journée ${match.matchday}`,
    };
  }

  if (match.stage) {
    const stageSection = getStageSectionMeta(match.stage);

    return {
      id: `stage-${match.stage}`,
      label: stageSection.label,
      title: stageSection.title,
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

function buildLeaderboardProgressDataFromSnapshots(
  competition: {
    id: string;
    name: string;
    slug: string;
    kind: string;
    emblemUrl: string | null;
    bonusEnabled: boolean;
    players: CompetitionPlayer[];
  },
  snapshots: LeaderboardProgressSnapshot[],
): LeaderboardProgressData {
  const sections = snapshots.map(({ section }) => section);
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

function buildLeaderboardProgressSnapshots(
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
  matches: LeaderboardMatch[],
  includeLiveMatches: boolean,
): LeaderboardProgressSnapshot[] {
  const finishedMatches = [...matches]
    .filter((match) =>
      includeLiveMatches ? match.status === "FINISHED" || match.status === "LIVE" : match.status === "FINISHED",
    )
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
    if (competition.kind === "WORLD_CUP") {
      const section = getProgressSectionMeta(competition.kind, match);

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

    const section = getProgressSectionMeta(competition.kind, match);

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
      const stageSection = getStageSectionMeta(stage);
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

    const stageSection = getStageSectionMeta(stage);

    sectionMatches.set(`stage-${stage}`, orderedStageMatches);
    sections.push({
      id: `stage-${stage}`,
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
  return snapshots;
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
  const snapshots = buildLeaderboardProgressSnapshots(
    competition,
    bonusPointsByUser,
    competition.matches,
    false,
  );

  return buildLeaderboardProgressDataFromSnapshots(competition, snapshots);
}

function buildLeaderboardProgressDataLive(
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
  const snapshots = buildLeaderboardProgressSnapshots(
    competition,
    bonusPointsByUser,
    competition.matches.filter(
      (match) => match.status === "FINISHED" || match.status === "LIVE",
    ),
    true,
  );

  return buildLeaderboardProgressDataFromSnapshots(competition, snapshots);
}

function buildLeaderboardProgressLiveMatches(
  matches: LeaderboardMatch[],
): LeaderboardLiveMatch[] {
  return matches
    .filter((match) => match.status === "LIVE")
    .map((match) => ({
      id: match.id,
      kickoffAt: match.kickoffAt?.toISOString() ?? new Date().toISOString(),
      stage: match.stage ?? "",
      status: match.status,
      liveMinute: match.liveMinute ?? null,
      homePlaceholder: match.homePlaceholder ?? null,
      awayPlaceholder: match.awayPlaceholder ?? null,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      regularHomeScore: match.regularHomeScore,
      regularAwayScore: match.regularAwayScore,
      extraTimeHomeScore: match.extraTimeHomeScore,
      extraTimeAwayScore: match.extraTimeAwayScore,
      penaltyHomeScore: match.penaltyHomeScore,
      penaltyAwayScore: match.penaltyAwayScore,
      homeTeam: match.homeTeam ?? null,
      awayTeam: match.awayTeam ?? null,
      predictions: match.predictions
        .map((prediction) => {
          let points: number | null = null;

          const result = getMatchResultForPoints(match);

          if (result !== null) {
            const exactScorePredictionCount = match.predictions.filter(
              (matchPrediction) =>
                matchPrediction.homeScore === result.homeScore &&
                matchPrediction.awayScore === result.awayScore,
            ).length;

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
            id: prediction.id ?? prediction.user.id,
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
    }));
}

function getOrderedFinishedMatches(matches: LeaderboardMatch[]) {
  return [...matches]
    .filter((match) => match.status === "FINISHED")
    .sort((a, b) => {
      const kickoffDiff = (a.kickoffAt?.getTime() ?? 0) - (b.kickoffAt?.getTime() ?? 0);

      if (kickoffDiff !== 0) {
        return kickoffDiff;
      }

      return a.id.localeCompare(b.id, "fr");
    });
}

function formatAverageValue(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function getLongestMatchingStreak(values: boolean[]) {
  let best = 0;
  let current = 0;

  for (const value of values) {
    if (value) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  return best;
}

function getLongestPointsStreak(values: Array<number | null>, targetPoints: number) {
  let best = 0;
  let current = 0;

  for (const value of values) {
    if (value === targetPoints) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  return best;
}

function buildLeaderboardTournamentStat(
  key: string,
  title: string,
  tooltip: string | null,
  candidates: Array<{
    userId: string;
    name: string;
    score: number;
  }>,
  formatter: (score: number) => string,
): LeaderboardTournamentStat {
  const bestScore = Math.max(...candidates.map((candidate) => candidate.score));
  const leaders = candidates
    .filter((candidate) => candidate.score === bestScore)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .map((candidate) => ({
      userId: candidate.userId,
      name: candidate.name,
    }));

  return {
    key,
    title,
    tooltip,
    value: formatter(bestScore),
    leaders,
  };
}

function buildParticipationPerfectStat(
  snapshot: LeaderboardSnapshot,
  availableMatchCount: number,
): LeaderboardTournamentStat {
  const leaders = snapshot.rows
    .filter((row) => row.predictedMatches === availableMatchCount)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .map((row) => ({
      userId: row.userId,
      name: row.name,
    }));

  return {
    key: "perfect-participation",
    title: "Participation parfaite",
    tooltip: "Joueurs ayant pronostiqué tous les matchs déjà comptés dans le classement officiel.",
    value: leaders.length > 0
      ? `${availableMatchCount} match${availableMatchCount > 1 ? "s" : ""}`
      : "Aucune",
    leaders,
  };
}

function buildLeaderboardTournamentStats(
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
  officialSnapshot: LeaderboardSnapshot,
  bonusPointsByUser: Map<string, number>,
): LeaderboardTournamentStat[] {
  const finishedMatches = getOrderedFinishedMatches(competition.matches);
  const progressSnapshots = buildLeaderboardProgressSnapshots(
    {
      ...competition,
      matches: finishedMatches,
    },
    bonusPointsByUser,
    finishedMatches,
    false,
  );
  const players = competition.players.map((player) => ({
    userId: player.user.id,
    name: getUserDisplayName(player.user),
  }));
  const perUserPoints = new Map<string, Array<number | null>>(
    players.map((player) => [player.userId, []]),
  );

  for (const match of finishedMatches) {
    const result = getMatchResultForPoints(match);

    if (result === null) {
      continue;
    }

    const exactScorePredictionCount = match.predictions.filter(
      (prediction) =>
        prediction.homeScore === result.homeScore &&
        prediction.awayScore === result.awayScore,
    ).length;
    const predictionByUserId = new Map(
      match.predictions.map((prediction) => [prediction.userId, prediction] as const),
    );

    for (const player of players) {
      const prediction = predictionByUserId.get(player.userId);

      if (!prediction) {
        perUserPoints.get(player.userId)?.push(null);
        continue;
      }

      perUserPoints.get(player.userId)?.push(
        computePredictionPoints({
          prediction: {
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
          },
          result,
          exactScorePredictionCount,
        }),
      );
    }
  }

  const rowByUserId = new Map(officialSnapshot.rows.map((row) => [row.userId, row] as const));
  const sectionRowsByUserId = new Map<
    string,
    Array<{
      rank: number;
      points: number;
      predictedMatches: number;
      exactUnique: number;
      exactShared: number;
      correctOutcome: number;
      missed: number;
      maxRank: number;
    }>
  >(
    players.map((player) => [player.userId, []]),
  );

  for (const { snapshot } of progressSnapshots) {
    const maxRank = snapshot.rows[snapshot.rows.length - 1]?.rank ?? 0;

    for (const player of players) {
      const row = snapshot.rows.find((item) => item.userId === player.userId);

      if (!row) {
        continue;
      }

      sectionRowsByUserId.get(player.userId)?.push({
        rank: row.rank,
        points: row.points,
        predictedMatches: row.predictedMatches,
        exactUnique: row.exactUnique,
        exactShared: row.exactShared,
        correctOutcome: row.correctOutcome,
        missed: row.missed,
        maxRank,
      });
    }
  }

  const stats: LeaderboardTournamentStat[] = [];

  stats.push(
    buildLeaderboardTournamentStat(
      "longest-podium",
      "Plus long podium",
      null,
      players.map((player) => ({
        userId: player.userId,
        name: player.name,
        score: getLongestMatchingStreak(
          (sectionRowsByUserId.get(player.userId) ?? []).map((row) => row.rank === 1),
        ),
      })),
      (score) => `${score} journée${score > 1 ? "s" : ""}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "longest-slump",
      "Plus longue galère",
      "Plus longue série consécutive terminée à la dernière place à la fin d'une journée.",
      players.map((player) => ({
        userId: player.userId,
        name: player.name,
        score: getLongestMatchingStreak(
          (sectionRowsByUserId.get(player.userId) ?? []).map(
            (row) => row.maxRank > 0 && row.rank === row.maxRank,
          ),
        ),
      })),
      (score) => `${score} journée${score > 1 ? "s" : ""}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "best-unique-exact-total",
      "Meilleur score exact unique",
      null,
      players.map((player) => ({
        userId: player.userId,
        name: player.name,
        score: rowByUserId.get(player.userId)?.exactUnique ?? 0,
      })),
      (score) => `${score}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "best-exact-total",
      "Meilleur score exact",
      null,
      players.map((player) => ({
        userId: player.userId,
        name: player.name,
        score: rowByUserId.get(player.userId)?.exactShared ?? 0,
      })),
      (score) => `${score}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "best-outcome-total",
      "Meilleur résultat",
      "Plus grand nombre de pronos à 1 point.",
      players.map((player) => ({
        userId: player.userId,
        name: player.name,
        score: rowByUserId.get(player.userId)?.correctOutcome ?? 0,
      })),
      (score) => `${score}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "most-missed-total",
      "Plus de ratés",
      "Plus grand nombre de pronos à 0 point.",
      players.map((player) => ({
        userId: player.userId,
        name: player.name,
        score: rowByUserId.get(player.userId)?.missed ?? 0,
      })),
      (score) => `${score}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "best-unique-exact-streak",
      "Meilleure série score exact unique",
      "Plus longue série de matchs consécutifs terminés à 4 points.",
      players.map((player) => ({
        userId: player.userId,
        name: player.name,
        score: getLongestPointsStreak(perUserPoints.get(player.userId) ?? [], 4),
      })),
      (score) => `${score} match${score > 1 ? "s" : ""}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "best-exact-streak",
      "Meilleure série score exact",
      "Plus longue série de matchs consécutifs terminés à 3 points.",
      players.map((player) => ({
        userId: player.userId,
        name: player.name,
        score: getLongestPointsStreak(perUserPoints.get(player.userId) ?? [], 3),
      })),
      (score) => `${score} match${score > 1 ? "s" : ""}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "best-outcome-streak",
      "Meilleure série bon résultat",
      "Plus longue série de matchs consécutifs terminés à 1 point.",
      players.map((player) => ({
        userId: player.userId,
        name: player.name,
        score: getLongestPointsStreak(perUserPoints.get(player.userId) ?? [], 1),
      })),
      (score) => `${score} match${score > 1 ? "s" : ""}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "worst-missed-streak",
      "Pire série ratés",
      "Plus longue série de matchs consécutifs terminés à 0 point.",
      players.map((player) => ({
        userId: player.userId,
        name: player.name,
        score: getLongestPointsStreak(perUserPoints.get(player.userId) ?? [], 0),
      })),
      (score) => `${score} match${score > 1 ? "s" : ""}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "biggest-climb",
      "Plus forte remontée",
      "Meilleur gain de places entre deux journées du classement.",
      players.map((player) => {
        const rows = sectionRowsByUserId.get(player.userId) ?? [];
        let best = 0;

        for (let index = 1; index < rows.length; index += 1) {
          best = Math.max(best, rows[index - 1].rank - rows[index].rank);
        }

        return {
          userId: player.userId,
          name: player.name,
          score: best,
        };
      }),
      (score) => `${score} place${score > 1 ? "s" : ""}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "biggest-drop",
      "Plus grosse chute",
      "Plus forte perte de places entre deux journées du classement.",
      players.map((player) => {
        const rows = sectionRowsByUserId.get(player.userId) ?? [];
        let worst = 0;

        for (let index = 1; index < rows.length; index += 1) {
          worst = Math.max(worst, rows[index].rank - rows[index - 1].rank);
        }

        return {
          userId: player.userId,
          name: player.name,
          score: worst,
        };
      }),
      (score) => `${score} place${score > 1 ? "s" : ""}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "most-frequent-leader",
      "Leader le plus fréquent",
      "Joueur ayant fini le plus de journées à la première place.",
      players.map((player) => ({
        userId: player.userId,
        name: player.name,
        score: (sectionRowsByUserId.get(player.userId) ?? []).filter((row) => row.rank === 1).length,
      })),
      (score) => `${score} journée${score > 1 ? "s" : ""}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "most-frequent-last",
      "Dernier le plus fréquent",
      "Joueur ayant fini le plus de journées à la dernière place.",
      players.map((player) => ({
        userId: player.userId,
        name: player.name,
        score: (sectionRowsByUserId.get(player.userId) ?? []).filter(
          (row) => row.maxRank > 0 && row.rank === row.maxRank,
        ).length,
      })),
      (score) => `${score} journée${score > 1 ? "s" : ""}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "best-finish",
      "Meilleur finish",
      "Joueur ayant marqué le plus de points sur les 3 dernières journées du classement.",
      players.map((player) => {
        const rows = sectionRowsByUserId.get(player.userId) ?? [];

        if (rows.length === 0) {
          return {
            userId: player.userId,
            name: player.name,
            score: 0,
          };
        }

        const lastIndex = rows.length - 1;
        const baselineIndex = rows.length - 4;
        const baselinePoints = baselineIndex >= 0 ? rows[baselineIndex].points : 0;

        return {
          userId: player.userId,
          name: player.name,
          score: rows[lastIndex].points - baselinePoints,
        };
      }),
      (score) => `${score} pt${score > 1 ? "s" : ""}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "perfect-day",
      "Journée parfaite",
      "Plus grand nombre de journées sans aucun raté parmi les matchs pronostiqués ce jour-là.",
      players.map((player) => {
        const rows = sectionRowsByUserId.get(player.userId) ?? [];
        let count = 0;

        for (let index = 0; index < rows.length; index += 1) {
          const previous = rows[index - 1];
          const predictedDelta = rows[index].predictedMatches - (previous?.predictedMatches ?? 0);
          const missedDelta = rows[index].missed - (previous?.missed ?? 0);

          if (predictedDelta > 0 && missedDelta === 0) {
            count += 1;
          }
        }

        return {
          userId: player.userId,
          name: player.name,
          score: count,
        };
      }),
      (score) => `${score} journée${score > 1 ? "s" : ""}`,
    ),
  );
  stats.push(
    buildLeaderboardTournamentStat(
      "regularity",
      "Régularité",
      "Meilleure moyenne de points par journée jouée.",
      players.map((player) => {
        const rows = sectionRowsByUserId.get(player.userId) ?? [];
        let playedSections = 0;

        for (let index = 0; index < rows.length; index += 1) {
          const previous = rows[index - 1];
          const predictedDelta = rows[index].predictedMatches - (previous?.predictedMatches ?? 0);

          if (predictedDelta > 0) {
            playedSections += 1;
          }
        }

        const totalPoints = rowByUserId.get(player.userId)?.points ?? 0;

        return {
          userId: player.userId,
          name: player.name,
          score: playedSections > 0 ? totalPoints / playedSections : 0,
        };
      }),
      (score) => `${formatAverageValue(score)} pt/j`,
    ),
  );
  stats.push(buildParticipationPerfectStat(officialSnapshot, officialSnapshot.matchCount));

  return stats;
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
          regularHomeScore: true,
          regularAwayScore: true,
          extraTimeHomeScore: true,
          extraTimeAwayScore: true,
          penaltyHomeScore: true,
          penaltyAwayScore: true,
          homeTeamId: true,
          awayTeamId: true,
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

  const bonusResult = resolveBonusResult(
    competition.bonusEnabled,
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
    competition.matches,
  );
  const bonusPointsByUser = buildBonusPointsByUser(
    competition.bonusPredictions,
    bonusResult,
    competition.bonusEnabled,
  );
  const bonusResultKnown = competition.bonusEnabled && bonusResult !== null;

  const officialMatches = competition.matches.filter(
    (match) => match.status === "FINISHED",
  );
  const liveMatches = competition.matches.filter(
    (match) => match.status === "FINISHED" || match.status === "LIVE",
  );
  const officialSnapshot = buildLeaderboardSnapshot(
    competition.players,
    officialMatches,
    bonusPointsByUser,
  );
  const liveSnapshot = buildLeaderboardSnapshot(
    competition.players,
    liveMatches,
    bonusPointsByUser,
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
      regularHomeScore: match.regularHomeScore,
      regularAwayScore: match.regularAwayScore,
      extraTimeHomeScore: match.extraTimeHomeScore,
      extraTimeAwayScore: match.extraTimeAwayScore,
      penaltyHomeScore: match.penaltyHomeScore,
      penaltyAwayScore: match.penaltyAwayScore,
      homePlaceholder: match.homePlaceholder,
      awayPlaceholder: match.awayPlaceholder,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      predictions: match.predictions
        .map((prediction) => {
          let points: number | null = null;

          if (match.status === "FINISHED" || match.status === "LIVE") {
            const result = getMatchResultForPoints(match);

            if (result !== null) {
              const exactScorePredictionCount = match.predictions.filter(
                (matchPrediction) =>
                  matchPrediction.homeScore === result.homeScore &&
                  matchPrediction.awayScore === result.awayScore,
              ).length;

              points = computePredictionPoints({
                prediction: {
                  homeScore: prediction.homeScore,
                  awayScore: prediction.awayScore,
                },
                result,
                exactScorePredictionCount,
              });
            }
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
    }));

  return {
    id: competition.id,
    name: competition.name,
    slug: competition.slug,
    kind: competition.kind,
    emblemUrl: competition.emblemUrl,
    bonusEnabled: competition.bonusEnabled,
    bonusResultKnown,
    participantCount: competition.players.length,
    official: officialSnapshot,
    live: liveSnapshot,
    liveMatches: liveMatchCards,
    tournamentStats: buildLeaderboardTournamentStats(
      competition,
      officialSnapshot,
      bonusPointsByUser,
    ),
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
          homeTeamId: true,
          awayTeamId: true,
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

  const bonusResult = resolveBonusResult(
    competition.bonusEnabled,
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
    competition.matches,
  );
  const bonusPointsByUser = buildBonusPointsByUser(
    competition.bonusPredictions,
    bonusResult,
    competition.bonusEnabled,
  );

  return buildLeaderboardProgressData(competition, bonusPointsByUser);
}

export async function getLeaderboardProgressBundle(
  slug: string,
): Promise<LeaderboardProgressBundle | null> {
  const [competition, leaderboard] = await Promise.all([
    prisma.competition.findUnique({
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
          orderBy: [{ kickoffAt: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            kickoffAt: true,
            matchday: true,
            stage: true,
            status: true,
            homeTeamId: true,
            awayTeamId: true,
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
    }),
    getLeaderboardData(slug),
  ]);

  if (!competition || !leaderboard) {
    return null;
  }

  const bonusResult = resolveBonusResult(
    competition.bonusEnabled,
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
    competition.matches,
  );
  const bonusPointsByUser = buildBonusPointsByUser(
    competition.bonusPredictions,
    bonusResult,
    competition.bonusEnabled,
  );

  return {
    official: buildLeaderboardProgressData(competition, bonusPointsByUser),
    live: buildLeaderboardProgressDataLive(competition, bonusPointsByUser),
    liveMatches: leaderboard.liveMatches,
  };
}
