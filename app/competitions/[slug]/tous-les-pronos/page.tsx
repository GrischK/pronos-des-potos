import Link from "next/link";
import {Star} from "lucide-react";
import { notFound } from "next/navigation";

import {AutoRefresh} from "@/components/AutoRefresh";
import { CompetitionActionCard } from "@/components/competitions/CompetitionActionCard";
import {PageHeader} from "@/components/PageHeader";
import {AllPredictionsSchedule} from "@/components/predictions/AllPredictionsSchedule";
import {getCompetitionKindLabel} from "@/src/domain/competition-kind";
import {getAllPredictionsPageData} from "@/src/server/all-predictions";

export const dynamic = "force-dynamic";

type TousLesPronosPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TousLesPronosPage({
                                                  params,
                                                }: TousLesPronosPageProps) {
  const {slug} = await params;
  const competition = await getAllPredictionsPageData(slug);

  if (!competition) {
    notFound();
  }

  return (
    <main className="page-shell">
      <AutoRefresh intervalMs={30000}/>
      <PageHeader
        eyebrow={getCompetitionKindLabel(competition.kind)}
        emblemUrl={competition.emblemUrl}
        title={`Tous les pronos - ${competition.name}`}
        mobileTitle="Tous les pronos"
        className="competition-subpage-header"
        description="Compare les scores des potos une fois les matchs verrouillés."
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
      <div>
        {competition.bonusEnabled ? (
          competition.hasBonusPrediction ? (
            <CompetitionActionCard
              className="my-4"
              description="Voir l'évolution du classement"
              href={`/competitions/${slug}/tous-les-pronos/podium-bonus`}
              icon={<Star aria-hidden="true" size={20} strokeWidth={2.8} />}
              title="Graphique du classement"
              tone="navy"
              width="inline"
            />
          ) : (
            <div className="bonus-pronos-gate competition-back-button" aria-live="polite">
              <button
                className="btn btn-secondary competition-back-button"
                disabled
                aria-describedby="bonus-pronos-tooltip"
                title="Enregistre d'abord ton podium bonus pour voir celui des autres."
                type="button"
              >
                Voir les pronos bonus
              </button>
              <span className="bonus-pronos-tooltip" id="bonus-pronos-tooltip" role="tooltip">
                  Disponible après avoir enregistré ton podium bonus.
                </span>
            </div>
          )
        ) : null}
      </div>

      <section className="page-section">
        <AllPredictionsSchedule
          competitionKind={competition.kind}
          matches={competition.matches}
        />
      </section>
    </main>
  );
}
