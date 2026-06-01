"use client";

import { useActionState } from "react";

import {
  syncCompetitionAction,
  type AdminActionState,
} from "@/src/server/admin-actions";

type CompetitionSyncFormProps = {
  competitionId: string;
};

const initialState: AdminActionState = {};

export function CompetitionSyncForm({ competitionId }: CompetitionSyncFormProps) {
  const [state, formAction, pending] = useActionState(
    syncCompetitionAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <input name="competitionId" type="hidden" value={competitionId} />
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
      <button className="btn btn-secondary" disabled={pending} type="submit">
        {pending ? "Synchronisation..." : "Synchroniser"}
      </button>
    </form>
  );
}
