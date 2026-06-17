import { CalendarDays, PencilLine, Star, Trophy, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/AutoRefresh";
import { CompetitionActionCard } from "@/components/competitions/CompetitionActionCard";
import {
  CompetitionFinishedBanner,
  CompetitionHighlights,
} from "@/components/competitions/CompetitionHighlights";
import { PageHeader } from "@/components/PageHeader";
import {
  getCompetitionHostCountries,
  getCompetitionHostLabel,
} from "@/src/domain/competition-hosts";
import { getCompetitionKindLabel } from "@/src/domain/competition-kind";
import { getCompetitionHighlights } from "@/src/server/competition-highlights";
import { getCompetitionBySlug } from "@/src/server/competitions";

export const dynamic = "force-dynamic";

type CompetitionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CompetitionPage({ params }: CompetitionPageProps) {
  const { slug } = await params;
  const [competition, highlights] = await Promise.all([
    getCompetitionBySlug(slug),
    getCompetitionHighlights(slug),
  ]);

  if (!competition || !highlights) {
    notFound();
  }

  const hostCountries = getCompetitionHostCountries(competition);
  const urgentPredictionLabel =
    competition.urgentPendingPredictionCount === 1
      ? "1 prono urgent à poser dans les 7 prochains jours"
      : `${competition.urgentPendingPredictionCount} pronos urgents à poser dans les 7 prochains jours`;

  return (
    <main className="page-shell">
      <AutoRefresh intervalMs={60000} />
      <PageHeader
        eyebrow={getCompetitionKindLabel(competition.kind)}
        emblemUrl={competition.emblemUrl}
        title={competition.name}
        className="competition-detail-header"
        description="Retrouve les pronos, les scores et le classement de cette compétition."
      />
      {hostCountries.length > 0 ? (
        <div className="host-countries" aria-label="Pays hôtes">
          <span className="host-countries-label">
            {getCompetitionHostLabel(competition, hostCountries)}
          </span>
          <div className="host-country-list">
            {hostCountries.map((country) => (
              <span className="host-country" key={country.name}>
                <img
                  alt=""
                  className="host-country-flag"
                  loading="lazy"
                  src={country.flagUrl}
                />
                <span>{country.name}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {highlights.competitionFinished && highlights.champion ? (
        <section className="page-section">
          <CompetitionFinishedBanner
            champion={highlights.champion}
            href={`/competitions/${competition.slug}/classement`}
          />
        </section>
      ) : null}

      <section className="page-section">
        <div className="competition-actions-grid">
          <CompetitionActionCard
            description="Saisir ou modifier mes scores"
            href={`/competitions/${competition.slug}/pronos`}
            icon={<PencilLine aria-hidden="true" size={20} strokeWidth={2.8} />}
            title="Pronostiquer"
            tone="pitch"
            urgentLabel={
              competition.urgentPendingPredictionCount > 0
                ? urgentPredictionLabel
                : undefined
            }
          />
          <CompetitionActionCard
            description="Voir les points"
            href={`/competitions/${competition.slug}/classement`}
            icon={<Trophy aria-hidden="true" size={20} strokeWidth={2.8} />}
            title="Classement"
            tone="coral"
          />
          <CompetitionActionCard
            description="Comparer les scores"
            href={`/competitions/${competition.slug}/tous-les-pronos`}
            icon={<UsersRound aria-hidden="true" size={20} strokeWidth={2.8} />}
            title="Pronos des potos"
            tone="navy"
          />
          {competition.bonusEnabled ? (
            <CompetitionActionCard
              description="Voir les pronos bonus des potos"
              href={`/competitions/${competition.slug}/points-bonus`}
              icon={<Star aria-hidden="true" size={20} strokeWidth={2.8} />}
              title="Points bonus"
              tone="bonus"
            />
          ) : null}
          <CompetitionActionCard
            description="Voir les matchs et horaires"
            href={`/competitions/${competition.slug}/calendrier`}
            icon={<CalendarDays aria-hidden="true" size={20} strokeWidth={2.8} />}
            title="Calendrier des matchs"
            tone="card"
          />
        </div>
      </section>

      {highlights.competitionFinished ? null : (
        <section className="page-section">
          <CompetitionHighlights highlights={highlights} slug={competition.slug} />
        </section>
      )}
    </main>
  );
}
