import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/AutoRefresh";
import { LeaderboardProgressChart } from "@/components/leaderboard/LeaderboardProgressChart";
import { PageHeader } from "@/components/PageHeader";
import { getSessionUserId } from "@/src/auth/session";
import { getCompetitionKindLabel } from "@/src/domain/competition-kind";
import { getLeaderboardProgressBundle } from "@/src/server/leaderboard";

type ClassementEvolutionPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function ClassementEvolutionPage({
  params,
  searchParams,
}: ClassementEvolutionPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [competition, currentUserId] = await Promise.all([
    getLeaderboardProgressBundle(slug),
    getSessionUserId(),
  ]);

  if (!competition) {
    notFound();
  }

  const initialMode = resolvedSearchParams?.mode === "live" ? "live" : "official";

  return (
    <main className="page-shell">
      <AutoRefresh intervalMs={30000} />
      <PageHeader
        eyebrow={getCompetitionKindLabel(competition.official.kind)}
        emblemUrl={competition.official.emblemUrl}
        title={`Graphique du classement - ${competition.official.name}`}
        mobileTitle="Graphique du classement"
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
        </div>
      </section>

      <LeaderboardProgressChart
        currentUserId={currentUserId}
        data={competition}
        initialMode={initialMode}
      />
    </main>
  );
}
