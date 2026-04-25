import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getSessionUserId } from "@/src/auth/session";

const foundations = [
  {
    title: "Un tournoi, un seul maestro",
    text: "Euro, Coupe du monde ou Champions League entre potos: chaque compétition garde ses matchs, ses pronos et son champion à couronner.",
  },
  {
    title: "Plus de prono après le coup d'envoi",
    text: "Chaque match se verrouille quand il faut. Les retardataires gardent leurs excuses, pas leurs points.",
  },
  {
    title: "Des points simples à défendre",
    text: "Bon résultat, score exact, score exact unique: tout le monde comprend pourquoi il gagne, surtout celui qui fanfaronne.",
  },
];

const scoreRules = [
  { label: "Résultat", value: "1 pt" },
  { label: "Score exact", value: "3 pts" },
  { label: "Unique", value: "4 pts" },
];

export default async function Home() {
  const userId = await getSessionUserId();

  if (userId) {
    redirect("/competitions");
  }

  return (
    <main className="landing-page">
      <section className="hero-section">
        <div className="landing-topbar">
          <Link className="landing-brand" href="/">
            <span className="brand-mark">P</span>
            <span>
              <span className="brand-name">Pronos des potos</span>
              <span className="brand-tagline">Tournois entre amis</span>
            </span>
          </Link>

          <ThemeToggle />
        </div>

        <div className="hero-layout">
          <PageHeader
            eyebrow="Euro, Coupe du monde, chambrage"
            title="Des potos, des pronos, un seul héros."
            description="Crée ou rejoins une compétition, balance tes scores avant le coup d'envoi et laisse le classement trancher qui avait vraiment le nez creux."
          />

          <aside className="score-panel" aria-label="Règles de score">
            <div className="score-panel-header">
              <span>Le favori</span>
              <strong>2 - 1</strong>
              <span>Le poto sûr de lui</span>
            </div>
            <div className="score-rules">
              {scoreRules.map((rule) => (
                <div className="score-rule" key={rule.label}>
                  <span>{rule.label}</span>
                  <strong>{rule.value}</strong>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="actions">
          <Link className="btn btn-secondary" href="/signup">
            Créer un compte
          </Link>
          <Link className="btn btn-primary" href="/login">
            Se connecter
          </Link>
        </div>
      </section>

      <section className="page-section">
        <div className="content-grid">
          {foundations.map((item) => (
            <article className="card feature-card" key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
