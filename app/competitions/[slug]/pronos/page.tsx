import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/AutoRefresh";
import { BonusPredictionForm } from "@/components/predictions/BonusPredictionForm";
import { PageHeader } from "@/components/PageHeader";
import { PredictionSchedule } from "@/components/predictions/PredictionSchedule";
import { getCompetitionKindLabel } from "@/src/domain/competition-kind";
import { getPredictionPageData } from "@/src/server/predictions";

export const dynamic = "force-dynamic";

type PronosticsPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    match?: string;
  }>;
};

export default async function PronosticsPage({
  params,
  searchParams,
}: PronosticsPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
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
        mobileTitle="Mes pronos"
        className="competition-subpage-header"
        description={
          competition.isOpen
            ? "Saisis ou modifie tes scores avant le coup d'envoi de chaque match."
            : "La compétition est fermée aux pronos. Tes scores restent consultables."
        }
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
        {competition.status !== "OPEN" ? (
          <p className="readonly-notice">
            Compétition fermée : les pronos sont en lecture seule.
          </p>
        ) : null}

        <BonusPredictionForm
          bonus={competition.bonus}
          competitionKind={competition.kind}
          competitionId={competition.id}
          slug={competition.slug}
        />

        <PredictionSchedule
          competitionKind={competition.kind}
          matches={competition.matches}
          targetMatchId={resolvedSearchParams?.match ?? null}
          slug={competition.slug}
        />
      </section>
    </main>
  );
}
