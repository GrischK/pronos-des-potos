import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/AutoRefresh";
import { CompetitionGroups } from "@/components/competitions/CompetitionGroups";
import { PageHeader } from "@/components/PageHeader";
import { getCompetitionBySlug } from "@/src/server/competitions";

export const dynamic = "force-dynamic";

type CompetitionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CompetitionPage({ params }: CompetitionPageProps) {
  const { slug } = await params;
  const competition = await getCompetitionBySlug(slug);

  if (!competition) {
    notFound();
  }

  return (
    <main className="page-shell">
      <AutoRefresh intervalMs={60000} />
      <PageHeader
        eyebrow={competition.kind}
        title={competition.name}
        description="Retrouve les pronos, les scores et le classement de cette compétition."
      />

      <section className="page-section">
        <div className="content-grid">
          <Link
            className="card action-card"
            href={`/competitions/${competition.slug}/pronos`}
          >
            <h2>Mes pronos</h2>
            <p>Saisir ou modifier les scores avant verrouillage.</p>
          </Link>
          <Link
            className="card action-card"
            href={`/competitions/${competition.slug}/classement`}
          >
            <h2>Classement</h2>
            <p>Voir les points et le vainqueur de la compétition.</p>
          </Link>
          <Link
            className="card action-card"
            href={`/competitions/${competition.slug}/tous-les-pronos`}
          >
            <h2>Tous les pronos</h2>
            <p>Comparer les choix des potos une fois les matchs verrouillés.</p>
          </Link>
        </div>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="badge badge-live">Matchs importés</p>
            <h2>Calendrier retourné par l'API</h2>
          </div>
          <p>
            {competition.matchCount} matchs stockés avec les logos
            disponibles depuis la source de données.
          </p>
        </div>

        {competition.groups.length === 0 && competition.phases.length === 0 ? (
          <p>Aucun match importé pour cette compétition.</p>
        ) : (
          <CompetitionGroups groups={competition.groups} phases={competition.phases} />
        )}
      </section>
    </main>
  );
}
