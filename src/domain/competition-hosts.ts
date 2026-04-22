type CompetitionHostLookup = {
  kind: string;
  externalProvider: string | null;
  externalCompetitionId: string | null;
  externalSeason: string | null;
};

export type CompetitionHostCountry = {
  name: string;
  flagUrl: string;
};

const knownCompetitionHosts: Record<string, CompetitionHostCountry[]> = {
  "FOOTBALL_DATA:WC:2026": [
    { name: "Canada", flagUrl: "https://flagcdn.com/ca.svg" },
    { name: "Mexique", flagUrl: "https://flagcdn.com/mx.svg" },
    { name: "États-Unis", flagUrl: "https://flagcdn.com/us.svg" },
  ],
  "FOOTBALL_DATA:EC:2024": [
    { name: "Allemagne", flagUrl: "https://flagcdn.com/de.svg" },
  ],
  "FOOTBALL_DATA:CL:2024": [
    { name: "Allemagne", flagUrl: "https://flagcdn.com/de.svg" },
  ],
  "FOOTBALL_DATA:CL:2025": [
    { name: "Hongrie", flagUrl: "https://flagcdn.com/hu.svg" },
  ],
};

function getCompetitionHostKey(competition: CompetitionHostLookup) {
  if (
    !competition.externalProvider ||
    !competition.externalCompetitionId ||
    !competition.externalSeason
  ) {
    return null;
  }

  return [
    competition.externalProvider,
    competition.externalCompetitionId,
    competition.externalSeason,
  ].join(":");
}

export function getCompetitionHostCountries(
  competition: CompetitionHostLookup,
) {
  const key = getCompetitionHostKey(competition);

  if (!key) {
    return [];
  }

  return knownCompetitionHosts[key] ?? [];
}

export function getCompetitionHostLabel(
  competition: CompetitionHostLookup,
  countries: CompetitionHostCountry[],
) {
  if (competition.kind === "CHAMPIONS_LEAGUE") {
    return "Finale";
  }

  return countries.length > 1 ? "Pays hôtes" : "Pays hôte";
}
