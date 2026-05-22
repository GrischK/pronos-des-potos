"use client";

import { useActionState } from "react";

import type { AuthActionState } from "@/src/auth/actions";

type ResetPasswordFormProps = {
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  token: string;
};

const initialState: AuthActionState = {};

export function ResetPasswordForm({ action, token }: ResetPasswordFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="auth-form">
      <input name="token" type="hidden" value={token} />

      <label className="field">
        <span>Nouveau mot de passe</span>
        <input autoComplete="new-password" minLength={8} name="password" placeholder="8 caractères minimum" required type="password" />
      </label>

      <label className="field">
        <span>Confirmer le mot de passe</span>
        <input autoComplete="new-password" minLength={8} name="confirmPassword" placeholder="Répète le mot de passe" required type="password" />
      </label>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}

      <button className="btn btn-primary auth-submit" disabled={pending} type="submit">
        {pending ? "Mise à jour..." : "Réinitialiser"}
      </button>
    </form>
  );
}
