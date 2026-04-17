import Link from "next/link";

import { getCompetitionsOverview } from "@/src/server/competitions";

export default async function CompetitionsPage() {
  const competitions = await getCompetitionsOverview();

  return (
    <main className="page">
      <p className="eyebrow">Compétitions</p>
      <h1>Choisis le tournoi.</h1>

      <section className="section">
        {competitions.length === 0 ? (
          <div className="card">
            <h2>Aucune compétition pour l'instant</h2>
            <p>La première compétition sera créée depuis l'administration.</p>
          </div>
        ) : (
          <div className="grid">
            {competitions.map((competition) => (
              <Link
                className="card"
                href={`/competitions/${competition.slug}`}
                key={competition.id}
              >
                <h2>{competition.name}</h2>
                <p>
                  {competition.matchCount} matchs, {competition.playerCount}{" "}
                  participants
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
