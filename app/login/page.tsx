import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthHero } from "@/components/auth/AuthHero";
import { loginAction } from "@/src/auth/actions";
import { getSessionUserId } from "@/src/auth/session";

export default async function LoginPage() {
  const userId = await getSessionUserId();

  if (userId) {
    redirect("/competitions");
  }

  return (
    <main className="auth-page">
      <AuthHero
        title="Retour au classement."
        text="Connecte-toi, vérifie tes pronos et prépare la prochaine journée avant les autres."
      />

      <section className="auth-card">
        <p className="eyebrow">Connexion</p>
        <h2>Reprendre la compétition</h2>
        <p>Entre dans le vestiaire et retrouve tes pronos.</p>

        <AuthForm action={loginAction} buttonLabel="Se connecter" mode="login" />

        <p className="auth-switch">
          Pas encore dans la bande ? <Link href="/signup">Créer un compte</Link>
        </p>
      </section>
    </main>
  );
}
