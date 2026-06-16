import Link from "next/link";
import { ArrowRight, Shirt } from "lucide-react";

import { AutoRefresh } from "@/components/AutoRefresh";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import {
  getPlayerPointsToneClass,
  PlayerPointsBadge,
} from "@/components/player/PlayerPointsBadge";
import { UrgentPredictionBadge } from "@/components/competitions/UrgentPredictionBadge";
import { competitionKindLabels } from "@/src/domain/competition-kind";
import { formatMatchScoreText } from "@/src/domain/scoring";
import { getLiveMatchStatusLabel, getMatchStatusLabel } from "@/src/domain/match-status";
import {
  getCompetitionsOverview,
  getNextPredictionOpportunity,
  getUrgentPendingPredictionCount,
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
    flagUrl?: string | null;
  } | null;
  awayTeam: {
    name: string;
    flagUrl?: string | null;
  } | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
};

type LiveMatchPreview = MatchPreview & {
  liveMinute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  regularHomeScore: number | null;
  regularAwayScore: number | null;
  extraTimeHomeScore?: number | null;
  extraTimeAwayScore?: number | null;
  penaltyHomeScore?: number | null;
  penaltyAwayScore?: number | null;
  ownPrediction: {
    homeScore: number;
    awayScore: number;
    points: number | null;
  } | null;
};

function getTeamName(match: MatchPreview, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const placeholder =
    side === "home" ? match.homePlaceholder : match.awayPlaceholder;

  return team?.name ?? placeholder ?? "À déterminer";
}

