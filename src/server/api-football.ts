import "server-only";

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

type ApiFootballResponse<T> = {
  errors?: unknown[] | Record<string, string>;
  response: T;
};

export type ApiFootballTeam = {
  team: {
    id: number;
    name: string;
    code: string | null;
    logo: string | null;
  };
};

export type ApiFootballFixture = {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
    };
  };
  league: {
    round: string | null;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string | null;
    };
    away: {
      id: number;
      name: string;
      logo: string | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
};

function getApiFootballKey() {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY is required to import football data.");
  }

  return apiKey;
}

function formatApiErrors(errors: ApiFootballResponse<unknown>["errors"]) {
  if (!errors) {
    return null;
  }

  if (Array.isArray(errors)) {
    return errors.length > 0 ? errors.join(", ") : null;
  }

  const messages = Object.values(errors);
  return messages.length > 0 ? messages.join(", ") : null;
}

async function apiFootballGet<T>(path: string, params: Record<string, string | number>) {
  const url = new URL(`${API_FOOTBALL_BASE_URL}${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": getApiFootballKey(),
    },
    next: {
      revalidate: 3600,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football a répondu ${response.status}.`);
  }

  const payload = (await response.json()) as ApiFootballResponse<T>;
  const apiErrors = formatApiErrors(payload.errors);

  if (apiErrors) {
    throw new Error(apiErrors);
  }

  return payload.response;
}

export function getApiFootballTeams(leagueId: number, season: number) {
  return apiFootballGet<ApiFootballTeam[]>("/teams", {
    league: leagueId,
    season,
  });
}

export function getApiFootballFixtures(leagueId: number, season: number) {
  return apiFootballGet<ApiFootballFixture[]>("/fixtures", {
    league: leagueId,
    season,
  });
}
