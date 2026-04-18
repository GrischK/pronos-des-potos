import { unstable_cache } from "next/cache";

const WORLD_CUP_2026_GROUPS = [
  {
    name: "Groupe A",
    teams: ["Mexico", "South Africa", "South Korea", "Czech Republic"],
  },
  {
    name: "Groupe B",
    teams: ["Canada", "Qatar", "Switzerland", "Bosnia-Herzegovina"],
  },
  {
    name: "Groupe C",
    teams: ["Brazil", "Morocco", "Haiti", "Scotland"],
  },
  {
    name: "Groupe D",
    teams: ["USA", "Paraguay", "Australia", "Turkey"],
  },
  {
    name: "Groupe E",
    teams: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  },
  {
    name: "Groupe F",
    teams: ["Netherlands", "Japan", "Tunisia", "Sweden"],
  },
  {
    name: "Groupe G",
    teams: ["Belgium", "Egypt", "Iran", "New Zealand"],
  },
  {
    name: "Groupe H",
    teams: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  },
  {
    name: "Groupe I",
    teams: ["France", "Senegal", "Norway", "Iraq"],
  },
  {
    name: "Groupe J",
    teams: ["Argentina", "Algeria", "Austria", "Jordan"],
  },
  {
    name: "Groupe K",
    teams: ["Portugal", "Uzbekistan", "Colombia", "DR Congo"],
  },
  {
    name: "Groupe L",
    teams: ["England", "Croatia", "Ghana", "Panama"],
  },
] as const;

const WORLD_CUP_2026_TEAM_ALIASES: Record<string, string> = {
  "Cape Verde Islands": "Cape Verde",
  "Congo DR": "DR Congo",
  Czechia: "Czech Republic",
  "United States": "USA",
};

type TeamInfo = {
  name: string;
  shortName: string | null;
  code: string | null;
  flagUrl: string | null;
};

type CompetitionMatch = {
  id: string;
  externalMatchId: string | null;
  kickoffAt: Date;
  stage: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
};

export type CompetitionGroup = {
  name: string;
  standings: {
    team: TeamInfo;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
  }[];
  matches: {
    id: string;
    externalMatchId: string | null;
    kickoffAt: string;
    stage: string;
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    homeTeam: TeamInfo;
    awayTeam: TeamInfo;
  }[];
};

function getTeamKey(name: string) {
  return (WORLD_CUP_2026_TEAM_ALIASES[name] ?? name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function buildWorldCup2026Groups(matches: CompetitionMatch[]): CompetitionGroup[] {
  const teamsByName = new Map<string, TeamInfo>();

  for (const match of matches) {
    teamsByName.set(getTeamKey(match.homeTeam.name), match.homeTeam);
    teamsByName.set(getTeamKey(match.awayTeam.name), match.awayTeam);
  }

  return WORLD_CUP_2026_GROUPS.map((group) => {
    const teamNames = new Set(group.teams.map(getTeamKey));
    const groupMatches = matches.filter(
      (match) =>
        teamNames.has(getTeamKey(match.homeTeam.name)) &&
        teamNames.has(getTeamKey(match.awayTeam.name)),
    );
    const standingRows = group.teams.map((teamName, index) => ({
      team:
        teamsByName.get(getTeamKey(teamName)) ?? {
          name: teamName,
          shortName: null,
          code: null,
          flagUrl: null,
        },
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      index,
    }));
    const standingsByName = new Map(
      standingRows.map((row) => [getTeamKey(row.team.name), row]),
    );

    for (const match of groupMatches) {
      if (
        match.status !== "FINISHED" ||
        match.homeScore === null ||
        match.awayScore === null
      ) {
        continue;
      }

      const homeRow = standingsByName.get(getTeamKey(match.homeTeam.name));
      const awayRow = standingsByName.get(getTeamKey(match.awayTeam.name));

      if (!homeRow || !awayRow) {
        continue;
      }

      homeRow.played += 1;
      awayRow.played += 1;
      homeRow.goalsFor += match.homeScore;
      homeRow.goalsAgainst += match.awayScore;
      awayRow.goalsFor += match.awayScore;
      awayRow.goalsAgainst += match.homeScore;

      if (match.homeScore > match.awayScore) {
        homeRow.won += 1;
        homeRow.points += 3;
        awayRow.lost += 1;
      } else if (match.homeScore < match.awayScore) {
        awayRow.won += 1;
        awayRow.points += 3;
        homeRow.lost += 1;
      } else {
        homeRow.drawn += 1;
        awayRow.drawn += 1;
        homeRow.points += 1;
        awayRow.points += 1;
      }
    }

    return {
      name: group.name,
      standings: standingRows
        .map((row) => ({
          ...row,
          goalDifference: row.goalsFor - row.goalsAgainst,
        }))
        .sort(
          (a, b) =>
            b.points - a.points ||
            b.goalDifference - a.goalDifference ||
            b.goalsFor - a.goalsFor ||
            a.index - b.index,
        )
        .map(({ index: _index, ...row }) => row),
      matches: groupMatches.map((match) => ({
        ...match,
        kickoffAt: match.kickoffAt.toISOString(),
      })),
    };
  });
}

function isWorldCup2026Competition(competition: {
  externalProvider: string | null;
  externalCompetitionId: string | null;
  externalSeason: string | null;
}) {
  if (competition.externalSeason !== "2026") {
    return false;
  }

  return (
    (competition.externalProvider === "FOOTBALL_DATA" &&
      competition.externalCompetitionId === "WC")
  );
}

export async function getCompetitionsOverview() {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  const { prisma } = await import("@/src/db/prisma");

  return prisma.competition.findMany({
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      _count: {
        select: {
          matches: true,
          players: true,
        },
      },
    },
  }).then((competitions) =>
    competitions.map((competition) => ({
      id: competition.id,
      name: competition.name,
      slug: competition.slug,
      status: competition.status,
      matchCount: competition._count.matches,
      playerCount: competition._count.players,
    })),
  );
}

export async function getCompetitionBySlug(slug: string) {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const { prisma } = await import("@/src/db/prisma");

  return prisma.competition.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      externalProvider: true,
      externalCompetitionId: true,
      externalSeason: true,
      startsAt: true,
      endsAt: true,
      matches: {
        orderBy: [{ kickoffAt: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          externalMatchId: true,
          kickoffAt: true,
          stage: true,
          status: true,
          homeScore: true,
          awayScore: true,
          homeTeam: {
            select: {
              name: true,
              shortName: true,
              code: true,
              flagUrl: true,
            },
          },
          awayTeam: {
            select: {
              name: true,
              shortName: true,
              code: true,
              flagUrl: true,
            },
          },
        },
      },
    },
  }).then((competition) => {
    if (!competition) {
      return null;
    }

    return {
      ...competition,
      matchCount: competition.matches.length,
      groups: isWorldCup2026Competition(competition)
        ? buildWorldCup2026Groups(competition.matches)
        : [],
    };
  });
}
