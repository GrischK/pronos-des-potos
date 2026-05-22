import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthHero } from "@/components/auth/AuthHero";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { resetPasswordAction } from "@/src/auth/actions";
import { getSessionUserId } from "@/src/auth/session";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const userId = await getSessionUserId();

  if (userId) {
    redirect("/competitions");
  }

  const { token } = await searchParams;

  return (
    <main className="auth-page">
      <AuthHero
        title="Nouveau mot de passe"
        text="Choisis un nouveau mot de passe pour sécuriser ton compte."
      />

      <section className="auth-card">
        <p className="eyebrow">Réinitialisation</p>
        <h2>Changer le mot de passe</h2>
        <p>Le lien est valable 1 heure. Si besoin, tu peux en demander un nouveau.</p>

        {token ? (
          <ResetPasswordForm action={resetPasswordAction} token={token} />
        ) : (
          <p className="form-error">
            Lien invalide ou incomplet. <Link href="/forgot-password">Demande un nouveau lien</Link>.
          </p>
        )}

        <p className="auth-switch">
          Retour à la <Link href="/login">connexion</Link>
        </p>
      </section>
    </main>
  );
}
