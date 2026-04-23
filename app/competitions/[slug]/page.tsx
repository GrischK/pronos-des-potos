import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/AutoRefresh";
import { CompetitionGroups } from "@/components/competitions/CompetitionGroups";
import { CompetitionHighlights } from "@/components/competitions/CompetitionHighlights";
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

  return (
    <main className="page-shell">
      <AutoRefresh intervalMs={60000} />
      <PageHeader
        eyebrow={getCompetitionKindLabel(competition.kind)}
        emblemUrl={competition.emblemUrl}
        title={competition.name}
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
        <div className="content-grid">
          <Link
            className="card action-card"
            href={`/competitions/${competition.slug}/pronos`}
          >
            <h2>Mes pronos</h2>
            <p>Saisir ou modifier les scores avant verrouillage.</p>
          </Link>
          <Link
            className="card action-card"
            href={`/competitions/${competition.slug}/classement`}
          >
            <h2>Classement</h2>
            <p>Voir les points et le vainqueur de la compétition.</p>
          </Link>
          <Link
            className="card action-card"
            href={`/competitions/${competition.slug}/tous-les-pronos`}
          >
            <h2>Tous les pronos</h2>
            <p>Comparer les choix des potos une fois les matchs verrouillés.</p>
          </Link>
        </div>
      </section>

      <section className="page-section">
        <CompetitionHighlights highlights={highlights} />
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
