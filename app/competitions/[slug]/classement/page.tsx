import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/AutoRefresh";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";
import { PageHeader } from "@/components/PageHeader";
import { getCompetitionKindLabel } from "@/src/domain/competition-kind";
import { getLeaderboardData } from "@/src/server/leaderboard";

export const dynamic = "force-dynamic";

type ClassementPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ClassementPage({ params }: ClassementPageProps) {
  const { slug } = await params;
  const competition = await getLeaderboardData(slug);

  if (!competition) {
    notFound();
  }

  return (
    <main className="page-shell">
      <AutoRefresh intervalMs={30000} />
      <PageHeader
        eyebrow={getCompetitionKindLabel(competition.kind)}
        emblemUrl={competition.emblemUrl}
        title={`Classement - ${competition.name}`}
        description="Le live s’emballe à chaque but. Le classement officiel tranche."
      />

      <section className="page-section">
        <div className="actions">
          <Link className="btn btn-secondary" href={`/competitions/${slug}`}>
            Retour à la compétition
          </Link>
        </div>
      </section>

      <LeaderboardTabs leaderboard={competition} />
    </main>
  );
}
