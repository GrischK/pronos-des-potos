"use client";

import { useActionState } from "react";

import {
  createCompetitionAction,
  type AdminActionState,
} from "@/src/server/admin-actions";

const initialState: AdminActionState = {};

export function CompetitionForm() {
  const [state, formAction, pending] = useActionState(
    createCompetitionAction,
    initialState,
  );

  return (
    <form action={formAction} className="admin-form">
      <div className="form-grid">
        <label className="field">
          <span>Nom</span>
          <input name="name" placeholder="Euro 2028" required />
        </label>

        <label className="field">
          <span>Slug</span>
          <input name="slug" placeholder="euro-2028" />
        </label>

        <label className="field">
          <span>Format</span>
          <select name="kind" required defaultValue="WORLD_CUP">
            <option value="EURO">Euro</option>
            <option value="WORLD_CUP">Coupe du monde</option>
            <option value="CHAMPIONS_LEAGUE">Champions League</option>
            <option value="OTHER">Autre</option>
          </select>
        </label>

        <input name="externalProvider" type="hidden" value="FOOTBALL_DATA" />

        <label className="field">
          <span>Code compétition football-data</span>
          <input
            name="externalCompetitionId"
            placeholder="WC"
            required
            defaultValue="WC"
          />
        </label>

        <label className="field">
          <span>Saison football-data</span>
          <input
            inputMode="numeric"
            max="2100"
            min="1990"
            name="externalSeason"
            placeholder="2026"
            required
            type="number"
            defaultValue="2026"
          />
        </label>
      </div>

      <label className="check-field">
        <input name="importNow" type="checkbox" />
        <span>Importer les équipes et matchs maintenant</span>
      </label>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}

      <button className="btn btn-primary auth-submit" disabled={pending} type="submit">
        {pending ? "Import en cours..." : "Créer la compétition"}
      </button>
    </form>
  );
}
