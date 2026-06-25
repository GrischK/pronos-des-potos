"use client";

import { Check } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { getCompetitionStageLabel } from "@/src/domain/competition-stage";
import { getLiveMatchStatusLabel } from "@/src/domain/match-status";
import { formatMatchScoreText } from "@/src/domain/scoring";
import type { PredictionMatch } from "@/src/server/predictions";

type PredictionMatchFormProps = {
  match: PredictionMatch;
  slug: string;
  anchorId?: string;
  onSaved?: (prediction: {
    awayScore: number;
    homeScore: number;
    matchId: string;
  }) => void;
};

type PredictionSaveResponse = {
  error?: string;
  savedPrediction?: {
    awayScore: number;
    homeScore: number;
    matchId: string;
    savedAt: number;
  };
  success?: string;
};

type SubmitButtonUiState = {
  ariaLabel: string;
  className: string;
  disabled: boolean;
  editableHidden: boolean;
  editableLabel: string;
  pendingHidden: boolean;
  savedHidden: boolean;
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

function getMatchMetaBadges(match: PredictionMatch) {
  if (match.status === "LIVE") {
    const liveStatusLabel = getLiveMatchStatusLabel(match.liveMinute);

    return [
      { label: "Match verrouillé", className: "badge badge-danger" },
      {
        label:
          liveStatusLabel === "En cours"
            ? "En cours"
            : `En cours ${liveStatusLabel}`,
        className: "badge badge-warning",
      },
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

function normalizeScoreInput(input: HTMLInputElement) {
  const normalizedValue = input.value.replace(/\D/g, "").slice(0, 2);

  if (input.value !== normalizedValue) {
    input.value = normalizedValue;
  }
}

function PredictionMatchFormComponent({
  match,
  slug,
  anchorId,
  onSaved,
}: PredictionMatchFormProps) {
  const [error, setError] = useState<string | null>(null);
  const homeInputRef = useRef<HTMLInputElement>(null);
  const awayInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const pendingLabelRef = useRef<HTMLSpanElement>(null);
  const savedLabelRef = useRef<HTMLSpanElement>(null);
  const editableLabelRef = useRef<HTMLSpanElement>(null);
  const submitButtonUiStateRef = useRef<SubmitButtonUiState | null>(null);
  const isSubmittingRef = useRef(false);
  const initialHomeScore = getPredictionValue(match.prediction?.homeScore);
  const initialAwayScore = getPredictionValue(match.prediction?.awayScore);
  const savedHomeScoreRef = useRef(initialHomeScore);
  const savedAwayScoreRef = useRef(initialAwayScore);
  const hasSavedStateRef = useRef(initialHomeScore !== "" && initialAwayScore !== "");
  const initialIsComplete = hasCompleteScore(initialHomeScore, initialAwayScore);
  const initialShowSavedState = hasSavedStateRef.current;

  const updateSubmitButton = (submittingOverride?: boolean) => {
    const button = submitButtonRef.current;
    const pendingLabel = pendingLabelRef.current;
    const savedLabel = savedLabelRef.current;
    const editableLabel = editableLabelRef.current;

    if (!button || !pendingLabel || !savedLabel || !editableLabel) {
      return;
    }

    const nextHomeScore = homeInputRef.current?.value ?? "";
    const nextAwayScore = awayInputRef.current?.value ?? "";
    const nextIsDirty =
      nextHomeScore !== savedHomeScoreRef.current ||
      nextAwayScore !== savedAwayScoreRef.current;
    const nextIsComplete = hasCompleteScore(nextHomeScore, nextAwayScore);
    const hasExistingPrediction =
      savedHomeScoreRef.current !== "" && savedAwayScoreRef.current !== "";
    const showSavedState = hasSavedStateRef.current && !nextIsDirty;
    const showPendingState = submittingOverride ?? isSubmittingRef.current;
    const nextUiState: SubmitButtonUiState = {
      ariaLabel: showSavedState ? "Prono enregistré" : "Enregistrer le prono",
      className: `btn ${
        showSavedState && !showPendingState ? "btn-saved" : "btn-primary"
      }`,
      disabled:
        !match.canPredict ||
        showPendingState ||
        !nextIsComplete ||
        !nextIsDirty,
      editableHidden: showPendingState || showSavedState,
      editableLabel: hasExistingPrediction ? "Modifier" : "Enregistrer",
      pendingHidden: !showPendingState,
      savedHidden: showPendingState || !showSavedState,
    };
    const previousUiState = submitButtonUiStateRef.current;

    if (
      previousUiState &&
      previousUiState.ariaLabel === nextUiState.ariaLabel &&
      previousUiState.className === nextUiState.className &&
      previousUiState.disabled === nextUiState.disabled &&
      previousUiState.editableHidden === nextUiState.editableHidden &&
      previousUiState.editableLabel === nextUiState.editableLabel &&
      previousUiState.pendingHidden === nextUiState.pendingHidden &&
      previousUiState.savedHidden === nextUiState.savedHidden
    ) {
      return;
    }

    submitButtonUiStateRef.current = nextUiState;

    button.disabled = nextUiState.disabled;
    button.className = nextUiState.className;
    button.setAttribute("aria-label", nextUiState.ariaLabel);
    editableLabel.textContent = nextUiState.editableLabel;
    pendingLabel.hidden = nextUiState.pendingHidden;
    savedLabel.hidden = nextUiState.savedHidden;
    editableLabel.hidden = nextUiState.editableHidden;
  };

  const handleScoreInput = (event: FormEvent<HTMLInputElement>) => {
    normalizeScoreInput(event.currentTarget);
    updateSubmitButton();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    const nextHomeScore = homeInputRef.current?.value ?? "";
    const nextAwayScore = awayInputRef.current?.value ?? "";
    const nextIsDirty =
      nextHomeScore !== savedHomeScoreRef.current ||
      nextAwayScore !== savedAwayScoreRef.current;

    if (
      !match.canPredict ||
      !hasCompleteScore(nextHomeScore, nextAwayScore) ||
      !nextIsDirty
    ) {
      updateSubmitButton();
      return;
    }

    isSubmittingRef.current = true;
    updateSubmitButton(true);

    if (error) {
      setError(null);
    }

    try {
      const response = await fetch(
        `/api/competitions/${encodeURIComponent(slug)}/pronos/predictions`,
        {
          body: JSON.stringify({
            awayScore: nextAwayScore,
            homeScore: nextHomeScore,
            matchId: match.id,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json()) as PredictionSaveResponse;

      if (!response.ok || payload.error || !payload.savedPrediction) {
        setError(payload.error ?? "Impossible d'enregistrer le prono.");
        return;
      }

      const savedHomeScore = String(payload.savedPrediction.homeScore);
      const savedAwayScore = String(payload.savedPrediction.awayScore);

      savedHomeScoreRef.current = savedHomeScore;
      savedAwayScoreRef.current = savedAwayScore;
      hasSavedStateRef.current = true;
      onSaved?.({
        awayScore: payload.savedPrediction.awayScore,
        homeScore: payload.savedPrediction.homeScore,
        matchId: payload.savedPrediction.matchId,
      });
    } catch {
      setError("Impossible d'enregistrer le prono.");
    } finally {
      isSubmittingRef.current = false;
      updateSubmitButton(false);
    }
  };

  useEffect(() => {
    if (homeInputRef.current) {
      homeInputRef.current.value = initialHomeScore;
    }

    if (awayInputRef.current) {
      awayInputRef.current.value = initialAwayScore;
    }

    savedHomeScoreRef.current = initialHomeScore;
    savedAwayScoreRef.current = initialAwayScore;
    hasSavedStateRef.current = initialHomeScore !== "" && initialAwayScore !== "";
    updateSubmitButton();
  }, [initialAwayScore, initialHomeScore, match.id, match.canPredict]);

  useEffect(() => {
    updateSubmitButton();
  });

  const hasResult = match.homeScore !== null && match.awayScore !== null;
  const showReadonlyEmptyState = !match.canPredict && !match.prediction;
  const initialSubmitLabel = initialShowSavedState ? "Modifier" : "Enregistrer";
  const matchMetaBadges = getMatchMetaBadges(match);

  return (
    <form
      className="prediction-row"
      id={anchorId}
      onSubmit={handleSubmit}
    >
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
              decoding="async"
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
                autoComplete="off"
                defaultValue={initialHomeScore}
                disabled={!match.canPredict}
                inputMode="numeric"
                maxLength={2}
                name="homeScore"
                onInput={handleScoreInput}
                pattern="[0-9]*"
                ref={homeInputRef}
                required
                type="text"
              />
              <span>·</span>
              <input
                aria-label={`Score ${getTeamName(match, "away")}`}
                autoComplete="off"
                defaultValue={initialAwayScore}
                disabled={!match.canPredict}
                inputMode="numeric"
                maxLength={2}
                name="awayScore"
                onInput={handleScoreInput}
                pattern="[0-9]*"
                ref={awayInputRef}
                required
                type="text"
              />
            </div>
          )}

          {hasResult ? (
            <p className="prediction-result">
              {getResultLabel(match.status)}{" "}
              <span className="mt-4">{formatMatchScoreText(match)}</span>
            </p>
          ) : null}
        </div>

        <span className="match-team match-team-away">
          <span>{getTeamName(match, "away")}</span>
          {getTeamFlag(match, "away") ? (
            <img
              alt=""
              className="team-flag"
              decoding="async"
              loading="lazy"
              src={getTeamFlag(match, "away") ?? undefined}
            />
          ) : null}
        </span>
      </div>

      {showReadonlyEmptyState ? null : (
        <div className="prediction-actions">
          <button
            aria-label={
              initialShowSavedState ? "Prono enregistré" : "Enregistrer le prono"
            }
            className={`btn ${initialShowSavedState ? "btn-saved" : "btn-primary"}`}
            disabled={
              !match.canPredict ||
              !initialIsComplete ||
              initialShowSavedState
            }
            ref={submitButtonRef}
            type="submit"
          >
            <span hidden ref={pendingLabelRef}>
              Enregistrement...
            </span>
            <span hidden={!initialShowSavedState} ref={savedLabelRef}>
              <span aria-hidden="true" className="btn-check-icon">
                <Check size={14} strokeWidth={3} />
              </span>
              Enregistré
            </span>
            <span hidden={initialShowSavedState} ref={editableLabelRef}>
              {initialSubmitLabel}
            </span>
          </button>
          {error ? <span className="form-error">{error}</span> : null}
        </div>
      )}
    </form>
  );
}

export const PredictionMatchForm = memo(PredictionMatchFormComponent);
