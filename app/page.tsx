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
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Pronos des potos</p>
          <h1>Les pronos propres, compétition par compétition.</h1>
        </div>
        <p>
          Crée une compétition, invite les potos, verrouille les matchs, saisis
          les résultats et laisse le classement faire le reste.
        </p>
        <div className="actions">
          <a className="button" href="/competitions">
            Voir les compétitions
          </a>
          <a className="button secondary" href="/admin">
            Administration
          </a>
        </div>
      </section>

      <section className="section">
        <div className="grid">
          {foundations.map((item) => (
            <article className="card" key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