function getTeamFlag(match: MatchPreview, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;

  return team?.flagUrl ?? null;
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

function renderOwnPrediction(match: LiveMatchPreview | null) {
  if (!match?.ownPrediction) {
    return <strong>Aucun prono</strong>;
  }

  return (
    <div className="public-prediction-meta">
      <strong
        className={`public-prediction-score${
          match.ownPrediction.points !== null
            ? ` public-prediction-score--toned ${getPlayerPointsToneClass(match.ownPrediction.points)}`
            : ""
        }`}
      >
        {match.ownPrediction.homeScore} · {match.ownPrediction.awayScore}
      </strong>
      {match.ownPrediction.points !== null ? (
        <PlayerPointsBadge
          className="public-prediction-points"
          label="Pts"
          points={match.ownPrediction.points}
        />
      ) : null}
    </div>
  );
}

function renderLiveIndicator(liveMinute: number | null) {
  return liveMinute !== null ? getLiveMatchStatusLabel(liveMinute) : null;
}

function MatchTeamsInline({ match }: { match: MatchPreview }) {
  return (
    <div className="competition-card-matchup">
      <span className="competition-card-team">
        {getTeamFlag(match, "home") ? (
          <img
            alt=""
            className="team-flag"
            loading="lazy"
            src={getTeamFlag(match, "home") ?? undefined}
          />
        ) : null}
        <span>{getTeamName(match, "home")}</span>
      </span>
      <span className="competition-card-match-separator">-</span>
      <span className="competition-card-team competition-card-team-away">
        <span>{getTeamName(match, "away")}</span>
        {getTeamFlag(match, "away") ? (
          <img
            alt=""
            className="team-flag"
            loading="lazy"
            src={getTeamFlag(match, "away") ?? undefined}
          />
        ) : null}
      </span>
    </div>
  );
}

export default async function CompetitionsPage() {
  const [competitions, nextPrediction, urgentPendingPredictionCount] = await Promise.all([
    getCompetitionsOverview(),
    getNextPredictionOpportunity(),
    getUrgentPendingPredictionCount(),
  ]);
  const urgentPredictionLabel =
    urgentPendingPredictionCount === 1
      ? "1 prono urgent à poser dans les 7 prochains jours"
      : `${urgentPendingPredictionCount} pronos urgents à poser dans les 7 prochains jours`;

  return (
    <main className="page-shell">
      <AutoRefresh intervalMs={30000} />
      <PageHeader
         className="competitions-page-header"
        eyebrow="Compétitions"
        title="Choisis ta compét'"
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
                <div className="competition-card-title">
                  {competition.emblemUrl ? (
                    <img
                      alt=""
                      className="competition-emblem competition-card-emblem"
                      loading="lazy"
                      src={competition.emblemUrl}
                    />
                  ) : null}
                  <div className="competition-card-heading">
                    <h2>{competition.name}</h2>
                    <span className="competition-card-title-cta" aria-hidden="true">
                      <ArrowRight size={18} strokeWidth={2.6} />
                    </span>
                  </div>
                  <span className="competition-card-ticket" aria-hidden="true">
                    <Shirt
                      aria-hidden="true"
                      fill="currentColor"
                      size={30}
                      stroke="none"
                    />
                  </span>
                </div>
                <div className="competition-card-badges">
                  <p className="badge competition-kind-badge">
                    {competitionKindLabels[competition.kind]}
                  </p>
                  <p
                    className={
                      competition.isEffectivelyFinished
                        ? statusBadgeClasses.FINISHED
                        : statusBadgeClasses[competition.status]
                    }
                  >
                    {competition.isEffectivelyFinished
                      ? statusLabels.FINISHED
                      : statusLabels[competition.status]}
                  </p>
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

                {competition.liveMatch ? (
                  <div className="competition-card-live">
                    <span>
                      {competition.liveMatchCount > 1
                        ? `${competition.liveMatchCount} matchs en cours`
                        : "Match en cours"}
                    </span>
                    <strong>
                      <MatchTeamsInline match={competition.liveMatch} />
                    </strong>
                    <div className="competition-card-live-scoreline">
                      <span className="match-score">
                        {formatMatchScoreText(competition.liveMatch)}
                      </span>
                      <span className="match-status match-live-status">
                        <span>{getMatchStatusLabel("LIVE")}</span>
                        {renderLiveIndicator(competition.liveMatch.liveMinute) ? (
                          <span className="live-minute">
                            {renderLiveIndicator(competition.liveMatch.liveMinute)}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="highlight-prono-line competition-card-own-prediction">
                      <span>Ton prono</span>
                      {renderOwnPrediction(competition.liveMatch)}
                    </div>
                  </div>
                ) : null}

                <div
                  className={
                    competition.isEffectivelyFinished
                      ? "competition-card-next competition-card-next--finished"
                      : "competition-card-next"
                  }
                >
                  <span>
                    {competition.isEffectivelyFinished
                      ? "Statut"
                      : "Prochain match"}
                  </span>
                  {competition.isEffectivelyFinished ? (
                    <strong>Compétition terminée</strong>
                  ) : competition.nextMatch ? (
                    <strong>
                      <MatchTeamsInline match={competition.nextMatch} />
                    </strong>
                  ) : (
                    <strong>Aucun match à venir</strong>
                  )}
                  {competition.nextMatch && !competition.isEffectivelyFinished ? (
                    <small>{formatKickoffAt(competition.nextMatch.kickoffAt)}</small>
                  ) : null}
                </div>

                <div className="competition-card-stats">
                  <span className="competition-card-stat">
                    <strong>{competition.remainingMatchCount}</strong>
                    Matchs restants
                  </span>
                  <span className="competition-card-stat competition-card-stat-pending">
                    {competition.urgentPendingPredictionCount > 0 ? (
                      <UrgentPredictionBadge
                        className="competition-card-stat-alert-wrap"
                        label={
                          competition.urgentPendingPredictionCount === 1
                            ? "1 prono urgent à poser dans les 7 prochains jours"
                            : `${competition.urgentPendingPredictionCount} pronos urgents à poser dans les 7 prochains jours`
                        }
                      />
                    ) : null}
                    <strong>{competition.missingPredictionCount}</strong>
                    Pronos à poser
                  </span>
                  <span className="competition-card-stat competition-card-stat--leader">
                    <strong className="competition-card-stat-leader">
                      {competition.leader
                        ? (
                          <>
                            <span className="competition-card-stat-leader-name">
                              {competition.leader.name}
                            </span>
                            <span className="competition-card-stat-leader-points">
                              {competition.leader.points} pts
                            </span>
                          </>
                        )
                        : "-"}
                    </strong>
                    Leader
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
            {urgentPendingPredictionCount > 0 ? (
              <UrgentPredictionBadge
                className="next-prediction-alert-wrap"
                label={urgentPredictionLabel}
              />
            ) : null}
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
