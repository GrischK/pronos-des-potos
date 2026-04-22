import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/AutoRefresh";
import { PageHeader } from "@/components/PageHeader";
import { AllPredictionsSchedule } from "@/components/predictions/AllPredictionsSchedule";
import { getCompetitionKindLabel } from "@/src/domain/competition-kind";
import { getAllPredictionsPageData } from "@/src/server/all-predictions";

export const dynamic = "force-dynamic";

type TousLesPronosPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TousLesPronosPage({
  params,
}: TousLesPronosPageProps) {
  const { slug } = await params;
  const competition = await getAllPredictionsPageData(slug);

  if (!competition) {
    notFound();
  }

  return (
    <main className="page-shell">
      <AutoRefresh intervalMs={30000} />
      <PageHeader
        eyebrow={getCompetitionKindLabel(competition.kind)}
        title={`Tous les pronos - ${competition.name}`}
        description="Compare les scores des potos une fois les matchs verrouillés."
      />

      <section className="page-section">
        <div className="actions">
          <Link className="btn btn-secondary" href={`/competitions/${slug}`}>
            Retour à la compétition
          </Link>
        </div>
      </section>

      <section className="page-section">
        <AllPredictionsSchedule matches={competition.matches} />
      </section>
    </main>
  );
}
