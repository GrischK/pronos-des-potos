import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { PredictionMatchForm } from "@/components/predictions/PredictionMatchForm";
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
      <PageHeader
        eyebrow={competition.kind}
        title={`Mes pronos - ${competition.name}`}
        description={
          competition.isOpen
            ? "Saisis tes scores avant le coup d'envoi de chaque match."
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

        <div className="prediction-list">
          {competition.matches.map((match) => (
            <PredictionMatchForm
              key={match.id}
              match={match}
              slug={competition.slug}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
