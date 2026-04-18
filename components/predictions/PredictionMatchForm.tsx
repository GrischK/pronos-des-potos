"use client";

import { useActionState } from "react";

import {
  savePredictionAction,
  type PredictionActionState,
} from "@/src/server/prediction-actions";
import type { PredictionMatch } from "@/src/server/predictions";

type PredictionMatchFormProps = {
  match: PredictionMatch;
  slug: string;
};

const initialState: PredictionActionState = {};

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

function getLockReason(match: PredictionMatch) {
  if (match.canPredict) {
    return null;
  }

  if (!match.homeTeam || !match.awayTeam) {
    return "Équipes à déterminer";
  }

  if (match.status !== "SCHEDULED") {
    return "Match verrouillé";
  }

  if (new Date(match.kickoffAt).getTime() <= Date.now()) {
    return "Coup d'envoi passé";
  }

  return "Compétition fermée";
}

function getTeamName(match: PredictionMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;

  return team?.name ?? placeholder ?? "À déterminer";
}

function getTeamFlag(match: PredictionMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;

  return team?.flagUrl ?? null;
}

export function PredictionMatchForm({ match, slug }: PredictionMatchFormProps) {
  const [state, formAction, pending] = useActionState(
    savePredictionAction,
    initialState,
  );
  const lockReason = getLockReason(match);

  return (
    <form action={formAction} className="prediction-row">
      <input name="matchId" type="hidden" value={match.id} />
      <input name="slug" type="hidden" value={slug} />

      <div className="match-meta">
        <span>{formatKickoffAt(match.kickoffAt)}</span>
        <span>{match.stage}</span>
        {lockReason ? <span>{lockReason}</span> : null}
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

        <div className="prediction-inputs">
          <input
            aria-label={`Score ${getTeamName(match, "home")}`}
            defaultValue={match.prediction?.homeScore ?? ""}
            disabled={!match.canPredict || pending}
            inputMode="numeric"
            max="99"
            min="0"
            name="homeScore"
            required
            type="number"
          />
          <span>·</span>
          <input
            aria-label={`Score ${getTeamName(match, "away")}`}
            defaultValue={match.prediction?.awayScore ?? ""}
            disabled={!match.canPredict || pending}
            inputMode="numeric"
            max="99"
            min="0"
            name="awayScore"
            required
            type="number"
          />
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

      <div className="prediction-actions">
        <button
          className="btn btn-secondary"
          disabled={!match.canPredict || pending}
          type="submit"
        >
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
        {state.error ? <span className="form-error">{state.error}</span> : null}
        {state.success ? (
          <span className="form-success">{state.success}</span>
        ) : null}
      </div>
    </form>
  );
}
