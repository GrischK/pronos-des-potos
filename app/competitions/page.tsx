import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import {
  getCompetitionsOverview,
  getNextPredictionOpportunity,
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

const kindLabels = {
  WORLD_CUP: "Coupe du monde",
  EURO: "Euro",
  CHAMPIONS_LEAGUE: "Champions League",
  OTHER: "Autre",
} as const;

const competitionCardKindClasses = {
  WORLD_CUP: "competition-card--world-cup",
  EURO: "competition-card--euro",
  CHAMPIONS_LEAGUE: "competition-card--champions-league",
  OTHER: "competition-card--other",
} as const;

const kickoffFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

type MatchPreview = {
  homeTeam: {
    name: string;
  } | null;
  awayTeam: {
    name: string;
  } | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
};

function getTeamName(match: MatchPreview, side: "home" | "away") {
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
                className={`card competition-card ${competitionCardKindClasses[competition.kind]}`}
                href={`/competitions/${competition.slug}`}
                key={competition.id}
              >
                <div className="competition-card-badges">
                  <p className={statusBadgeClasses[competition.status]}>
                    {statusLabels[competition.status]}
                  </p>
                  <p className="badge competition-kind-badge">
                    {kindLabels[competition.kind]}
                  </p>
                </div>
                <div className="competition-card-title">
                  {competition.emblemUrl ? (
                    <img
                      alt=""
                      className="competition-emblem"
                      loading="lazy"
                      src={competition.emblemUrl}
                    />
                  ) : null}
                  <h2>{competition.name}</h2>
                </div>
                <div className="competition-card-summary">
                  <span>
                    <strong>{competition.matchCount}</strong>
                    Matchs
                  </span>
                  <span>
                    <strong>{competition.playerCount}</strong>
                    Participants
                  </span>
                </div>

                <div className="competition-card-next">
                  <span>Prochain match</span>
                  <strong>
                    {competition.nextMatch
                      ? `${getTeamName(competition.nextMatch, "home")} - ${getTeamName(
                          competition.nextMatch,
                          "away",
                        )}`
                      : "Aucun match à venir"}
                  </strong>
                  {competition.nextMatch ? (
                    <small>{formatKickoffAt(competition.nextMatch.kickoffAt)}</small>
                  ) : null}
                </div>

                <div className="competition-card-stats">
                  <span>
                    <strong>{competition.remainingMatchCount}</strong>
                    Restants
                  </span>
                  <span>
                    <strong>{competition.missingPredictionCount}</strong>
                    À poser
                  </span>
                  <span>
                    <strong>
                      {competition.leader
                        ? `${competition.leader.points} pts`
                        : "-"}
                    </strong>
                    {competition.leader?.name ?? "Leader"}
                  </span>
                </div>
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
