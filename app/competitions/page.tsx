import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { getCompetitionsOverview } from "@/src/server/competitions";

export const dynamic = "force-dynamic";

const statusLabels = {
  DRAFT: "Fermée",
  OPEN: "Ouverte",
  LIVE: "En cours",
  FINISHED: "Terminée",
  ARCHIVED: "Archivée",
} as const;

const statusBadgeClasses = {
  DRAFT: "badge badge-warning",
  OPEN: "badge badge-live",
  LIVE: "badge badge-live",
  FINISHED: "badge badge-warning",
  ARCHIVED: "badge badge-warning",
} as const;

export default async function CompetitionsPage() {
  const competitions = await getCompetitionsOverview();

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Compétitions"
        title="Choisis ton terrain de jeu."
        description="Retrouve tes tournois, pose tes prochains pronos et surveille les classements quand les scores tombent."
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
                <p className={statusBadgeClasses[competition.status]}>
                  {statusLabels[competition.status]}
                </p>
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
