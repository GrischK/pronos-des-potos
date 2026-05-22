"use client";

import { Check, ChevronDown } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  saveBonusPredictionAction,
  type PredictionActionState,
} from "@/src/server/prediction-actions";
import type { PredictionBonusData } from "@/src/server/predictions";

type BonusPredictionFormProps = {
  competitionId: string;
  slug: string;
  bonus: PredictionBonusData;
};

const initialState: PredictionActionState = {};

type BonusField = "winnerTeamId" | "secondTeamId" | "thirdTeamId";

const bonusFields: {
  label: string;
  name: BonusField;
}[] = [
  { label: "Vainqueur", name: "winnerTeamId" },
  { label: "Second", name: "secondTeamId" },
  { label: "Troisième", name: "thirdTeamId" },
];

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

function TeamLogo({ team }: { team: PredictionBonusData["teams"][number] }) {
  if (team.flagUrl) {
    return <img alt="" className="team-flag" loading="lazy" src={team.flagUrl} />;
  }

  return <span className="bonus-team-fallback">{getInitial(team.name)}</span>;
}

function BonusTeamPicker({
  disabled,
  field,
  onPick,
  openField,
  selectedIds,
  setOpenField,
  teams,
  value,
}: {
  disabled: boolean;
  field: {
    label: string;
    name: BonusField;
  };
  onPick: (field: BonusField, value: string) => void;
  openField: BonusField | null;
  selectedIds: Set<string>;
  setOpenField: (field: BonusField | null) => void;
  teams: PredictionBonusData["teams"];
  value: string;
}) {
  const selectedTeam = teams.find((team) => team.id === value) ?? null;
  const isOpen = openField === field.name;

  return (
    <div className="bonus-team-picker">
      <input name={field.name} type="hidden" value={value} />
      <span className="bonus-team-picker-label">{field.label}</span>
      <button
        aria-expanded={isOpen}
        className="bonus-team-picker-trigger"
        disabled={disabled}
        onClick={() => setOpenField(isOpen ? null : field.name)}
        type="button"
      >
        <span className="bonus-team-picker-value">
          {selectedTeam ? <TeamLogo team={selectedTeam} /> : null}
          <span>{selectedTeam?.name ?? "Choisir une équipe"}</span>
        </span>
        <ChevronDown aria-hidden="true" size={18} strokeWidth={3} />
      </button>

      {isOpen ? (
        <div className="bonus-team-picker-menu" role="listbox">
          <button
            aria-selected={value === ""}
            className="bonus-team-picker-option bonus-team-picker-option-clear"
            onClick={() => onPick(field.name, "")}
            role="option"
            type="button"
          >
            <span>Aucun choix</span>
          </button>
          {teams.map((team) => {
            const isSelectedElsewhere = selectedIds.has(team.id) && team.id !== value;

            return (
              <button
                aria-selected={team.id === value}
                className="bonus-team-picker-option"
                disabled={isSelectedElsewhere}
                key={team.id}
                onClick={() => onPick(field.name, team.id)}
                role="option"
                type="button"
              >
                <TeamLogo team={team} />
                <span>{team.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function BonusPredictionForm({
  competitionId,
  slug,
  bonus,
}: BonusPredictionFormProps) {
  const [state, formAction, pending] = useActionState(
    saveBonusPredictionAction,
    initialState,
  );
  const lastHandledSuccessState = useRef<PredictionActionState | null>(null);
  const [openField, setOpenField] = useState<BonusField | null>(null);
  const [values, setValues] = useState<Record<BonusField, string>>({
    winnerTeamId: bonus.prediction?.winnerTeamId ?? "",
    secondTeamId: bonus.prediction?.secondTeamId ?? "",
    thirdTeamId: bonus.prediction?.thirdTeamId ?? "",
  });
  const [savedValues, setSavedValues] = useState<Record<BonusField, string>>({
    winnerTeamId: bonus.prediction?.winnerTeamId ?? "",
    secondTeamId: bonus.prediction?.secondTeamId ?? "",
    thirdTeamId: bonus.prediction?.thirdTeamId ?? "",
  });
  const isLocked = !bonus.canPredict;
  const selectedIds = new Set(Object.values(values).filter(Boolean));
  const isComplete = Object.values(values).some(Boolean);
  const hasSavedPodium = Object.values(savedValues).some(Boolean);
  const isDirty =
    values.winnerTeamId !== savedValues.winnerTeamId ||
    values.secondTeamId !== savedValues.secondTeamId ||
    values.thirdTeamId !== savedValues.thirdTeamId;
  const showSavedState = hasSavedPodium && !isDirty;
  const summaryLabel = isLocked
    ? "Verrouillé"
    : showSavedState
      ? "Podium enregistré"
      : "À compléter";

  useEffect(() => {
    if (!state.success || lastHandledSuccessState.current === state) {
      return;
    }

    lastHandledSuccessState.current = state;
    setSavedValues(values);
  }, [state, values]);

  function handlePick(field: BonusField, teamId: string) {
    const nextValues = {
      ...values,
      [field]: teamId,
    };
    const currentIndex = bonusFields.findIndex((entry) => entry.name === field);
    const nextEmptyField =
      bonusFields
        .slice(currentIndex + 1)
        .find((entry) => !nextValues[entry.name])?.name ?? null;

    setValues(nextValues);
    setOpenField(nextEmptyField);
  }

  if (!bonus.enabled) {
    return null;
  }

  return (
    <details
      className="pending-predictions-panel bonus-predictions-panel"
      open={!isLocked && !showSavedState}
    >
      <summary>
        <span>
          <span className="badge badge-warning">Bonus podium</span>
          <strong>{summaryLabel}</strong>
        </span>
        <span
          aria-hidden="true"
          className="pending-predictions-summary-action"
        >
          <ChevronDown size={18} strokeWidth={3} />
        </span>
      </summary>

      <form action={formAction} className="prediction-row">
        <input name="competitionId" type="hidden" value={competitionId} />
        <input name="slug" type="hidden" value={slug} />

        <div className="bonus-podium-grid">
          {bonusFields.map((field) => (
            <BonusTeamPicker
              disabled={isLocked || pending}
              field={field}
              key={field.name}
              onPick={handlePick}
              openField={openField}
              selectedIds={selectedIds}
              setOpenField={setOpenField}
              teams={bonus.teams}
              value={values[field.name]}
            />
          ))}
        </div>

        <div className="prediction-actions">
          <button
            aria-label={showSavedState ? "Podium enregistré" : "Enregistrer le podium"}
            className={`btn ${showSavedState ? "btn-saved" : "btn-primary"}`}
            disabled={isLocked || pending || !isComplete || showSavedState}
            type="submit"
          >
            {pending ? (
              "Enregistrement..."
            ) : showSavedState ? (
              <>
                <span aria-hidden="true" className="btn-check-icon">
                  <Check size={14} strokeWidth={3} />
                </span>
                Podium enregistré
              </>
            ) : (
              "Enregistrer le podium"
            )}
          </button>
          {state.error ? <span className="form-error">{state.error}</span> : null}
        </div>

        {isLocked ? (
          <p className="readonly-notice">
            {bonus.allowLateEntries
              ? "Le bonus podium est indisponible tant que la competition est fermee."
              : "Le bonus podium est verrouille des le debut de la competition."}
          </p>
        ) : null}
      </form>
    </details>
  );
}
