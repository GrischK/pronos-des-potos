import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { LeaderboardPotosRadar } from "@/components/leaderboard/LeaderboardPotosRadar";
import { LeaderboardTournamentStatsSection } from "@/components/leaderboard/LeaderboardTournamentStatsSection";
import { getCompetitionKindLabel } from "@/src/domain/competition-kind";
import { getLeaderboardData } from "@/src/server/leaderboard";

export const dynamic = "force-dynamic";

type CompetitionStatsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CompetitionStatsPage({
  params,
}: CompetitionStatsPageProps) {
  const { slug } = await params;
  const competition = await getLeaderboardData(slug);

  if (!competition) {
    notFound();
  }

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow={getCompetitionKindLabel(competition.kind)}
        emblemUrl={competition.emblemUrl}
        title={`Stats de la compétition - ${competition.name}`}
        mobileTitle="Stats de la compétition"
        className="competition-subpage-header"
        description="Toutes les tendances marquantes du tournoi."
      />

      <section className="page-section">
        <div className="actions">
          <Link
            className="btn btn-primary competition-back-button"
            href={`/competitions/${slug}`}
          >
            Retour à la compétition
          </Link>
        </div>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="badge badge-live">Officiel</p>
          </div>
          <p>Ces stats sont calculées uniquement sur les matchs terminés.</p>
        </div>
      </section>

      <LeaderboardPotosRadar
        players={competition.official.rows}
        tournamentStats={competition.tournamentStats}
      />

      <LeaderboardTournamentStatsSection
        slug={competition.slug}
        stats={competition.tournamentStats}
      />
    </main>
  );
}
