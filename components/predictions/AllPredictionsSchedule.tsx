"use client";

import { PredictionScheduleBrowser } from "@/components/predictions/PredictionSchedule";
import type { PublicPredictionMatch } from "@/src/server/all-predictions";

type AllPredictionsScheduleProps = {
  matches: PublicPredictionMatch[];
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

function formatKickoffAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date à confirmer";
  }

  return dateFormatter.format(date);
}

function getTeamName(match: PublicPredictionMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;

  return team?.name ?? placeholder ?? "À déterminer";
}

function getTeamFlag(match: PublicPredictionMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;

  return team?.flagUrl ?? null;
}

function renderScore(homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) {
    return "- · -";
  }

  return `${homeScore} · ${awayScore}`;
}

function getResultLabel(status: string) {
  if (status === "LIVE") {
    return "Score live";
  }

  return "Score final";
}

function AllPredictionsMatchCard({ match }: { match: PublicPredictionMatch }) {
  const hasResult = match.homeScore !== null && match.awayScore !== null;

  return (
    <article className="prediction-row">
      <div className="match-meta">
        <span>{formatKickoffAt(match.kickoffAt)}</span>
        <span>{match.stage}</span>
        <span>{match.status}</span>
      </div>

      <div className="prediction-grid">
        <span className="match-team">
          {getTeamFlag(match, "home") ? (
            <img
              alt=""
              className="team-flag"
              loading="lazy"
              src={getTeamFlag(match, "home") ?? undefined}
            />
          ) : null}
          <span>{getTeamName(match, "home")}</span>
        </span>

        <div className="prediction-score-block">
          <span className="match-score">
            {renderScore(match.homeScore, match.awayScore)}
          </span>
          {hasResult ? (
            <p className="prediction-result">
              {getResultLabel(match.status)}
            </p>
          ) : null}
        </div>

        <span className="match-team match-team-away">
          <span>{getTeamName(match, "away")}</span>
          {getTeamFlag(match, "away") ? (
            <img
              alt=""
              className="team-flag"
              loading="lazy"
              src={getTeamFlag(match, "away") ?? undefined}
            />
          ) : null}
        </span>
      </div>

      {match.canRevealPredictions ? (
        <div className="public-predictions">
          {match.predictions.length === 0 ? (
            <p>Aucun prono enregistré pour ce match.</p>
          ) : (
            match.predictions.map((prediction) => (
              <div className="public-prediction-row" key={prediction.id}>
                <strong>{prediction.user.name}</strong>
                <span>
                  {prediction.homeScore} · {prediction.awayScore}
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
        <p className="readonly-notice">
          Les pronos seront visibles après le coup d'envoi.
        </p>
      )}
    </article>
  );
}

export function AllPredictionsSchedule({ matches }: AllPredictionsScheduleProps) {
  return (
    <PredictionScheduleBrowser
      groupHeading="Les pronos"
      matches={matches}
      phaseHeading="Les pronos"
      renderMatch={(match) => (
        <AllPredictionsMatchCard key={match.id} match={match} />
      )}
    />
  );
}
