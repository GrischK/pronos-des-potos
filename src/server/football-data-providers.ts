import "server-only";

import type { ExternalDataProvider, MatchStatus } from "@prisma/client";

type ImportedTeam = {
  externalId: string;
  name: string;
  shortName?: string | null;
  code?: string | null;
  logoUrl?: string | null;
};

export type ImportedMatch = {
  externalId: string;
  homeTeam: ImportedTeam;
  awayTeam: ImportedTeam;
  kickoffAt: Date;
  stage: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
};

export type ImportedCompetitionData = {
  teams: ImportedTeam[];
  matches: ImportedMatch[];
};

type FootballDataTeam = {
  id: number | null;
  name: string | null;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
};

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  matchday?: number | null;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score: {
    fullTime: {
      home: number | null;
      away: number | null;
    };
  };
};

function compactTeams(teams: ImportedTeam[]) {
  return Array.from(
    new Map(teams.map((team) => [team.externalId, team])).values(),
  );
}

function mapFootballDataStatus(status: string): MatchStatus {
  if (["FINISHED", "AWARDED"].includes(status)) {
    return "FINISHED";
  }

  if (["IN_PLAY", "PAUSED"].includes(status)) {
    return "LIVE";
  }

  if (["CANCELLED", "POSTPONED", "SUSPENDED"].includes(status)) {
    return "CANCELLED";
  }

  return "SCHEDULED";
}

async function footballDataGet<T>(path: string, params: Record<string, string>) {
  const apiKey = process.env.FOOTBALL_DATA_TOKEN;

  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_TOKEN est requis pour utiliser football-data.org.");
  }

  const url = new URL(`https://api.football-data.org/v4/${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": apiKey,
    },
    next: {
      revalidate: 3600,
    },
  });

  if (!response.ok) {
    throw new Error(`football-data.org a répondu ${response.status}.`);
  }

  return (await response.json()) as T;
}

function footballDataTeam(team: FootballDataTeam): ImportedTeam | null {
  if (!team.name) {
    return null;
  }

  return {
    externalId: String(team.id ?? team.name),
    name: team.name,
    shortName: team.shortName,
    code: team.tla,
    logoUrl: team.crest,
  };
}

async function importFromFootballData(
  competitionCode: string,
  season: string,
): Promise<ImportedCompetitionData> {
  const payload = await footballDataGet<{ matches: FootballDataMatch[] }>(
    `competitions/${competitionCode}/matches`,
    {
      season,
    },
  );

  const matches = payload.matches.flatMap((match) => {
    const homeTeam = footballDataTeam(match.homeTeam);
    const awayTeam = footballDataTeam(match.awayTeam);

    if (!homeTeam || !awayTeam) {
      return [];
    }

    return [{
      externalId: String(match.id),
      homeTeam,
      awayTeam,
      kickoffAt: new Date(match.utcDate),
      stage: match.stage || (match.matchday ? `Journée ${match.matchday}` : "Phase à confirmer"),
      status: mapFootballDataStatus(match.status),
      homeScore: match.score.fullTime.home,
      awayScore: match.score.fullTime.away,
    }];
  });

  return {
    teams: compactTeams(matches.flatMap((match) => [match.homeTeam, match.awayTeam])),
    matches,
  };
}

export function importExternalCompetitionData(
  provider: ExternalDataProvider,
  competitionId: string,
  season: string,
) {
  if (provider !== "FOOTBALL_DATA") {
    throw new Error("football-data.org est la seule source de données supportée.");
  }

  return importFromFootballData(competitionId, season);
}
