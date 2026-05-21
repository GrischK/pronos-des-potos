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
    bonusLateEntriesEnabled: boolean;
    status: string;
  };
};

const initialState: AdminActionState = {};

export function CompetitionBonusForm({ competition }: CompetitionBonusFormProps) {
  const [state, formAction, pending] = useActionState(
    updateCompetitionBonusAction,
    initialState,
  );

  return (
    <form action={formAction} className="admin-rename-form admin-bonus-form">
      <input name="competitionId" type="hidden" value={competition.id} />
      <div className="field">
        <span>Prono podium</span>
        <div className="admin-bonus-options">
          <label className="admin-bonus-option">
            <input
              defaultChecked={competition.bonusEnabled}
              name="bonusEnabled"
              type="checkbox"
              value="on"
            />
            <div className="admin-bonus-option-copy">
              <strong>Activer le bonus podium</strong>
              <small>Affiche le module podium sur la page pronos.</small>
            </div>
          </label>
          <label className="admin-bonus-option">
            <input
              defaultChecked={competition.bonusLateEntriesEnabled}
              name="bonusLateEntriesEnabled"
              type="checkbox"
              value="on"
            />
            <div className="admin-bonus-option-copy">
              <strong>Autoriser le podium apres le debut</strong>
              <small>Concerne uniquement le podium bonus, pas les pronos de matchs.</small>
            </div>
          </label>
        </div>
      </div>

      <p className="readonly-notice">
        Le bonus peut etre active a tout moment. Quand l'option ci-dessus est
        cochee, les joueurs peuvent encore enregistrer leur podium meme si la
        competition est deja {competition.status === "OPEN" || competition.status === "LIVE" ? "commencee" : "ouverte"}.
      </p>

      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Sauvegarde..." : "Mettre à jour"}
      </button>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
    </form>
  );
}
