import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";

const foundations = [
  {
    title: "Une compétition, un classement",
    text: "Euro, Coupe du monde ou tournoi entre potes restent séparés, avec leurs matchs, pronos, scores et vainqueur.",
  },
  {
    title: "Pronos verrouillés au bon moment",
    text: "Les matchs peuvent être fermés avant le coup d'envoi, sans bloquer toute la compétition.",
  },
  {
    title: "Points lisibles",
    text: "Le calcul garde la règle existante: résultat, score exact partagé, score exact unique.",
  },
];

const scoreRules = [
  { label: "Résultat", value: "1 pt" },
  { label: "Score exact", value: "3 pts" },
  { label: "Unique", value: "4 pts" },
];

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero-section">
        <div className="hero-layout">
          <PageHeader
            eyebrow="Pronos des potos"
            title="Les pronos propres, compétition par compétition."
            description="Crée une compétition, invite les potos, verrouille les matchs, saisis les résultats et laisse le classement faire le reste."
          />

          <aside className="score-panel" aria-label="Règles de score">
            <div className="score-panel-header">
              <span>France</span>
              <strong>2 - 1</strong>
              <span>Les potos</span>
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
          <Link className="btn btn-primary" href="/competitions">
            Voir les compétitions
          </Link>
          <Link className="btn btn-secondary" href="/admin">
            Administration
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
