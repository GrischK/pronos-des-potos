"use client";

import { Check } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  savePredictionAction,
  type PredictionActionState,
} from "@/src/server/prediction-actions";
import { getCompetitionStageLabel } from "@/src/domain/competition-stage";
import type { PredictionMatch } from "@/src/server/predictions";

type PredictionMatchFormProps = {
  match: PredictionMatch;
  slug: string;
  anchorId?: string;
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

function getMatchMetaBadges(match: PredictionMatch) {
  if (match.status === "LIVE") {
    return [
      { label: "Match verrouillé", className: "badge badge-danger" },
      { label: "En cours", className: "badge badge-warning" },
    ];
  }

  if (match.status === "FINISHED") {
    return [{ label: "Terminé", className: "badge badge-live" }];
  }

  return [];
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

function hasCompleteScore(homeScore: string, awayScore: string) {
  return homeScore !== "" && awayScore !== "";
}

export function PredictionMatchForm({ match, slug, anchorId }: PredictionMatchFormProps) {
  const [state, formAction, pending] = useActionState(
    savePredictionAction,
    initialState,
  );
  const homeInputRef = useRef<HTMLInputElement>(null);
  const awayInputRef = useRef<HTMLInputElement>(null);
  const initialHomeScore = getPredictionValue(match.prediction?.homeScore);
  const initialAwayScore = getPredictionValue(match.prediction?.awayScore);
  const [savedHomeScore, setSavedHomeScore] = useState(initialHomeScore);
  const [savedAwayScore, setSavedAwayScore] = useState(initialAwayScore);
  const [hasSavedState, setHasSavedState] = useState(
    initialHomeScore !== "" && initialAwayScore !== "",
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isComplete, setIsComplete] = useState(
    hasCompleteScore(initialHomeScore, initialAwayScore),
  );

  const syncDraftState = () => {
    const nextHomeScore = homeInputRef.current?.value ?? "";
    const nextAwayScore = awayInputRef.current?.value ?? "";
    const nextIsDirty =
      nextHomeScore !== savedHomeScore || nextAwayScore !== savedAwayScore;
    const nextIsComplete = hasCompleteScore(nextHomeScore, nextAwayScore);

    setIsDirty((current) => (current === nextIsDirty ? current : nextIsDirty));
    setIsComplete((current) =>
      current === nextIsComplete ? current : nextIsComplete,
    );
  };

  useEffect(() => {
    if (homeInputRef.current) {
      homeInputRef.current.value = initialHomeScore;
    }

    if (awayInputRef.current) {
      awayInputRef.current.value = initialAwayScore;
    }

    setSavedHomeScore(initialHomeScore);
    setSavedAwayScore(initialAwayScore);
    setHasSavedState(initialHomeScore !== "" && initialAwayScore !== "");
    setIsDirty(false);
    setIsComplete(hasCompleteScore(initialHomeScore, initialAwayScore));
  }, [initialAwayScore, initialHomeScore, match.id]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const nextHomeScore = homeInputRef.current?.value ?? "";
    const nextAwayScore = awayInputRef.current?.value ?? "";

    setSavedHomeScore(nextHomeScore);
    setSavedAwayScore(nextAwayScore);
    setHasSavedState(true);
    setIsDirty(false);
    setIsComplete(hasCompleteScore(nextHomeScore, nextAwayScore));
  }, [state.success]);

  const hasResult = match.homeScore !== null && match.awayScore !== null;
  const showReadonlyEmptyState = !match.canPredict && !match.prediction;
  const showSavedState = hasSavedState && !isDirty;
  const hasExistingPrediction = savedHomeScore !== "" && savedAwayScore !== "";
  const submitLabel = hasExistingPrediction ? "Modifier" : "Enregistrer";
  const matchMetaBadges = getMatchMetaBadges(match);

  return (
    <form action={formAction} className="prediction-row" id={anchorId}>
      <input name="matchId" type="hidden" value={match.id} />
      <input name="slug" type="hidden" value={slug} />

      <div className="match-meta">
        <span>{formatKickoffAt(match.kickoffAt)}</span>
        <span>{getCompetitionStageLabel(match.stage)}</span>
        {matchMetaBadges.map((badge) => (
          <span className={badge.className} key={badge.label}>
            {badge.label}
          </span>
        ))}
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
                defaultValue={initialHomeScore}
                disabled={!match.canPredict || pending}
                inputMode="numeric"
                max="99"
                min="0"
                name="homeScore"
                onInput={syncDraftState}
                ref={homeInputRef}
                required
                type="number"
              />
              <span>·</span>
              <input
                aria-label={`Score ${getTeamName(match, "away")}`}
                defaultValue={initialAwayScore}
                disabled={!match.canPredict || pending}
                inputMode="numeric"
                max="99"
                min="0"
                name="awayScore"
                onInput={syncDraftState}
                ref={awayInputRef}
                required
                type="number"
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
            className={`btn ${showSavedState ? "btn-saved" : "btn-primary"}`}
            disabled={!match.canPredict || pending || !isComplete || !isDirty}
            type="submit"
          >
            {pending ? (
              "Enregistrement..."
            ) : showSavedState ? (
              <>
                <span aria-hidden="true" className="btn-check-icon">
                  <Check size={14} strokeWidth={3} />
                </span>
                Enregistré
              </>
            ) : (
              submitLabel
            )}
          </button>
          {state.error ? <span className="form-error">{state.error}</span> : null}
        </div>
      )}
    </form>
  );
}
