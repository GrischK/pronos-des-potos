import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthHero } from "@/components/auth/AuthHero";
import { loginAction } from "@/src/auth/actions";
import { getSessionUserId } from "@/src/auth/session";

type LoginPageProps = {
  searchParams?: Promise<{
    reset?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const userId = await getSessionUserId();

  if (userId) {
    redirect("/competitions");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const passwordResetDone = resolvedSearchParams?.reset === "1";

  return (
    <main className="auth-page">
      <AuthHero
        title="Retour au classement"
        text="Connecte-toi, vérifie tes pronos et prépare la prochaine journée avant les autres."
      />

      <section className="auth-card">
        <p className="eyebrow">Connexion</p>
        <h2>Reprendre la compétition</h2>
        <p>Entre dans le vestiaire et retrouve tes pronos.</p>

        {passwordResetDone ? (
          <p className="form-success">
            Mot de passe mis à jour. Connecte-toi avec le nouveau.
          </p>
        ) : null}

        <AuthForm action={loginAction} buttonLabel="Se connecter" mode="login" />

        <p className="auth-switch">
          <Link href="/forgot-password">Mot de passe oublié ?</Link>
        </p>

        <p className="auth-switch">
          Pas encore dans la bande ? <Link href="/signup">Créer un compte</Link>
        </p>
      </section>
    </main>
  );
}
