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

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero-section">
        <PageHeader
          eyebrow="Pronos des potos"
          title="Les pronos propres, compétition par compétition."
          description="Crée une compétition, invite les potos, verrouille les matchs, saisis les résultats et laisse le classement faire le reste."
        />

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
