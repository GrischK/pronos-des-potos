"use client";

import { useActionState } from "react";

import {
  updateCompetitionBonusAction,
  type AdminActionState,
} from "@/src/server/admin-actions";

type CompetitionBonusFormProps = {
  competition: {
    id: string;
    bonusEnabled: boolean;
  };
};

const initialState: AdminActionState = {};

export function CompetitionBonusForm({ competition }: CompetitionBonusFormProps) {
  const [state, formAction, pending] = useActionState(
    updateCompetitionBonusAction,
    initialState,
  );

  return (
    <form action={formAction} className="admin-rename-form">
      <input name="competitionId" type="hidden" value={competition.id} />
      <label className="field">
        <span>Option bonus</span>
        <select name="bonusEnabled" defaultValue={competition.bonusEnabled ? "on" : ""}>
          <option value="">Bonus désactivé</option>
          <option value="on">Bonus activé</option>
        </select>
      </label>

      <p className="readonly-notice">
        Le bonus activé apparaît dans la page pronos avant le début de la
        compétition.
      </p>

      <button className="btn btn-secondary" disabled={pending} type="submit">
        {pending ? "Sauvegarde..." : "Mettre à jour"}
      </button>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
    </form>
  );
}
