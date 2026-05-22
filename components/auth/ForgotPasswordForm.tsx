"use client";

import { useActionState } from "react";

import type { AuthActionState } from "@/src/auth/actions";

type ForgotPasswordFormProps = {
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
};

const initialState: AuthActionState = {};

export function ForgotPasswordForm({ action }: ForgotPasswordFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="auth-form">
      <label className="field">
        <span>Email</span>
        <input autoComplete="email" name="email" placeholder="toi@exemple.fr" required type="email" />
      </label>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}

      <button className="btn btn-primary auth-submit" disabled={pending} type="submit">
        {pending ? "Envoi en cours..." : "Envoyer le lien"}
      </button>
    </form>
  );
}
