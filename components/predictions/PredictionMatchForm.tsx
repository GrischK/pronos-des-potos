"use client";

import { useActionState, useEffect, useState } from "react";

import {
  savePredictionAction,
  type PredictionActionState,
} from "@/src/server/prediction-actions";
import { getCompetitionStageLabel } from "@/src/domain/competition-stage";
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

function getResultLabel(status: string) {
  if (status === "LIVE") {
    return "Score live";
  }

  return "Score final";
}

function getPredictionValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

export function PredictionMatchForm({ match, slug }: PredictionMatchFormProps) {
  const [state, formAction, pending] = useActionState(
    savePredictionAction,
    initialState,
  );
  const initialHomeScore = getPredictionValue(match.prediction?.homeScore);
  const initialAwayScore = getPredictionValue(match.prediction?.awayScore);
  const [homeScore, setHomeScore] = useState(initialHomeScore);
  const [awayScore, setAwayScore] = useState(initialAwayScore);
  const [savedHomeScore, setSavedHomeScore] = useState(initialHomeScore);
  const [savedAwayScore, setSavedAwayScore] = useState(initialAwayScore);
  const [hasSavedState, setHasSavedState] = useState(
    initialHomeScore !== "" && initialAwayScore !== "",
  );

  useEffect(() => {
    setHomeScore(initialHomeScore);
    setAwayScore(initialAwayScore);
    setSavedHomeScore(initialHomeScore);
    setSavedAwayScore(initialAwayScore);
    setHasSavedState(initialHomeScore !== "" && initialAwayScore !== "");
  }, [initialAwayScore, initialHomeScore, match.id]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setSavedHomeScore(homeScore);
    setSavedAwayScore(awayScore);
    setHasSavedState(true);
  }, [awayScore, homeScore, state.success]);

  const lockReason = getLockReason(match);
  const hasResult = match.homeScore !== null && match.awayScore !== null;
  const showReadonlyEmptyState = !match.canPredict && !match.prediction;
  const isDirty = homeScore !== savedHomeScore || awayScore !== savedAwayScore;
  const hasCompleteScore = homeScore !== "" && awayScore !== "";
  const showSavedState = hasSavedState && !isDirty;

  return (
    <form action={formAction} className="prediction-row">
      <input name="matchId" type="hidden" value={match.id} />
      <input name="slug" type="hidden" value={slug} />

      <div className="match-meta">
        <span>{formatKickoffAt(match.kickoffAt)}</span>
        <span>{getCompetitionStageLabel(match.stage)}</span>
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

        <div className="prediction-score-block">
          {showReadonlyEmptyState ? (
            <p className="prediction-empty">Aucun prono enregistré pour ce match.</p>
          ) : (
            <div className="prediction-inputs">
              <input
                aria-label={`Score ${getTeamName(match, "home")}`}
                onChange={(event) => setHomeScore(event.target.value)}
                disabled={!match.canPredict || pending}
                inputMode="numeric"
                max="99"
                min="0"
                name="homeScore"
                required
                type="number"
                value={homeScore}
              />
              <span>·</span>
              <input
                aria-label={`Score ${getTeamName(match, "away")}`}
                onChange={(event) => setAwayScore(event.target.value)}
                disabled={!match.canPredict || pending}
                inputMode="numeric"
                max="99"
                min="0"
                name="awayScore"
                required
                type="number"
                value={awayScore}
              />
            </div>
          )}

          {hasResult ? (
            <p className="prediction-result">
              {getResultLabel(match.status)} : {match.homeScore} ·{" "}
              {match.awayScore}
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

      {showReadonlyEmptyState ? null : (
        <div className="prediction-actions">
          <button
            aria-label={showSavedState ? "Prono enregistré" : "Enregistrer le prono"}
            className={`btn ${showSavedState ? "btn-saved" : "btn-secondary"}`}
            disabled={!match.canPredict || pending || !hasCompleteScore || !isDirty}
            type="submit"
          >
            {pending ? (
              "Enregistrement..."
            ) : showSavedState ? (
              <>
                <span aria-hidden="true" className="btn-check-icon">
                  <svg fill="none" height="14" viewBox="0 0 14 14" width="14">
                    <path
                      d="M3 7.5 5.5 10 11 4.5"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </span>
                Enregistré
              </>
            ) : (
              "Enregistrer"
            )}
          </button>
          {state.error ? <span className="form-error">{state.error}</span> : null}
        </div>
      )}
    </form>
  );
}
