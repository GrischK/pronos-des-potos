import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthHero } from "@/components/auth/AuthHero";
import { signupAction } from "@/src/auth/actions";
import { getSessionUserId } from "@/src/auth/session";

export default async function SignupPage() {
  const userId = await getSessionUserId();

  if (userId) {
    redirect("/competitions");
  }

  return (
    <main className="auth-page">
      <AuthHero
        title="Entre dans la compétition."
        text="Crée ton compte, rejoins les potos et garde une trace de chaque tournoi."
      />

      <section className="auth-card">
        <p className="eyebrow">Inscription</p>
        <h2>Créer ton profil de pronostiqueur</h2>
        <p>Un email, un nom, un mot de passe. Le chambrage vient après.</p>

        <AuthForm action={signupAction} buttonLabel="Créer mon compte" mode="signup" />

        <p className="auth-switch">
          Déjà inscrit ? <Link href="/login">Se connecter</Link>
        </p>
      </section>
    </main>
  );
}
