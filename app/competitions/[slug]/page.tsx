import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  PencilLine,
  Trophy,
  UsersRound,
} from "lucide-react";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/AutoRefresh";
import { CompetitionHighlights } from "@/components/competitions/CompetitionHighlights";
import { UrgentPredictionBadge } from "@/components/competitions/UrgentPredictionBadge";
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

      <section className="page-section">
        <div className="competition-actions-grid">
          <Link
            className="competition-action competition-action-primary"
            href={`/competitions/${competition.slug}/pronos`}
          >
            {competition.urgentPendingPredictionCount > 0 ? (
              <UrgentPredictionBadge label={urgentPredictionLabel} />
            ) : null}
            <span className="competition-action-icon">
              <PencilLine aria-hidden="true" size={20} strokeWidth={2.8} />
            </span>
            <span>
              <strong>Pronostiquer</strong>
              <small>Saisir ou modifier mes scores</small>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="competition-action-arrow"
              size={20}
              strokeWidth={3}
            />
          </Link>
          <Link
            className="competition-action"
            href={`/competitions/${competition.slug}/classement`}
          >
            <span className="competition-action-icon">
              <Trophy aria-hidden="true" size={20} strokeWidth={2.8} />
            </span>
            <span>
              <strong>Classement</strong>
              <small>Voir les points</small>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="competition-action-arrow"
              size={20}
              strokeWidth={3}
            />
          </Link>
          <Link
            className="competition-action"
            href={`/competitions/${competition.slug}/tous-les-pronos`}
          >
            <span className="competition-action-icon">
              <UsersRound aria-hidden="true" size={20} strokeWidth={2.8} />
            </span>
            <span>
              <strong>Pronos des potos</strong>
              <small>Comparer les scores</small>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="competition-action-arrow"
              size={20}
              strokeWidth={3}
            />
          </Link>
          <Link
            className="competition-action"
            href={`/competitions/${competition.slug}/calendrier`}
          >
            <span className="competition-action-icon">
              <CalendarDays aria-hidden="true" size={20} strokeWidth={2.8} />
            </span>
            <span>
              <strong>Calendrier des matchs</strong>
              <small>Voir les matchs et horaires</small>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="competition-action-arrow"
              size={20}
              strokeWidth={3}
            />
          </Link>
        </div>
      </section>

      <section className="page-section">
        <CompetitionHighlights highlights={highlights} slug={competition.slug} />
      </section>
    </main>
  );
}
