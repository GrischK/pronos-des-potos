import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { getCompetitionsOverview } from "@/src/server/competitions";

export const dynamic = "force-dynamic";

export default async function CompetitionsPage() {
  const competitions = await getCompetitionsOverview();

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Compétitions"
        title="Choisis le tournoi."
        description="Chaque Euro, Coupe du monde ou tournoi garde ses matchs, ses pronos et son vainqueur."
      />

      <section className="page-section">
        {competitions.length === 0 ? (
          <EmptyState
            title="Aucune compétition pour l'instant"
            text="La première compétition sera créée depuis l'administration."
            action={
              <Link className="btn btn-primary" href="/admin">
                Préparer une compétition
              </Link>
            }
          />
        ) : (
          <div className="content-grid">
            {competitions.map((competition) => (
              <Link
                className="card competition-card"
                href={`/competitions/${competition.slug}`}
                key={competition.id}
              >
                <p className="badge badge-live">Ouverte</p>
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
