import Link from "next/link";

import type {
  CompetitionHighlightMatch,
  CompetitionHighlightsData,
} from "@/src/server/competition-highlights";
import { getCompetitionStageLabel } from "@/src/domain/competition-stage";
import { ArrowRight } from "lucide-react";
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

function renderScore(homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) {
    return "- · -";
  }

  return `${homeScore} · ${awayScore}`;
}

function renderStatus(status: string, liveMinute: number | null) {
  if (status !== "LIVE") {
    return <span className="match-status">{getMatchStatusLabel(status)}</span>;
  }

  return (
    <span className="match-status match-live-status">
      <span>{getMatchStatusLabel(status)}</span>
      <span className="live-minute">{getLiveMatchStatusLabel(liveMinute)}</span>
    </span>
  );
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
          {renderScore(match.homeScore, match.awayScore)}
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
        <strong>
          {match.ownPrediction
            ? `${match.ownPrediction.homeScore} · ${match.ownPrediction.awayScore}`
            : "Aucun prono"}
        </strong>
      </div>

      {match.canRevealPredictions ? (
        <div className="public-predictions">
          {match.predictions.length === 0 ? (
            <p>Aucun prono enregistré pour ce match.</p>
          ) : (
            match.predictions.map((prediction) => (
              <div className="public-prediction-row" key={prediction.id}>
                <strong>{prediction.user.name}</strong>
                <span>
                  {prediction.homeScore} · {prediction.awayScore}
                </span>
              </div>
            ))
          )}
        </div>
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
  ctaLabel?: string;
}) {
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
                aria-label={`${ctaLabel ?? "Ouvrir"} ${getTeamName(match, "home")} contre ${getTeamName(match, "away")}`}
                className="highlight-match-card highlight-match-card-link"
                href={hrefBuilder(match)}
                key={match.id}
              >
                <MatchCard match={match} />
                <div className="flex gap-2 py-2">
                  <span className="highlight-match-card-cta">{ctaLabel}</span>
                  <span className="competition-card-title-cta" aria-hidden="true">
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

export function CompetitionHighlights({
                                        highlights,
                                        slug,
                                      }: CompetitionHighlightsProps) {
  return (
    <div className="competition-highlights">
      <HighlightSection
        emptyText="Aucun match aujourd'hui."
        ctaLabel="Voir le classement live"
        hrefBuilder={slug ? () => `/competitions/${slug}/classement?mode=live` : undefined}
        matches={highlights.todayMatches}
        title="Matchs du jour"
      />
      <HighlightSection
        emptyText="Aucun prochain match programmé."
        ctaLabel="Aller au prono"
        hrefBuilder={slug ? (match) => `/competitions/${slug}/pronos#match-${match.id}` : undefined}
        matches={highlights.nextMatches}
        title={highlights.nextTitle ?? "Prochains matchs"}
      />
    </div>
  );
}
