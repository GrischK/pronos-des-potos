import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthHero } from "@/components/auth/AuthHero";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { requestPasswordResetAction } from "@/src/auth/actions";
import { getSessionUserId } from "@/src/auth/session";

export default async function ForgotPasswordPage() {
  const userId = await getSessionUserId();

  if (userId) {
    redirect("/competitions");
  }

  return (
    <main className="auth-page">
      <AuthHero
        title="Mot de passe oublié"
        text="On t'envoie un lien pour reprendre l'accès à ton compte."
      />

      <section className="auth-card">
        <p className="eyebrow">Réinitialisation</p>
        <h2>Recevoir un lien</h2>
        <p>Entre l'email du compte et on t'envoie un lien de réinitialisation.</p>

        <ForgotPasswordForm action={requestPasswordResetAction} />

        <p className="auth-switch">
          Retour à la <Link href="/login">connexion</Link>
        </p>
      </section>
    </main>
  );
}
