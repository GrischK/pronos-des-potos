"use client";

import { useActionState } from "react";

import { AvatarUploadForm } from "@/components/account/AvatarUploadForm";
import {
  updateAccountEmailAction,
  updateAccountNameAction,
  updateAccountPasswordAction,
  type AccountActionState,
} from "@/src/server/account-actions";

type AccountFormsProps = {
  user: {
    email: string;
    image: string | null;
    name: string | null;
  };
};

const initialState: AccountActionState = {};

function ActionMessage({ state }: { state: AccountActionState }) {
  if (state.error) {
    return <p className="form-error">{state.error}</p>;
  }

  if (state.success) {
    return <p className="form-success">{state.success}</p>;
  }

  return null;
}

export function AccountForms({ user }: AccountFormsProps) {
  const [nameState, nameAction, namePending] = useActionState(
    updateAccountNameAction,
    initialState,
  );
  const [emailState, emailAction, emailPending] = useActionState(
    updateAccountEmailAction,
    initialState,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    updateAccountPasswordAction,
    initialState,
  );

  return (
    <div className="account-grid">
      <section className="card account-card account-profile-card">
        <div className="account-avatar">
          {user.image ? (
            <img alt="" src={user.image} />
          ) : (
            <span>{(user.name ?? user.email).slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="account-profile-info">
          <h2>{user.name ?? "Compte joueur"}</h2>
          <p>{user.email}</p>
        </div>
      </section>

      <section className="card account-card">
        <h2>Photo</h2>
        <AvatarUploadForm />
      </section>

      <section className="card account-card">
        <h2>Nom</h2>
        <form action={nameAction} className="account-form">
          <label className="field">
            <span>Nom affiché</span>
            <input
              autoComplete="name"
              defaultValue={user.name ?? ""}
              name="name"
              required
            />
          </label>
          <ActionMessage state={nameState} />
          <button className="btn btn-primary" disabled={namePending} type="submit">
            {namePending ? "Enregistrement..." : "Modifier le nom"}
          </button>
        </form>
      </section>

      <section className="card account-card">
        <h2>Email</h2>
        <form action={emailAction} className="account-form">
          <label className="field">
            <span>Adresse email</span>
            <input
              autoComplete="email"
              defaultValue={user.email}
              name="email"
              required
              type="email"
            />
          </label>
          <label className="field">
            <span>Mot de passe actuel</span>
            <input
              autoComplete="current-password"
              name="currentPassword"
              required
              type="password"
            />
          </label>
          <ActionMessage state={emailState} />
          <button className="btn btn-primary" disabled={emailPending} type="submit">
            {emailPending ? "Enregistrement..." : "Modifier l'email"}
          </button>
        </form>
      </section>

      <section className="card account-card">
        <h2>Mot de passe</h2>
        <form action={passwordAction} className="account-form">
          <label className="field">
            <span>Mot de passe actuel</span>
            <input
              autoComplete="current-password"
              name="currentPassword"
              required
              type="password"
            />
          </label>
          <label className="field">
            <span>Nouveau mot de passe</span>
            <input
              autoComplete="new-password"
              minLength={8}
              name="newPassword"
              required
              type="password"
            />
          </label>
          <ActionMessage state={passwordState} />
          <button
            className="btn btn-primary"
            disabled={passwordPending}
            type="submit"
          >
            {passwordPending ? "Enregistrement..." : "Modifier le mot de passe"}
          </button>
        </form>
      </section>
    </div>
  );
}
