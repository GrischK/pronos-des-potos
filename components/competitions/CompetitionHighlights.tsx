"use client";

import Link from "next/link";
import type { SyntheticEvent } from "react";

import { PlayerPointsBadge } from "@/components/player/PlayerPointsBadge";
import type {
  CompetitionHighlightMatch,
  CompetitionHighlightsData,
} from "@/src/server/competition-highlights";
import { getCompetitionStageLabel } from "@/src/domain/competition-stage";
import { formatMatchScoreText } from "@/src/domain/scoring";
import { ArrowRight, ChevronDown } from "lucide-react";
import { getLiveMatchStatusLabel, getMatchStatusLabel } from "@/src/domain/match-status";

type CompetitionHighlightsProps = {
  highlights: CompetitionHighlightsData;
  slug?: string;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

function formatKickoffAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date à confirmer";
  }

  return dateFormatter.format(date);
}

function getTeamName(match: CompetitionHighlightMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;

  return team?.name ?? placeholder ?? "À déterminer";
}

function getTeamFlag(match: CompetitionHighlightMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;

  return team?.flagUrl ?? null;
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

function ChampionAvatar({
  image,
  name,
}: {
  image: string | null;
  name: string;
}) {
  return (
    <span className="leaderboard-player-avatar competition-finished-avatar">
      {image ? <img alt="" loading="lazy" src={image} /> : getInitial(name)}
    </span>
  );
}

function renderStatus(status: string, liveMinute: number | null) {
  if (status !== "LIVE") {
    return <span className="match-status">{getMatchStatusLabel(status)}</span>;
  }

  return (
    <span className="match-status match-live-status">
      <span>{getMatchStatusLabel(status)}</span>
      {liveMinute !== null ? <span className="live-minute">{getLiveMatchStatusLabel(liveMinute)}</span> : null}
    </span>
  );
}

function stopCardNavigation(event: SyntheticEvent) {
  event.stopPropagation();
}

function MatchCard({ match }: { match: CompetitionHighlightMatch }) {
  return (
    <>
      <div className="match-meta">
        <span>{formatKickoffAt(match.kickoffAt)}</span>
        <span>{getCompetitionStageLabel(match.stage)}</span>
        {renderStatus(match.status, match.liveMinute)}
      </div>

      <div className="match-teams">
        <span className="match-team">
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

        <span className="match-score">
          {formatMatchScoreText(match)}
        </span>

        <span className="match-team match-team-away">
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

      <div className="highlight-prono-line">
        <span>Ton prono</span>
        {match.ownPrediction ? (
          <div className="public-prediction-meta">
            <strong className="public-prediction-score">
              {match.ownPrediction.homeScore} · {match.ownPrediction.awayScore}
            </strong>
            {match.ownPrediction.points !== null ? (
              <PlayerPointsBadge
                points={match.ownPrediction.points}
                label="Pts"
                className="public-prediction-points"
              />
            ) : null}
          </div>
        ) : (
          <strong>Aucun prono</strong>
        )}
      </div>

      {match.canRevealPredictions ? (
        <details
          className="live-match-predictions-panel"
          onClick={stopCardNavigation}
        >
          <summary onClick={stopCardNavigation}>
            <span>
              <span className="badge badge-warning">Pronos</span>
              <strong>
                {match.predictions.length} participant
                {match.predictions.length > 1 ? "s" : ""}
              </strong>
            </span>
            <span
              aria-hidden="true"
              className="pending-predictions-summary-action"
            >
              <ChevronDown size={18} strokeWidth={3} />
            </span>
          </summary>

          <div className="public-predictions">
            {match.predictions.length === 0 ? (
              <p>Aucun prono enregistré pour ce match.</p>
            ) : (
              match.predictions.map((prediction) => (
                <div className="public-prediction-row" key={prediction.id}>
                  <strong>{prediction.user.name}</strong>
                  <div className="public-prediction-meta">
                    {prediction.points !== null ? (
                      <PlayerPointsBadge
                        points={prediction.points}
                        label="Pts"
                        className="public-prediction-points"
                      />
                    ) : null}
                    <span className="public-prediction-score">
                      {prediction.homeScore} · {prediction.awayScore}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </details>
      ) : null}
    </>
  );
}

function HighlightSection({
                            emptyText,
                            hrefBuilder,
                            matches,
                            title,
                            ctaLabel,
                          }: {
  emptyText: string;
  hrefBuilder?: (match: CompetitionHighlightMatch) => string;
  matches: CompetitionHighlightMatch[];
  title: string;
  ctaLabel?: string | ((match: CompetitionHighlightMatch) => string);
}) {
  function getCtaLabel(match: CompetitionHighlightMatch) {
    return typeof ctaLabel === "function" ? ctaLabel(match) : ctaLabel ?? "Ouvrir";
  }

  return (
    <section className="highlight-panel">
      <div className="section-heading">
        <div>
          <h2 className="badge badge-live">{title}</h2>
        </div>
      </div>

      {matches.length === 0 ? (
        <p className="readonly-notice">{emptyText}</p>
      ) : (
        <div className="highlight-match-list">
          {matches.map((match) => (
            hrefBuilder ? (
              <Link
                aria-label={`${getCtaLabel(match)} ${getTeamName(match, "home")} contre ${getTeamName(match, "away")}`}
                className="highlight-match-card highlight-match-card-link"
                href={hrefBuilder(match)}
                key={match.id}
              >
                <MatchCard match={match} />
                <div className="flex gap-2 py-2">
                  <span className="highlight-match-card-cta">{getCtaLabel(match)}</span>
                  <span className="highlight-match-card-cta-icon" aria-hidden="true">
                    <ArrowRight size={18} strokeWidth={2.6} />
                  </span>
                </div>
              </Link>
            ) : (
              <article className="highlight-match-card" key={match.id}>
                <MatchCard match={match} />
              </article>
            )
          ))}
        </div>
      )}
    </section>
  );
}

export function CompetitionFinishedBanner({
  champion,
  href,
}: {
  champion: NonNullable<CompetitionHighlightsData["champion"]>;
  href: string;
}) {
  return (
    <section className="competition-finished-banner">
      <div className="pending-predictions-panel competition-finished-panel">
        <div className="competition-finished-panel-head">
          <span className="badge badge-warning">Compétition terminée</span>
          <strong>Champion des pronos</strong>
        </div>
        <div className="competition-finished-panel-body">
          <ChampionAvatar image={champion.image} name={champion.name} />
          <div className="pending-predictions-panel-done">
            <strong>{champion.name}</strong>
            <span>
              Vainqueur avec {champion.points} point
              {champion.points > 1 ? "s" : ""}.
            </span>
            <Link className="competition-finished-panel-link" href={href}>
              <span>Voir le classement</span>
              <span aria-hidden="true" className="competition-finished-panel-link-icon">
                <ArrowRight size={18} strokeWidth={2.6} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CompetitionHighlights({
                                        highlights,
                                        slug,
                                      }: CompetitionHighlightsProps) {
  return (
    <div className="competition-highlights">
      {!highlights.competitionFinished ? (
        <>
          <HighlightSection
            emptyText="Aucun match aujourd'hui."
            ctaLabel={(match) =>
              match.status === "LIVE" || match.status === "FINISHED"
                ? "Voir le classement"
                : "Aller au prono"
            }
            hrefBuilder={
              slug
                ? (match) =>
                    match.status === "LIVE" || match.status === "FINISHED"
                      ? `/competitions/${slug}/classement?mode=live`
                      : `/competitions/${slug}/pronos?match=${match.id}#match-${match.id}`
                : undefined
            }
            matches={highlights.todayMatches}
            title="Matchs du jour"
          />
          <HighlightSection
            emptyText="Aucun prochain match programmé."
            ctaLabel="Aller au prono"
            hrefBuilder={
              slug
                ? (match) => `/competitions/${slug}/pronos?match=${match.id}#match-${match.id}`
                : undefined
            }
            matches={highlights.nextMatches}
            title={highlights.nextTitle ?? "Prochains matchs"}
          />
        </>
      ) : null}
    </div>
  );
}
