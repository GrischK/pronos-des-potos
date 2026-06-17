"use client";

import { ChevronDown } from "lucide-react";

import { PlayerPointsBadge } from "@/components/player/PlayerPointsBadge";
import { getCompetitionStageLabel } from "@/src/domain/competition-stage";
import { formatMatchScoreText } from "@/src/domain/scoring";
import { getLiveMatchStatusLabel, getMatchStatusLabel } from "@/src/domain/match-status";
import type { LeaderboardData, LeaderboardLiveMatch } from "@/src/server/leaderboard";

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

function getTeamName(match: LeaderboardLiveMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;

  return team?.name ?? placeholder ?? "À déterminer";
}

function getTeamFlag(match: LeaderboardLiveMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;

  return team?.flagUrl ?? null;
}

function renderStatus(status: string, liveMinute: number | null) {
  if (status !== "LIVE") {
    return getMatchStatusLabel(status);
  }

  return (
    <>
      <span>{getMatchStatusLabel(status)}</span>
      {liveMinute !== null ? (
        <span className="live-minute">{getLiveMatchStatusLabel(liveMinute)}</span>
      ) : null}
    </>
  );
}

export function LeaderboardLiveMatchesPanel({
  matches,
  title = "Les scores live qui alimentent le classement provisoire.",
}: {
  matches: LeaderboardData["liveMatches"];
  title?: string;
}) {
  if (matches.length === 0) {
    return null;
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="badge badge-warning">En direct</p>
        </div>
        <p>{title}</p>
      </div>

      <div className="match-list">
        {matches.map((match) => (
          <article className="match-row" key={match.id}>
            <div className="match-meta">
              <span>{formatKickoffAt(match.kickoffAt)}</span>
              <span>{getCompetitionStageLabel(match.stage)}</span>
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

            <span className="match-status match-live-status">
              {renderStatus(match.status, match.liveMinute)}
            </span>

            <details className="live-match-predictions-panel">
              <summary>
                <span>
                  <span className="badge badge-warning">Pronos</span>
                  <strong>
                    {match.predictions.length} participant
                    {match.predictions.length > 1 ? "s" : ""}
                  </strong>
                </span>
                <span aria-hidden="true" className="pending-predictions-summary-action">
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
          </article>
        ))}
      </div>
    </section>
  );
}
