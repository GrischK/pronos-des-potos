"use client";

import { useActionState } from "react";

import type { AuthActionState } from "@/src/auth/actions";

type AuthFormProps = {
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  buttonLabel: string;
  mode: "login" | "signup";
};

const initialState: AuthActionState = {};

export function AuthForm({ action, buttonLabel, mode }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="auth-form">
      {mode === "signup" ? (
        <label className="field">
          <span>Nom</span>
          <input autoComplete="name" name="name" placeholder="Grisch" required />
        </label>
      ) : null}

      <label className="field">
        <span>Email</span>
        <input
          autoComplete="email"
          name="email"
          placeholder="toi@exemple.fr"
          required
          type="email"
        />
      </label>

      <label className="field">
        <span>Mot de passe</span>
        <input
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={mode === "signup" ? 8 : undefined}
          name="password"
          placeholder="8 caractères minimum"
          required
          type="password"
        />
      </label>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <button className="btn btn-primary auth-submit" disabled={pending} type="submit">
        {pending ? "Un instant..." : buttonLabel}
      </button>
    </form>
  );
}
