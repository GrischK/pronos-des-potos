import Link from "next/link";
import { notFound } from "next/navigation";

import { LeaderboardProgressChart } from "@/components/leaderboard/LeaderboardProgressChart";
import { PageHeader } from "@/components/PageHeader";
import { getSessionUserId } from "@/src/auth/session";
import { getCompetitionKindLabel } from "@/src/domain/competition-kind";
import { getLeaderboardProgressData } from "@/src/server/leaderboard";

type ClassementEvolutionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ClassementEvolutionPage({
  params,
}: ClassementEvolutionPageProps) {
  const { slug } = await params;
  const [competition, currentUserId] = await Promise.all([
    getLeaderboardProgressData(slug),
    getSessionUserId(),
  ]);

  if (!competition) {
    notFound();
  }

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow={getCompetitionKindLabel(competition.kind)}
        emblemUrl={competition.emblemUrl}
        title={`Évolution - ${competition.name}`}
        mobileTitle="Évolution"
        className="competition-subpage-header"
        description="La course au classement, journée après journée."
      />

      <section className="page-section">
        <div className="actions">
          <Link
            className="btn btn-primary competition-back-button"
            href={`/competitions/${slug}/classement`}
          >
            Retour au classement
          </Link>
          <Link className="btn btn-secondary" href={`/competitions/${slug}`}>
            Retour à la compétition
          </Link>
        </div>
      </section>

      <LeaderboardProgressChart currentUserId={currentUserId} data={competition} />
    </main>
  );
}
