import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/AutoRefresh";
import { CompetitionGroups } from "@/components/competitions/CompetitionGroups";
import { PageHeader } from "@/components/PageHeader";
import { getCompetitionKindLabel } from "@/src/domain/competition-kind";
import { getCompetitionBySlug } from "@/src/server/competitions";

export const dynamic = "force-dynamic";

type CalendrierPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CalendrierPage({ params }: CalendrierPageProps) {
  const { slug } = await params;
  const competition = await getCompetitionBySlug(slug);

  if (!competition) {
    notFound();
  }

  return (
    <main className="page-shell">
      <AutoRefresh intervalMs={60000} />
      <PageHeader
        eyebrow={getCompetitionKindLabel(competition.kind)}
        emblemUrl={competition.emblemUrl}
        title={`Calendrier - ${competition.name}`}
        mobileTitle="Calendrier"
        className="competition-subpage-header"
        description="Matchs, groupes et phases de la compétition."
      />

      <section className="page-section">
        <div className="actions">
          <Link className="btn btn-secondary" href={`/competitions/${slug}`}>
            Retour à la compétition
          </Link>
        </div>
      </section>

      <section className="page-section">
        {competition.groups.length === 0 && competition.phases.length === 0 ? (
          <p>Aucun match importé pour cette compétition.</p>
        ) : (
          <CompetitionGroups
            competitionKind={competition.kind}
            groups={competition.groups}
            phases={competition.phases}
          />
        )}
      </section>
    </main>
  );
}
