import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/AutoRefresh";
import { PageHeader } from "@/components/PageHeader";
import { PredictionSchedule } from "@/components/predictions/PredictionSchedule";
import { getCompetitionKindLabel } from "@/src/domain/competition-kind";
import { getPredictionPageData } from "@/src/server/predictions";

export const dynamic = "force-dynamic";

type PronosticsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PronosticsPage({ params }: PronosticsPageProps) {
  const { slug } = await params;
  const competition = await getPredictionPageData(slug);

  if (!competition) {
    notFound();
  }

  return (
    <main className="page-shell">
      <AutoRefresh intervalMs={30000} />
      <PageHeader
        eyebrow={getCompetitionKindLabel(competition.kind)}
        emblemUrl={competition.emblemUrl}
        title={`Mes pronos - ${competition.name}`}
        description={
          competition.isOpen
            ? "Saisis ou modifie tes scores avant le coup d'envoi de chaque match."
            : "La compétition est fermée aux pronos. Tes scores restent consultables."
        }
      />

      <section className="page-section">
        <div className="actions">
          <Link className="btn btn-secondary" href={`/competitions/${slug}`}>
            Retour à la compétition
          </Link>
        </div>
      </section>

      <section className="page-section">
        {competition.status !== "OPEN" ? (
          <p className="readonly-notice">
            Compétition fermée : les pronos sont en lecture seule.
          </p>
        ) : null}

        <PredictionSchedule
          competitionKind={competition.kind}
          matches={competition.matches}
          slug={competition.slug}
        />
      </section>
    </main>
  );
}
