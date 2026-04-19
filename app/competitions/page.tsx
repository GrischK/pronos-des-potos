import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import {
  getCompetitionsOverview,
  getNextPredictionOpportunity,
  type NextPredictionOpportunity,
} from "@/src/server/competitions";

export const dynamic = "force-dynamic";

const statusLabels = {
  DRAFT: "Fermée",
  OPEN: "Ouverte",
  LIVE: "En cours",
  FINISHED: "Terminée",
  ARCHIVED: "Archivée",
} as const;

const statusBadgeClasses = {
  DRAFT: "badge badge-warning",
  OPEN: "badge badge-live",
  LIVE: "badge badge-live",
  FINISHED: "badge badge-warning",
  ARCHIVED: "badge badge-warning",
} as const;

const kickoffFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

function getTeamName(
  match: NextPredictionOpportunity,
  side: "home" | "away",
) {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const placeholder =
    side === "home" ? match.homePlaceholder : match.awayPlaceholder;

  return team?.name ?? placeholder ?? "À déterminer";
}

function formatKickoffAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date à confirmer";
  }

  return kickoffFormatter.format(date);
}

function formatKickoffCountdown(value: string) {
  const kickoffAt = new Date(value).getTime();

  if (Number.isNaN(kickoffAt)) {
    return "Fermeture à confirmer";
  }

  const minutes = Math.max(0, Math.round((kickoffAt - Date.now()) / 60000));

  if (minutes === 0) {
    return "Dernières minutes avant fermeture";
  }

  if (minutes < 60) {
    return `Plus que ${minutes} min avant fermeture`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 48) {
    return `Plus que ${hours} h avant fermeture`;
  }

  const days = Math.round(hours / 24);

  return `Plus que ${days} j avant fermeture`;
}

export default async function CompetitionsPage() {
  const [competitions, nextPrediction] = await Promise.all([
    getCompetitionsOverview(),
    getNextPredictionOpportunity(),
  ]);

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Compétitions"
        title="À toi de jouer."
        description="Retrouve tes tournois, pose tes prochains pronos et surveille les classements quand les scores tombent."
      />

      <section className="page-section">
        {competitions.length === 0 ? (
          <EmptyState
            title="Aucune compétition pour l'instant"
            text="La première compétition sera créée depuis l'administration."
            action={
              <Link className="btn btn-primary" href="/admin">
                Préparer une compétition
              </Link>
            }
          />
        ) : (
          <div className="content-grid">
            {competitions.map((competition) => (
              <Link
                className="card competition-card"
                href={`/competitions/${competition.slug}`}
                key={competition.id}
              >
                <p className={statusBadgeClasses[competition.status]}>
                  {statusLabels[competition.status]}
                </p>
                <h2>{competition.name}</h2>
                <p>
                  {competition.matchCount} matchs, {competition.playerCount}{" "}
                  participants
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {nextPrediction ? (
        <section className="page-section">
          <div className="next-prediction-panel">
            <div>
              <p className="badge badge-live">Prochain prono à poser</p>
              <h2>
                {getTeamName(nextPrediction, "home")} -{" "}
                {getTeamName(nextPrediction, "away")}
              </h2>
              <p>
                {nextPrediction.competition.name} ·{" "}
                {formatKickoffAt(nextPrediction.kickoffAt)}
              </p>
            </div>
            <div className="next-prediction-action">
              <strong>{formatKickoffCountdown(nextPrediction.kickoffAt)}</strong>
              <Link
                className="btn btn-primary"
                href={`/competitions/${nextPrediction.competition.slug}/pronos`}
              >
                Faire mon prono
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
